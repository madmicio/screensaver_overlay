"""Config flow for Screensaver Overlay."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.components import frontend
from homeassistant.helpers import selector

from .const import (
    CONF_CALENDARS,
    CONF_ALLOWED_DASHBOARD_PATHS,
    CONF_EXTERNAL_TEMPERATURE,
    CONF_INFO_ITEMS_LIMIT,
    CONF_INFO_TEXT_SIZE,
    CONF_INTERNAL_TEMPERATURE,
    CONF_MOTION_SENSOR,
    CONF_LIMIT_TO_DASHBOARDS,
    CONF_OVERLAY_IDLE_TIMEOUT,
    CONF_RAIN_SENSOR,
    CONF_SCREEN_OFF_TIMEOUT,
    CONF_SCREEN_SWITCH,
    CONF_SHOW_CLOCK,
    CONF_SHOW_HOURLY_FORECAST,
    CONF_SHOW_INFO,
    CONF_SHOW_STATUS_ICONS,
    CONF_SHOW_TEMPERATURES,
    CONF_SHOW_WEATHER_ICON,
    CONF_STATUS_ICON_ENTITIES,
    CONF_VALUE_ENTITIES,
    CONF_WEATHER_DESCRIPTION_ENTITY,
    CONF_WEATHER_DESCRIPTION_TEXT_SIZE,
    CONF_WEATHER_ENTITY,
    CONF_WEATHER_ICON_SIZE,
    DEFAULT_INFO_ITEMS_LIMIT,
    DEFAULT_INFO_TEXT_SIZE,
    DEFAULT_LIMIT_TO_DASHBOARDS,
    DEFAULT_OVERLAY_IDLE_TIMEOUT,
    DEFAULT_SCREEN_OFF_TIMEOUT,
    DEFAULT_SHOW_BLOCK,
    DEFAULT_WEATHER_DESCRIPTION_TEXT_SIZE,
    DEFAULT_WEATHER_ICON_SIZE,
    DOMAIN,
)


def _normalize_path(path: str) -> str:
    """Normalize a dashboard path."""
    path = str(path or "").strip()
    if not path:
        return ""
    path = path if path.startswith("/") else f"/{path}"
    return path.rstrip("/") if len(path) > 1 else path


def _normalize_path_list(value: Any) -> list[str]:
    """Normalize dashboard path config values from old text or new list format."""
    if isinstance(value, list):
        return [path for item in value if (path := _normalize_path(item))]
    if isinstance(value, str):
        return [
            path
            for item in value.replace(",", "\n").splitlines()
            if (path := _normalize_path(item))
        ]
    return []


def _dashboard_options(hass) -> list[dict[str, str]]:
    """Return Lovelace dashboard options from registered frontend panels."""
    panels = hass.data.get(frontend.DATA_PANELS, {})
    options = []

    for path, panel in panels.items():
        if getattr(panel, "component_name", None) != "lovelace":
            continue

        dashboard_path = _normalize_path(path)
        title = getattr(panel, "sidebar_title", None) or dashboard_path
        options.append(
            {
                "value": dashboard_path,
                "label": f"{title} ({dashboard_path})",
            }
        )

    return sorted(options, key=lambda option: option["label"].lower())


def _schema(hass, defaults: dict[str, Any] | None = None) -> vol.Schema:
    """Build flow schema."""
    defaults = defaults or {}
    dashboard_options = _dashboard_options(hass)

    def optional_entity(key: str) -> vol.Optional:
        """Return an optional entity field without passing None as default."""
        if defaults.get(key):
            return vol.Optional(key, default=defaults[key])
        return vol.Optional(key)

    return vol.Schema(
        {
            vol.Required(
                CONF_WEATHER_ENTITY,
                default=defaults.get(CONF_WEATHER_ENTITY),
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="weather")
            ),
            vol.Optional(
                CONF_WEATHER_ICON_SIZE,
                default=defaults.get(CONF_WEATHER_ICON_SIZE, DEFAULT_WEATHER_ICON_SIZE),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=10,
                    max=60,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="vw",
                )
            ),
            optional_entity(CONF_WEATHER_DESCRIPTION_ENTITY): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="sensor")
            ),
            vol.Optional(
                CONF_WEATHER_DESCRIPTION_TEXT_SIZE,
                default=defaults.get(
                    CONF_WEATHER_DESCRIPTION_TEXT_SIZE,
                    DEFAULT_WEATHER_DESCRIPTION_TEXT_SIZE,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1,
                    max=6,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="vh",
                )
            ),
            optional_entity(CONF_INTERNAL_TEMPERATURE): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="sensor")
            ),
            optional_entity(CONF_EXTERNAL_TEMPERATURE): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="sensor")
            ),
            optional_entity(CONF_RAIN_SENSOR): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="sensor")
            ),
            vol.Optional(
                CONF_CALENDARS,
                default=defaults.get(CONF_CALENDARS, []),
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="calendar", multiple=True)
            ),
            vol.Optional(
                CONF_VALUE_ENTITIES,
                default=defaults.get(CONF_VALUE_ENTITIES, []),
            ): selector.EntitySelector(selector.EntitySelectorConfig(multiple=True)),
            vol.Optional(
                CONF_STATUS_ICON_ENTITIES,
                default=defaults.get(CONF_STATUS_ICON_ENTITIES, []),
            ): selector.EntitySelector(selector.EntitySelectorConfig(multiple=True)),
            vol.Optional(
                CONF_INFO_TEXT_SIZE,
                default=defaults.get(CONF_INFO_TEXT_SIZE, DEFAULT_INFO_TEXT_SIZE),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1,
                    max=6,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="vh",
                )
            ),
            vol.Optional(
                CONF_INFO_ITEMS_LIMIT,
                default=defaults.get(CONF_INFO_ITEMS_LIMIT, DEFAULT_INFO_ITEMS_LIMIT),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1,
                    max=20,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                )
            ),
            vol.Optional(
                CONF_SHOW_STATUS_ICONS,
                default=defaults.get(CONF_SHOW_STATUS_ICONS, DEFAULT_SHOW_BLOCK),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_SHOW_WEATHER_ICON,
                default=defaults.get(CONF_SHOW_WEATHER_ICON, DEFAULT_SHOW_BLOCK),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_SHOW_CLOCK,
                default=defaults.get(CONF_SHOW_CLOCK, DEFAULT_SHOW_BLOCK),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_SHOW_INFO,
                default=defaults.get(CONF_SHOW_INFO, DEFAULT_SHOW_BLOCK),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_SHOW_TEMPERATURES,
                default=defaults.get(CONF_SHOW_TEMPERATURES, DEFAULT_SHOW_BLOCK),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_SHOW_HOURLY_FORECAST,
                default=defaults.get(CONF_SHOW_HOURLY_FORECAST, DEFAULT_SHOW_BLOCK),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_LIMIT_TO_DASHBOARDS,
                default=defaults.get(
                    CONF_LIMIT_TO_DASHBOARDS, DEFAULT_LIMIT_TO_DASHBOARDS
                ),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_ALLOWED_DASHBOARD_PATHS,
                default=_normalize_path_list(
                    defaults.get(CONF_ALLOWED_DASHBOARD_PATHS, [])
                ),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=dashboard_options or ["/lovelace"],
                    multiple=True,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    custom_value=True,
                )
            ),
            optional_entity(CONF_MOTION_SENSOR): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="binary_sensor")
            ),
            optional_entity(CONF_SCREEN_SWITCH): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="switch")
            ),
            vol.Optional(
                CONF_OVERLAY_IDLE_TIMEOUT,
                default=defaults.get(
                    CONF_OVERLAY_IDLE_TIMEOUT, DEFAULT_OVERLAY_IDLE_TIMEOUT
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1,
                    max=3600,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="s",
                )
            ),
            vol.Optional(
                CONF_SCREEN_OFF_TIMEOUT,
                default=defaults.get(
                    CONF_SCREEN_OFF_TIMEOUT, DEFAULT_SCREEN_OFF_TIMEOUT
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    max=86400,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="s",
                )
            ),
        }
    )


class ScreensaverOverlayConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Screensaver Overlay."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        """Handle the initial step."""
        if user_input is not None:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title="Screensaver Overlay", data=user_input)

        return self.async_show_form(step_id="user", data_schema=_schema(self.hass))

    @staticmethod
    def async_get_options_flow(config_entry):
        """Create the options flow."""
        return ScreensaverOverlayOptionsFlow(config_entry)


class ScreensaverOverlayOptionsFlow(config_entries.OptionsFlow):
    """Handle Screensaver Overlay options."""

    def __init__(self, config_entry=None) -> None:
        """Initialize options flow."""
        self._config_entry = config_entry

    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        """Manage options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        config_entry = self._config_entry or getattr(self, "config_entry", None)
        if config_entry is None:
            config_entry = self.hass.config_entries.async_get_entry(self.handler)
        defaults = {}
        if config_entry is not None:
            defaults = {**config_entry.data, **config_entry.options}
        return self.async_show_form(
            step_id="init", data_schema=_schema(self.hass, defaults)
        )
