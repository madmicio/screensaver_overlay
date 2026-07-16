"""Screensaver Overlay integration."""

from __future__ import annotations

from dataclasses import dataclass
from functools import partial
import logging
import math
from pathlib import Path
from urllib.parse import urlsplit

from aiohttp import ClientError, ClientTimeout
from homeassistant.components import frontend, panel_custom
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

try:
    from homeassistant.components.http import StaticPathConfig
except ImportError:
    StaticPathConfig = None

from .const import (
    BRIGHTNESS_MODE_COMPANION,
    BRIGHTNESS_MODE_DISABLED,
    BRIGHTNESS_MODE_FULLY,
    BRIGHTNESS_MODES,
    BRIGHTNESS_STRATEGIES,
    BRIGHTNESS_STRATEGY_FIXED,
    BRIGHTNESS_STRATEGY_LOGARITHMIC,
    BRIGHTNESS_STRATEGY_PERCENTAGE,
    BRIGHTNESS_WAKE_REAPPLY_DELAY,
    BRIGHTNESS_WAKE_REAPPLY_INTERVAL,
    BRIGHTNESS_WAKE_REAPPLY_MAX_ATTEMPTS,
    CONF_BRIGHTNESS_MODE,
    CONF_BRIGHTNESS_LOGARITHMIC_MIN_VALUE,
    CONF_BRIGHTNESS_REDUCTION_PERCENTAGE,
    CONF_BRIGHTNESS_SCREEN_VALUE,
    CONF_BRIGHTNESS_SCREENSAVER_VALUE,
    CONF_BRIGHTNESS_STRATEGY,
    CONF_COMPANION_BRIGHTNESS_SENSOR,
    CONF_COMPANION_NOTIFY_SERVICE,
    CONF_FULLY_HOST,
    CONF_FULLY_PASSWORD,
    CONF_FULLY_PORT,
    CONF_FULLY_USE_HTTPS,
    CONF_MOTION_SENSOR,
    CONF_RESTORE_AUTO_BRIGHTNESS,
    CONF_SCREEN_OFF_TIMEOUT,
    CONF_SCREEN_SWITCH,
    DEFAULT_BRIGHTNESS_MODE,
    DEFAULT_BRIGHTNESS_LOGARITHMIC_MIN_VALUE,
    DEFAULT_BRIGHTNESS_REDUCTION_PERCENTAGE,
    DEFAULT_BRIGHTNESS_SCREEN_VALUE,
    DEFAULT_BRIGHTNESS_SCREENSAVER_VALUE,
    DEFAULT_BRIGHTNESS_STRATEGY,
    DEFAULT_FULLY_PORT,
    DEFAULT_FULLY_TIMEOUT,
    DEFAULT_FULLY_USE_HTTPS,
    DOMAIN,
    FRONTEND_URL,
    PANEL_ELEMENT,
    PANEL_PATH,
    PANEL_URL,
    STATIC_URL_PATH,
)
from .websocket_api import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)
FRONTEND_REGISTERED = "_frontend_registered"
PANEL_REGISTERED = "_panel_registered"
WEBSOCKET_REGISTERED = "_websocket_registered"
ENTITY_LIST_CONFIG_KEYS = ("calendars", "value_entities")
PLATFORMS = (Platform.BINARY_SENSOR,)
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


@callback
def _normalize_entity_list(value) -> list[str]:
    """Normalize entity-list config values."""
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        items = value.replace(",", "\n").splitlines()
    else:
        items = []

    normalized = []
    for item in items:
        if isinstance(item, dict):
            item = item.get("entity") or item.get("value")
        item = str(item or "").strip()
        if item:
            normalized.append(item)
    return normalized


@callback
def _normalize_status_icon_list(value) -> list[dict[str, str]]:
    """Normalize status icon entries while preserving optional icon overrides."""
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        items = value.replace(",", "\n").splitlines()
    else:
        items = []

    normalized = []
    for item in items:
        if isinstance(item, dict):
            entity = str(item.get("entity") or item.get("value") or "").strip()
            icon = str(item.get("icon") or "").strip()
        else:
            entity = str(item or "").strip()
            icon = ""
        if entity:
            entry = {"entity": entity}
            if icon:
                entry["icon"] = icon
            normalized.append(entry)
    return normalized


