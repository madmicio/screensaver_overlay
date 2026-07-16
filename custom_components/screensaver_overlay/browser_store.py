"""Browser registry storage for Screensaver Overlay."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import (
    BACKGROUND_MODE_INHERIT,
    BACKGROUND_MODES,
    BRIGHTNESS_MODES,
    BRIGHTNESS_STRATEGIES,
    DOMAIN,
    PANEL_STORAGE_KEY,
    PANEL_STORAGE_VERSION,
)

STORE_DATA = "_browser_store_data"
STORE_OBJECT = "_browser_store_object"

DEFAULT_DATA = {
    "settings": {
        "restrict_to_enabled_clients": False,
    },
    "clients": {},
}

OVERRIDE_KEYS = {
    "weather_entity",
    "weather_icon_size",
    "weather_description_entity",
    "weather_description_text_size",
    "internal_temperature",
    "external_temperature",
    "rain_sensor",
    "calendars",
    "value_entities",
    "status_icon_entities",
    "info_text_size",
    "info_items_limit",
    "show_status_icons",
    "show_weather_icon",
    "show_clock",
    "show_info",
    "show_temperatures",
    "show_hourly_forecast",
    "overlay_idle_timeout",
    "limit_to_dashboards",
    "allowed_dashboard_paths",
    "background_images",
    "background_carousel_interval",
    "background_mode",
    "motion_sensor",
    "screen_switch",
    "screen_off_timeout",
    "brightness_mode",
    "brightness_strategy",
    "companion_notify_service",
    "companion_brightness_sensor",
    "brightness_reduction_percentage",
    "brightness_logarithmic_min_value",
    "brightness_screen_value",
    "brightness_screensaver_value",
    "restore_auto_brightness",
    "fully_host",
    "fully_port",
    "fully_password",
    "fully_use_https",
}

DEVICE_CONFIG_KEYS = {
    "motion_sensor",
    "screen_switch",
    "screen_off_timeout",
    "brightness_mode",
    "brightness_strategy",
    "companion_notify_service",
    "companion_brightness_sensor",
    "brightness_reduction_percentage",
    "brightness_logarithmic_min_value",
    "brightness_screen_value",
    "brightness_screensaver_value",
    "restore_auto_brightness",
    "fully_host",
    "fully_port",
    "fully_password",
    "fully_use_https",
}


@callback
def _normalize_client_id(client_id: Any) -> str:
    """Normalize a browser client id."""
    return str(client_id or "").strip()


@callback
def _utc_now() -> str:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()


@callback
def _normalize_list(value: Any) -> list[str]:
    """Normalize a list-like value."""
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        items = value.replace(",", "\n").splitlines()
    else:
        items = []

    normalized = []
    for item in items:
        item = str(item or "").strip()
        if item:
            normalized.append(item)
    return normalized


@callback
def _normalize_entity_list(value: Any) -> list[str]:
    """Normalize entity lists stored as strings, entity ids, or selector dicts."""
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
def _normalize_status_icon_list(value: Any) -> list[dict[str, str]]:
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


@callback
def _normalize_positive_number(value: Any) -> int | float | None:
    """Normalize a positive number."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number <= 0:
        return None
    return int(number) if number.is_integer() else number


@callback
def _clean_overrides(overrides: dict[str, Any] | None) -> dict[str, Any]:
    """Keep only supported override keys and drop empty values."""
    cleaned = {}
    for key, value in (overrides or {}).items():
        if key not in OVERRIDE_KEYS:
            continue
        if value in ("", None, [], {}):
            continue
        if key in {"calendars", "value_entities"}:
            entities = _normalize_entity_list(value)
            if entities:
                cleaned[key] = entities
            continue
        if key == "status_icon_entities":
            entities = _normalize_status_icon_list(value)
            if entities:
                cleaned[key] = entities
            continue
        if key == "background_images":
            images = _normalize_list(value)
            if images:
                cleaned[key] = images
            continue
        if key == "background_carousel_interval":
            number = _normalize_positive_number(value)
            if number is not None:
                cleaned[key] = number
            continue
        if key == "background_mode":
            if value == BACKGROUND_MODE_INHERIT:
                continue
            if value not in BACKGROUND_MODES:
                continue
        if key == "brightness_mode" and value not in BRIGHTNESS_MODES:
            continue
        if key == "brightness_strategy" and value not in BRIGHTNESS_STRATEGIES:
            continue
        cleaned[key] = value
    return cleaned


