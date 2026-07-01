"""Screensaver Overlay integration."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

try:
    from homeassistant.components.http import StaticPathConfig
except ImportError:
    StaticPathConfig = None

from .const import (
    CONF_MOTION_SENSOR,
    CONF_SCREEN_OFF_TIMEOUT,
    CONF_SCREEN_SWITCH,
    DOMAIN,
    FRONTEND_URL,
    STATIC_URL_PATH,
)
from .websocket_api import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
FRONTEND_REGISTERED = "_frontend_registered"
WEBSOCKET_REGISTERED = "_websocket_registered"


class ScreensaverOverlayRuntime:
    """Runtime controller for screen switch and motion wake behavior."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize runtime controller."""
        self.hass = hass
        self.entry = entry
        self.active = False
        self._screen_off_unsub: CALLBACK_TYPE | None = None
        self._motion_unsub: CALLBACK_TYPE | None = None

    @property
    def config(self) -> dict:
        """Return merged entry data and options."""
        return {**self.entry.data, **self.entry.options}

    @property
    def screen_switch(self) -> str | None:
        """Return configured screen switch."""
        return self.config.get(CONF_SCREEN_SWITCH)

    @property
    def motion_sensor(self) -> str | None:
        """Return configured motion sensor."""
        return self.config.get(CONF_MOTION_SENSOR)

    @property
    def screen_off_timeout(self) -> int:
        """Return screen off timeout in seconds."""
        try:
            return int(self.config.get(CONF_SCREEN_OFF_TIMEOUT) or 0)
        except (TypeError, ValueError):
            return 0

    async def async_overlay_shown(self) -> None:
        """Handle overlay shown in frontend."""
        self.active = True
        self._ensure_motion_listener()
        self._schedule_screen_off()

    async def async_overlay_hidden(self) -> None:
        """Handle overlay hidden in frontend."""
        self.active = False
        self._cancel_screen_off()
        self._remove_motion_listener()

    async def async_unload(self) -> None:
        """Unload runtime listeners and timers."""
        await self.async_overlay_hidden()

    @callback
    def _cancel_screen_off(self) -> None:
        if self._screen_off_unsub is not None:
            self._screen_off_unsub()
            self._screen_off_unsub = None

    @callback
    def _schedule_screen_off(self) -> None:
        self._cancel_screen_off()

        if not self.active or not self.screen_switch or self.screen_off_timeout <= 0:
            return

        self._screen_off_unsub = async_call_later(
            self.hass, self.screen_off_timeout, self._async_turn_screen_off
        )

    async def _async_turn_screen_off(self, now) -> None:
        self._screen_off_unsub = None
        if not self.active or not self.screen_switch:
            return

        domain = self.screen_switch.split(".", 1)[0]
        await self.hass.services.async_call(
            domain,
            "turn_off",
            {"entity_id": self.screen_switch},
            blocking=False,
        )

    @callback
    def _ensure_motion_listener(self) -> None:
        if self._motion_unsub is not None or not self.motion_sensor:
            return

        self._motion_unsub = async_track_state_change_event(
            self.hass, [self.motion_sensor], self._async_motion_changed
        )

    @callback
    def _remove_motion_listener(self) -> None:
        if self._motion_unsub is not None:
            self._motion_unsub()
            self._motion_unsub = None

    async def _async_motion_changed(self, event: Event) -> None:
        if not self.active or not self.screen_switch:
            return

        new_state = event.data.get("new_state")
        if new_state is None or new_state.state != "on":
            return

        domain = self.screen_switch.split(".", 1)[0]
        await self.hass.services.async_call(
            domain,
            "turn_on",
            {"entity_id": self.screen_switch},
            blocking=False,
        )
        self._schedule_screen_off()


async def _async_register_frontend_and_api(hass: HomeAssistant) -> None:
    """Register frontend resources and websocket API once."""
    hass.data.setdefault(DOMAIN, {})

    if not hass.data[DOMAIN].get(FRONTEND_REGISTERED):
        await _async_register_frontend(hass)
        hass.data[DOMAIN][FRONTEND_REGISTERED] = True

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
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: ConfigEntry
) -> bool:
    """Unload a config entry."""
    runtime = hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    if runtime:
        await runtime.async_unload()
    return True