@dataclass(slots=True)
class BrightnessSnapshot:
    """Brightness values for one overlay cycle."""

    mode: str
    overlay_value: float
    restore_value: float | None = None


@dataclass(slots=True)
class ClientRuntimeState:
    """Runtime state for one browser client."""

    active: bool = False
    config: dict | None = None
    screen_off_unsub: CALLBACK_TYPE | None = None
    motion_unsub: CALLBACK_TYPE | None = None
    brightness_reapply_unsub: CALLBACK_TYPE | None = None
    brightness_reapply_attempts: int = 0
    active_brightness_snapshot: BrightnessSnapshot | None = None


class ScreensaverOverlayRuntime:
    """Runtime controller for screen switch and motion wake behavior."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize runtime controller."""
        self.hass = hass
        self.entry = entry
        self._client_states: dict[str, ClientRuntimeState] = {}
        self._state_listeners: list[CALLBACK_TYPE] = []

    @property
    def config(self) -> dict:
        """Return merged entry data and options."""
        config = {**self.entry.data, **self.entry.options}
        for key in ENTITY_LIST_CONFIG_KEYS:
            data_values = _normalize_entity_list(self.entry.data.get(key))
            option_values = _normalize_entity_list(self.entry.options.get(key))
            config[key] = option_values or data_values
        data_status_icons = _normalize_status_icon_list(
            self.entry.data.get("status_icon_entities")
        )
        option_status_icons = _normalize_status_icon_list(
            self.entry.options.get("status_icon_entities")
        )
        config["status_icon_entities"] = option_status_icons or data_status_icons
        return config

    def _state_for(self, client_id: str | None) -> ClientRuntimeState:
        """Return runtime state for a browser client."""
        key = str(client_id or "default").strip() or "default"
        if key not in self._client_states:
            self._client_states[key] = ClientRuntimeState()
        return self._client_states[key]

    @callback
    def is_overlay_active(self, client_id: str | None) -> bool:
        """Return whether the overlay is active for a browser client."""
        return self._state_for(client_id).active

    @callback
    def async_subscribe_state_changes(self, listener: CALLBACK_TYPE) -> CALLBACK_TYPE:
        """Subscribe to overlay runtime state changes."""
        self._state_listeners.append(listener)

        @callback
        def unsubscribe() -> None:
            if listener in self._state_listeners:
                self._state_listeners.remove(listener)

        return unsubscribe

    @callback
    def _async_notify_state_listeners(self) -> None:
        """Notify entities that expose overlay runtime state."""
        for listener in list(self._state_listeners):
            listener()

    def _screen_switch(self, config: dict) -> str | None:
        """Return configured screen switch."""
        return config.get(CONF_SCREEN_SWITCH)

    def _has_screen_control(self, config: dict) -> bool:
        """Return whether the config can turn the screen on/off."""
        return bool(self._screen_switch(config)) or self._has_fully_rest_config(config)

    def _companion_notify_service(self, config: dict) -> str | None:
        """Return configured Companion App notify service."""
        service = str(config.get(CONF_COMPANION_NOTIFY_SERVICE) or "").strip()
        if not service:
            return None
        return service if "." in service else f"notify.{service}"

    def _companion_brightness_sensor(self, config: dict) -> str | None:
        """Return configured Companion App brightness sensor."""
        return config.get(CONF_COMPANION_BRIGHTNESS_SENSOR)

    def _motion_sensor(self, config: dict) -> str | None:
        """Return configured motion sensor."""
        return config.get(CONF_MOTION_SENSOR)

    def _brightness_mode(self, config: dict) -> str:
        """Return configured brightness mode."""
        mode = config.get(CONF_BRIGHTNESS_MODE)
        if mode in BRIGHTNESS_MODES:
            return mode
        return DEFAULT_BRIGHTNESS_MODE

    def _brightness_strategy(self, config: dict) -> str:
        """Return configured brightness strategy."""
        strategy = config.get(CONF_BRIGHTNESS_STRATEGY)
        if strategy in BRIGHTNESS_STRATEGIES:
            return strategy
        return DEFAULT_BRIGHTNESS_STRATEGY

    def _brightness_reduction_percentage(self, config: dict) -> float:
        """Return configured overlay brightness reduction percentage."""
        try:
            value = float(
                config.get(
                    CONF_BRIGHTNESS_REDUCTION_PERCENTAGE,
                    DEFAULT_BRIGHTNESS_REDUCTION_PERCENTAGE,
                )
            )
        except (TypeError, ValueError):
            return DEFAULT_BRIGHTNESS_REDUCTION_PERCENTAGE
        return min(max(value, 0), 100)

    def _brightness_logarithmic_min_value(self, config: dict) -> float:
        """Return minimum target brightness for logarithmic reduction."""
        return self._clamp_brightness_value(
            config.get(
                CONF_BRIGHTNESS_LOGARITHMIC_MIN_VALUE,
                DEFAULT_BRIGHTNESS_LOGARITHMIC_MIN_VALUE,
            ),
            DEFAULT_BRIGHTNESS_LOGARITHMIC_MIN_VALUE,
        )

    def _brightness_screen_value(self, config: dict) -> float:
        """Return fixed dashboard brightness value."""
        return self._clamp_brightness_value(
            config.get(CONF_BRIGHTNESS_SCREEN_VALUE, DEFAULT_BRIGHTNESS_SCREEN_VALUE),
            DEFAULT_BRIGHTNESS_SCREEN_VALUE,
        )

    def _brightness_screensaver_value(self, config: dict) -> float:
        """Return fixed screensaver brightness value."""
        return self._clamp_brightness_value(
            config.get(
                CONF_BRIGHTNESS_SCREENSAVER_VALUE,
                DEFAULT_BRIGHTNESS_SCREENSAVER_VALUE,
            ),
            DEFAULT_BRIGHTNESS_SCREENSAVER_VALUE,
        )

    def _restore_auto_brightness(self, config: dict) -> bool:
        """Return whether automatic brightness should be restored after overlay."""
        return bool(config.get(CONF_RESTORE_AUTO_BRIGHTNESS))

    def _fully_host(self, config: dict) -> str | None:
        """Return configured Fully Kiosk host."""
        host = str(config.get(CONF_FULLY_HOST) or "").strip().rstrip("/")
        return host or None

    def _fully_port(self, config: dict) -> int:
        """Return configured Fully Kiosk Remote Admin port."""
        try:
            return int(config.get(CONF_FULLY_PORT) or DEFAULT_FULLY_PORT)
        except (TypeError, ValueError):
            return DEFAULT_FULLY_PORT

    def _fully_password(self, config: dict) -> str | None:
        """Return configured Fully Kiosk Remote Admin password."""
        password = str(config.get(CONF_FULLY_PASSWORD) or "").strip()
        return password or None

    def _fully_use_https(self, config: dict) -> bool:
        """Return whether Fully Kiosk REST should use HTTPS."""
        return bool(config.get(CONF_FULLY_USE_HTTPS, DEFAULT_FULLY_USE_HTTPS))

    def _has_fully_rest_config(self, config: dict) -> bool:
        """Return whether Fully Kiosk REST is configured enough for commands."""
        return bool(self._fully_host(config) and self._fully_password(config))

    def _screen_off_timeout(self, config: dict) -> int:
        """Return screen off timeout in seconds."""
        try:
            return int(config.get(CONF_SCREEN_OFF_TIMEOUT) or 0)
        except (TypeError, ValueError):
            return 0

    async def async_overlay_shown(
        self, client_id: str | None = None, config: dict | None = None
    ) -> None:
        """Handle overlay shown in frontend."""
        state = self._state_for(client_id)
        state.config = config or self.config
        if not state.active:
            self._cancel_overlay_brightness_reapply(state)
            await self._async_apply_overlay_brightness(state)
        else:
            await self._async_reapply_overlay_brightness(state)
            self._schedule_overlay_brightness_reapply(state)
        state.active = True
        self._async_notify_state_listeners()
        self._ensure_motion_listener(client_id, state)
        self._schedule_screen_off(client_id, state)

    async def async_overlay_hidden(
        self, client_id: str | None = None, config: dict | None = None
    ) -> None:
        """Handle overlay hidden in frontend."""
        state = self._state_for(client_id)
        if config is not None:
            state.config = config
        elif state.config is None:
            state.config = self.config
        state.active = False
        self._cancel_screen_off(state)
        self._remove_motion_listener(state)
        self._cancel_overlay_brightness_reapply(state)
        self._async_notify_state_listeners()
        await self._async_restore_screen_brightness(state)

    async def async_unload(self) -> None:
        """Unload runtime listeners and timers."""
        for state in list(self._client_states.values()):
            state.active = False
            self._cancel_screen_off(state)
            self._remove_motion_listener(state)
            self._cancel_overlay_brightness_reapply(state)
        self._async_notify_state_listeners()

    @callback
    def _cancel_screen_off(self, state: ClientRuntimeState) -> None:
        if state.screen_off_unsub is not None:
            state.screen_off_unsub()
            state.screen_off_unsub = None

    @callback
    def _schedule_screen_off(
        self, client_id: str | None, state: ClientRuntimeState
    ) -> None:
        self._cancel_screen_off(state)

        config = state.config or self.config
        screen_off_timeout = self._screen_off_timeout(config)

        if not state.active or not self._has_screen_control(config) or screen_off_timeout <= 0:
            return

        if not self._motion_allows_screen_off(config):
            return

        state.screen_off_unsub = async_call_later(
            self.hass,
            screen_off_timeout,
            partial(self._async_turn_screen_off, client_id),
        )

    async def _async_turn_screen_off(self, client_id: str | None, now) -> None:
        state = self._state_for(client_id)
        state.screen_off_unsub = None
        config = state.config or self.config
        if not state.active or not self._has_screen_control(config):
            return

        if not self._motion_allows_screen_off(config):
            return

        await self._async_set_screen_power(config, False)

    @callback
    def _ensure_motion_listener(
        self, client_id: str | None, state: ClientRuntimeState
    ) -> None:
        config = state.config or self.config
        motion_sensor = self._motion_sensor(config)
        if state.motion_unsub is not None or not motion_sensor:
            return

        state.motion_unsub = async_track_state_change_event(
            self.hass,
            [motion_sensor],
            partial(self._async_motion_changed, client_id),
        )

    @callback
    def _remove_motion_listener(self, state: ClientRuntimeState) -> None:
        if state.motion_unsub is not None:
            state.motion_unsub()
            state.motion_unsub = None

    @callback
    def _motion_allows_screen_off(self, config: dict) -> bool:
        """Return whether the motion sensor allows turning the screen off."""
        motion_sensor = self._motion_sensor(config)
        if not motion_sensor:
            return True

        state = self.hass.states.get(motion_sensor)
        return state is not None and state.state == "off"

    async def _async_apply_overlay_brightness(self, state: ClientRuntimeState) -> None:
        """Build a brightness snapshot and apply screensaver brightness."""
        config = state.config or self.config
        mode = self._brightness_mode(config)
        if mode == BRIGHTNESS_MODE_DISABLED:
            return

        snapshot = await self._async_build_brightness_snapshot(config, mode)
        if snapshot is None:
            return

        state.active_brightness_snapshot = snapshot

        if self._restore_auto_brightness(config) and mode == BRIGHTNESS_MODE_COMPANION:
            await self._async_set_companion_auto_brightness(config, False)

        await self._async_set_brightness_value(config, snapshot.mode, snapshot.overlay_value)

    async def _async_restore_screen_brightness(self, state: ClientRuntimeState) -> None:
        """Restore brightness or automatic brightness after the overlay hides."""
        config = state.config or self.config
        snapshot = state.active_brightness_snapshot
        state.active_brightness_snapshot = None
        if snapshot is None:
            return

        if (
            self._brightness_strategy(config) != BRIGHTNESS_STRATEGY_FIXED
            and self._restore_auto_brightness(config)
        ):
            await self._async_set_auto_brightness(config, snapshot.mode, True)
            return

        if snapshot.restore_value is not None:
            await self._async_set_brightness_value(
                config, snapshot.mode, snapshot.restore_value
            )

    async def _async_reapply_overlay_brightness(
        self, state: ClientRuntimeState
    ) -> None:
        """Reapply screensaver brightness without changing the restore snapshot."""
        if not state.active:
            return

        config = state.config or self.config
        snapshot = state.active_brightness_snapshot
        if snapshot is None:
            return

        if self._restore_auto_brightness(config) and snapshot.mode == BRIGHTNESS_MODE_COMPANION:
            await self._async_set_companion_auto_brightness(config, False)

        await self._async_set_brightness_value(
            config, snapshot.mode, snapshot.overlay_value
        )

    @callback
    def _cancel_overlay_brightness_reapply(
        self, state: ClientRuntimeState
    ) -> None:
        """Cancel delayed screensaver brightness reapply."""
        if state.brightness_reapply_unsub is not None:
            state.brightness_reapply_unsub()
            state.brightness_reapply_unsub = None
        state.brightness_reapply_attempts = 0

    @callback
    def _schedule_overlay_brightness_reapply(
        self, state: ClientRuntimeState
    ) -> None:
        """Schedule screensaver brightness reapply after screen wake."""
        self._cancel_overlay_brightness_reapply(state)
        self._schedule_next_overlay_brightness_reapply(
            state, BRIGHTNESS_WAKE_REAPPLY_DELAY
        )

    @callback
    def _schedule_next_overlay_brightness_reapply(
        self, state: ClientRuntimeState, delay: int
    ) -> None:
        """Schedule the next screensaver brightness reapply attempt."""
        state.brightness_reapply_unsub = async_call_later(
            self.hass,
            delay,
            partial(self._async_reapply_overlay_brightness_after_wake, state),
        )

    async def _async_reapply_overlay_brightness_after_wake(
        self, state: ClientRuntimeState, now
    ) -> None:
        """Reapply screensaver brightness after the display has had time to wake."""
        state.brightness_reapply_unsub = None
        await self._async_reapply_overlay_brightness(state)
        if not state.active:
            return
        state.brightness_reapply_attempts += 1
        if state.brightness_reapply_attempts < BRIGHTNESS_WAKE_REAPPLY_MAX_ATTEMPTS:
            self._schedule_next_overlay_brightness_reapply(
                state, BRIGHTNESS_WAKE_REAPPLY_INTERVAL
            )

    async def _async_build_brightness_snapshot(
        self, config: dict, mode: str
    ) -> BrightnessSnapshot | None:
        """Build brightness values for the current overlay cycle."""
        strategy = self._brightness_strategy(config)
        if strategy == BRIGHTNESS_STRATEGY_FIXED:
            return BrightnessSnapshot(
                mode=mode,
                overlay_value=self._brightness_screensaver_value(config),
                restore_value=self._brightness_screen_value(config),
            )

        current = await self._async_read_current_brightness(config, mode)
        if current is None:
            _LOGGER.warning("Unable to read current screen brightness for %s", mode)
            return None

        if strategy == BRIGHTNESS_STRATEGY_LOGARITHMIC:
            overlay_value = self._calculate_logarithmic_reduced_brightness(
                config, current
            )
        else:
            overlay_value = self._calculate_reduced_brightness(config, current)
        _LOGGER.debug(
            "Calculated overlay brightness from current=%s to target=%s",
            current,
            overlay_value,
        )
        return BrightnessSnapshot(
            mode=mode,
            overlay_value=overlay_value,
            restore_value=current,
        )

    @callback
    def _calculate_reduced_brightness(self, config: dict, current_value: float) -> float:
        """Calculate overlay brightness from current value and reduction percent."""
        multiplier = (100 - self._brightness_reduction_percentage(config)) / 100
        return self._clamp_brightness_value(current_value * multiplier)

    @callback
    def _calculate_logarithmic_reduced_brightness(
        self, config: dict, current_value: float
    ) -> float:
        """Calculate overlay brightness with stronger reduction at low values."""
        current_value = self._clamp_brightness_value(current_value)
        reduction = self._brightness_reduction_percentage(config) / 100
        normalized_log = math.log1p(current_value) / math.log1p(255)
        target = current_value * (1 - reduction) * normalized_log
        target = max(target, self._brightness_logarithmic_min_value(config))
        return self._clamp_brightness_value(target)

    async def _async_read_current_brightness(
        self, config: dict, mode: str
    ) -> float | None:
        """Read current brightness from the configured mode."""
        if mode == BRIGHTNESS_MODE_FULLY:
            return await self._async_read_fully_brightness(config)

        if mode == BRIGHTNESS_MODE_COMPANION:
            source = self._companion_brightness_sensor(config)
            if not source:
                return None
            return self._read_numeric_state(source)

        return None

    @callback
    def _read_numeric_state(self, entity_id: str) -> float | None:
        """Read a numeric state value."""
        state = self.hass.states.get(entity_id)
        if state is None or state.state in {"unknown", "unavailable"}:
            return None
        try:
            return float(state.state)
        except (TypeError, ValueError):
            return None

    @callback
    def _clamp_brightness_value(
        self, value, fallback: float = DEFAULT_BRIGHTNESS_SCREENSAVER_VALUE
    ) -> float:
        """Clamp Android brightness values to the 0-255 range."""
        try:
            number = float(value)
        except (TypeError, ValueError):
            number = fallback
        return min(max(number, 0), 255)

    async def _async_set_brightness_value(
        self, config: dict, mode: str, value: float
    ) -> None:
        """Set brightness through the configured mode."""
        value = self._clamp_brightness_value(value)
        if mode == BRIGHTNESS_MODE_FULLY:
            await self._async_set_fully_brightness_value(config, value)
            return

        if mode == BRIGHTNESS_MODE_COMPANION:
            await self._async_send_companion_command(
                config,
                "command_screen_brightness_level",
                round(value),
            )

    async def _async_set_auto_brightness(
        self, config: dict, mode: str, enabled: bool
    ) -> None:
        """Set automatic brightness through the configured mode."""
        if mode == BRIGHTNESS_MODE_FULLY:
            await self._async_set_fully_auto_brightness(config)
            return

        if mode == BRIGHTNESS_MODE_COMPANION:
            await self._async_set_companion_auto_brightness(config, enabled)

    async def _async_set_companion_auto_brightness(
        self, config: dict, enabled: bool
    ) -> None:
        """Set Android automatic brightness through Companion App."""
        await self._async_send_companion_command(
            config,
            "command_auto_screen_brightness",
            "turn_on" if enabled else "turn_off",
        )

    async def _async_read_fully_brightness(self, config: dict) -> float | None:
        """Read current brightness through Fully Kiosk REST deviceInfo."""
        data = await self._async_fully_request(
            config,
            {"cmd": "deviceInfo", "type": "json"},
            expect_json=True,
        )
        if not isinstance(data, dict):
            return None
        value = data.get("screenBrightness")
        if value is None:
            return None
        brightness = self._clamp_brightness_value(value)
        _LOGGER.debug("Fully Kiosk reported screenBrightness=%s", brightness)
        return brightness

    async def _async_set_fully_brightness_value(
        self, config: dict, value: float
    ) -> None:
        """Set manual brightness through Fully Kiosk REST."""
        value = round(self._clamp_brightness_value(value))
        _LOGGER.debug("Setting Fully Kiosk screenBrightness=%s", value)
        await self._async_fully_request(
            config,
            {
                "cmd": "setStringSetting",
                "key": "screenBrightness",
                "value": str(value),
            },
        )

    async def _async_set_fully_auto_brightness(self, config: dict) -> None:
        """Restore automatic brightness through Fully Kiosk REST."""
        await self._async_fully_request(
            config,
            {
                "cmd": "setStringSetting",
                "key": "screenBrightness",
                "value": "",
            },
        )

    async def _async_set_screen_power(self, config: dict, turn_on: bool) -> None:
        """Turn screen on/off through Fully REST or the configured HA switch."""
        if self._has_fully_rest_config(config):
            await self._async_set_fully_screen_power(config, turn_on)
            return

        screen_switch = self._screen_switch(config)
        if not screen_switch:
            return

        domain = screen_switch.split(".", 1)[0]
        await self.hass.services.async_call(
            domain,
            "turn_on" if turn_on else "turn_off",
            {"entity_id": screen_switch},
            blocking=False,
        )

    async def _async_set_fully_screen_power(self, config: dict, turn_on: bool) -> None:
        """Turn screen on/off through Fully Kiosk REST."""
        await self._async_fully_request(
            config,
            {"cmd": "screenOn" if turn_on else "screenOff"},
        )

    def _fully_base_url(self, config: dict) -> str | None:
        """Return Fully Kiosk REST base URL."""
        host = self._fully_host(config)
        if not host:
            return None
        if "://" in host:
            return host
        scheme = "https" if self._fully_use_https(config) else "http"
        parsed = urlsplit(f"//{host}")
        if parsed.hostname and parsed.port:
            return f"{scheme}://{host}"
        return f"{scheme}://{host}:{self._fully_port(config)}"

    async def _async_fully_request(
        self, config: dict, params: dict[str, str], expect_json: bool = False
    ):
        """Call Fully Kiosk Remote Admin REST API."""
        base_url = self._fully_base_url(config)
        password = self._fully_password(config)
        if not base_url or password is None:
            _LOGGER.warning(
                "Fully Kiosk brightness mode requires host and Remote Admin password"
            )
            return None

        request_params = {**params, "password": password}
        session = async_get_clientsession(self.hass)
        try:
            response = await session.get(
                base_url,
                params=request_params,
                timeout=ClientTimeout(total=DEFAULT_FULLY_TIMEOUT),
            )
            async with response:
                if response.status >= 400:
                    _LOGGER.warning(
                        "Fully Kiosk REST request failed with HTTP %s for %s",
                        response.status,
                        params.get("cmd"),
                    )
                    return None
                if expect_json:
                    return await response.json(content_type=None)
                return await response.text()
        except (ClientError, TimeoutError, ValueError):
            _LOGGER.exception("Unable to call Fully Kiosk REST API at %s", base_url)
            return None

    async def _async_send_companion_command(
        self, config: dict, message: str, command
    ) -> None:
        """Send a notification command to the configured Companion App notify service."""
        notify_service = self._companion_notify_service(config)
        if not notify_service or "." not in notify_service:
            return

        domain, service = notify_service.split(".", 1)
        try:
            await self.hass.services.async_call(
                domain,
                service,
                {"message": message, "data": {"command": command}},
                blocking=True,
            )
        except HomeAssistantError:
            _LOGGER.exception(
                "Unable to send Companion App command to %s", notify_service
            )

    async def _async_motion_changed(self, client_id: str | None, event: Event) -> None:
        state = self._state_for(client_id)
        config = state.config or self.config
        if not state.active or not self._has_screen_control(config):
            return

        new_state = event.data.get("new_state")
        if new_state is None:
            return

        if new_state.state == "off":
            self._schedule_screen_off(client_id, state)
            return

        if new_state.state != "on":
            return

        self._cancel_screen_off(state)
        await self._async_set_screen_power(config, True)
        await self._async_reapply_overlay_brightness(state)
        self._schedule_overlay_brightness_reapply(state)
        self.hass.bus.async_fire(
            f"{DOMAIN}_screen_wake",
            {
                "client_id": str(client_id or ""),
                "screen_control": "fully_rest"
                if self._has_fully_rest_config(config)
                else self._screen_switch(config),
            },
        )