@callback
def _normalize_data(data: dict[str, Any] | None) -> dict[str, Any]:
    """Normalize persisted browser registry data."""
    normalized = deepcopy(DEFAULT_DATA)
    if isinstance(data, dict):
        if isinstance(data.get("settings"), dict):
            normalized["settings"].update(data["settings"])
        if isinstance(data.get("clients"), dict):
            normalized["clients"] = data["clients"]

    normalized["settings"]["restrict_to_enabled_clients"] = bool(
        normalized["settings"].get("restrict_to_enabled_clients", False)
    )

    clients = {}
    for client_id, client in normalized["clients"].items():
        client_id = _normalize_client_id(client_id)
        if not client_id or not isinstance(client, dict):
            continue
        clients[client_id] = {
            "id": client_id,
            "name": str(client.get("name") or client.get("default_name") or client_id),
            "default_name": str(client.get("default_name") or client_id),
            "enabled": bool(client.get("enabled", False)),
            "expose_binary_sensor": bool(client.get("expose_binary_sensor", False)),
            "last_seen": client.get("last_seen"),
            "last_path": client.get("last_path"),
            "user_agent": client.get("user_agent"),
            "platform": client.get("platform"),
            "overrides": _clean_overrides(client.get("overrides")),
        }
    normalized["clients"] = clients
    return normalized


async def async_get_browser_store(hass: HomeAssistant) -> Store:
    """Return the browser config storage object."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if STORE_OBJECT not in domain_data:
        domain_data[STORE_OBJECT] = Store(
            hass, PANEL_STORAGE_VERSION, PANEL_STORAGE_KEY
        )
    return domain_data[STORE_OBJECT]


async def async_load_browser_data(hass: HomeAssistant) -> dict[str, Any]:
    """Load browser registry data."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if STORE_DATA not in domain_data:
        store = await async_get_browser_store(hass)
        domain_data[STORE_DATA] = _normalize_data(await store.async_load())
    return domain_data[STORE_DATA]


async def async_save_browser_data(
    hass: HomeAssistant, data: dict[str, Any]
) -> dict[str, Any]:
    """Save browser registry data."""
    normalized = _normalize_data(data)
    hass.data.setdefault(DOMAIN, {})[STORE_DATA] = normalized
    store = await async_get_browser_store(hass)
    await store.async_save(normalized)
    return normalized


async def async_register_browser_client(
    hass: HomeAssistant, client: dict[str, Any]
) -> dict[str, Any] | None:
    """Register or update a browser client."""
    client_id = _normalize_client_id(client.get("client_id"))
    if not client_id:
        return None

    data = await async_load_browser_data(hass)
    existing = data["clients"].get(client_id, {})
    default_name = str(client.get("name") or existing.get("default_name") or client_id)
    default_enabled = not data["settings"].get("restrict_to_enabled_clients", False)

    data["clients"][client_id] = {
        "id": client_id,
        "name": existing.get("name") or default_name,
        "default_name": default_name,
        "enabled": bool(existing.get("enabled", default_enabled)),
        "expose_binary_sensor": bool(existing.get("expose_binary_sensor", False)),
        "last_seen": _utc_now(),
        "last_path": client.get("path") or existing.get("last_path"),
        "user_agent": client.get("user_agent") or existing.get("user_agent"),
        "platform": client.get("platform") or existing.get("platform"),
        "overrides": _clean_overrides(existing.get("overrides")),
    }
    data = await async_save_browser_data(hass, data)
    return data["clients"][client_id]