async def _async_register_frontend_and_api(hass: HomeAssistant) -> None:
    """Register frontend resources and websocket API once."""
    hass.data.setdefault(DOMAIN, {})

    if not hass.data[DOMAIN].get(FRONTEND_REGISTERED):
        await _async_register_frontend(hass)
        hass.data[DOMAIN][FRONTEND_REGISTERED] = True

    if not hass.data[DOMAIN].get(PANEL_REGISTERED):
        await _async_register_panel(hass)
        hass.data[DOMAIN][PANEL_REGISTERED] = True

    if not hass.data[DOMAIN].get(WEBSOCKET_REGISTERED):
        async_register_websocket_api(hass)
        hass.data[DOMAIN][WEBSOCKET_REGISTERED] = True


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Register frontend static files and module."""
    www_path = Path(__file__).parent / "www"

    if hasattr(hass.http, "async_register_static_paths") and StaticPathConfig:
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    STATIC_URL_PATH,
                    str(www_path),
                    cache_headers=False,
                )
            ]
        )
    elif hasattr(hass.http, "register_static_path"):
        hass.http.register_static_path(STATIC_URL_PATH, str(www_path), False)
    else:
        _LOGGER.error("Unable to register static path for Screensaver Overlay frontend")

    try:
        frontend.add_extra_js_url(hass, FRONTEND_URL)
    except Exception:
        _LOGGER.exception("Unable to register Screensaver Overlay frontend module")


async def _async_register_panel(hass: HomeAssistant) -> None:
    """Register Screensaver Overlay sidebar panel."""
    try:
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL_PATH,
            webcomponent_name=PANEL_ELEMENT,
            sidebar_title="Screensaver Overlay",
            sidebar_icon="mdi:monitor-dashboard",
            module_url=PANEL_URL,
            require_admin=True,
        )
    except ValueError:
        _LOGGER.exception("Unable to register Screensaver Overlay panel")


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up integration-level resources."""
    await _async_register_frontend_and_api(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry
) -> bool:
    """Set up Screensaver Overlay from a config entry."""
    await _async_register_frontend_and_api(hass)
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = ScreensaverOverlayRuntime(hass, entry)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: ConfigEntry
) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if not unload_ok:
        return False

    runtime = hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    if runtime:
        await runtime.async_unload()
    return True