@callback
def build_entry_config(entry) -> dict[str, Any]:
    """Return merged config entry data and options."""
    config = {
        "entry_id": entry.entry_id,
        **entry.data,
        **entry.options,
    }
    for key in ("calendars", "value_entities"):
        data_values = _normalize_entity_list(entry.data.get(key))
        option_values = _normalize_entity_list(entry.options.get(key))
        config[key] = option_values or data_values
    data_status_icons = _normalize_status_icon_list(entry.data.get("status_icon_entities"))
    option_status_icons = _normalize_status_icon_list(
        entry.options.get("status_icon_entities")
    )
    config["status_icon_entities"] = option_status_icons or data_status_icons
    return config


@callback
def build_effective_config(
    entry_config: dict[str, Any],
    browser_data: dict[str, Any],
    client_id: str | None,
    include_device_config: bool = False,
) -> dict[str, Any] | None:
    """Build the effective config for a specific browser."""
    client_id = _normalize_client_id(client_id)
    settings = browser_data.get("settings", {})
    clients = browser_data.get("clients", {})
    client = clients.get(client_id) if client_id else None

    if client and not client.get("enabled", False):
        return None

    if settings.get("restrict_to_enabled_clients") and not (
        client and client.get("enabled", False)
    ):
        return None

    config = {
        key: value
        for key, value in entry_config.items()
        if key not in DEVICE_CONFIG_KEYS
    }
    for key in ("calendars", "value_entities"):
        config[key] = _normalize_entity_list(config.get(key))
    config["status_icon_entities"] = _normalize_status_icon_list(
        config.get("status_icon_entities")
    )

    if client:
        overrides = _clean_overrides(client.get("overrides"))
        for key, value in overrides.items():
            if not include_device_config and key in DEVICE_CONFIG_KEYS:
                continue
            if key in {"calendars", "value_entities"}:
                normalized = _normalize_entity_list(value)
                if normalized:
                    config[key] = normalized
                continue
            if key == "status_icon_entities":
                normalized = _normalize_status_icon_list(value)
                if normalized:
                    config[key] = normalized
                continue
            config[key] = value
        config["browser_client_id"] = client_id
        config["browser_client_name"] = client.get("name")
    return config


async def async_update_browser_settings(
    hass: HomeAssistant, settings: dict[str, Any]
) -> dict[str, Any]:
    """Update global browser settings."""
    data = await async_load_browser_data(hass)
    data["settings"]["restrict_to_enabled_clients"] = bool(
        settings.get("restrict_to_enabled_clients", False)
    )
    return await async_save_browser_data(hass, data)


async def async_save_browser_client_config(
    hass: HomeAssistant, client_id: str, client_config: dict[str, Any]
) -> dict[str, Any]:
    """Save one browser client config."""
    client_id = _normalize_client_id(client_id)
    data = await async_load_browser_data(hass)
    existing = data["clients"].get(client_id)
    if existing is None:
        existing = {
            "id": client_id,
            "name": client_id,
            "default_name": client_id,
            "enabled": False,
            "expose_binary_sensor": False,
            "overrides": {},
        }

    existing["name"] = str(client_config.get("name") or existing.get("name") or client_id)
    existing["enabled"] = bool(client_config.get("enabled", False))
    existing["expose_binary_sensor"] = bool(
        client_config.get("expose_binary_sensor", False)
    )
    existing["overrides"] = _clean_overrides(client_config.get("overrides"))
    existing.setdefault("last_seen", datetime.min.isoformat())
    data["clients"][client_id] = existing
    return await async_save_browser_data(hass, data)


async def async_delete_browser_client(
    hass: HomeAssistant, client_id: str
) -> dict[str, Any]:
    """Delete one browser client."""
    data = await async_load_browser_data(hass)
    data["clients"].pop(_normalize_client_id(client_id), None)
    return await async_save_browser_data(hass, data)
