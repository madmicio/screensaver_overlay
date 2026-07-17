"""Websocket API for Screensaver Overlay."""

from __future__ import annotations

import base64
import binascii
import re
from pathlib import Path
from uuid import uuid4

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .browser_store import (
    async_delete_browser_client,
    async_load_browser_data,
    async_register_browser_client,
    async_save_browser_client_config,
    async_save_browser_data,
    async_update_browser_settings,
    build_effective_config,
    build_entry_config,
)
from .const import DOMAIN, SIGNAL_BROWSER_CONFIG_UPDATED

BACKGROUND_DIR_PARTS = ("www", "screensaver_overlay", "backgrounds")
BACKGROUND_URL_PREFIX = "/local/screensaver_overlay/backgrounds"
BUILTIN_BACKGROUND_URL_PREFIX = "/screensaver_overlay/default_backgrounds"
BUILTIN_BACKGROUND_FILENAMES = (
    "default-1.webp",
    "default-2.webp",
    "default-3.webp",
    "default-4.webp",
)
BACKGROUND_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
BACKGROUND_MAX_BYTES = 8 * 1024 * 1024

GLOBAL_CONFIG_KEYS = {
    "weather_entity",
    "weather_icon_size",
    "weather_description_entity",
    "weather_description_text_size",
    "hourly_forecast_background_opacity",
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
}
LIST_CONFIG_KEYS = {
    "calendars",
    "value_entities",
    "allowed_dashboard_paths",
    "background_images",
}
BOOL_CONFIG_KEYS = {
    "show_status_icons",
    "show_weather_icon",
    "show_clock",
    "show_info",
    "show_temperatures",
    "show_hourly_forecast",
    "limit_to_dashboards",
}
NUMBER_CONFIG_KEYS = {
    "weather_icon_size",
    "weather_description_text_size",
    "hourly_forecast_background_opacity",
    "info_text_size",
    "info_items_limit",
    "overlay_idle_timeout",
    "background_carousel_interval",
}


@callback
def _is_admin_connection(connection) -> bool:
    """Return whether the websocket connection belongs to an admin user."""
    return bool(getattr(getattr(connection, "user", None), "is_admin", False))


@callback
def _send_admin_required(connection, msg) -> None:
    """Send a standard admin-required websocket error."""
    connection.send_error(
        msg["id"],
        "unauthorized",
        "Administrator privileges are required for this command",
    )


@callback
def _entry_payload(entry) -> dict:
    """Return merged config entry data and options for the frontend."""
    return build_entry_config(entry)


@callback
def _first_entry(hass: HomeAssistant):
    """Return the active Screensaver Overlay config entry."""
    return next(
        (
            entry
            for entry in hass.config_entries.async_entries(DOMAIN)
            if not entry.disabled_by
        ),
        None,
    )


@callback
def _normalize_list(value) -> list[str]:
    """Normalize list-like config values."""
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


@callback
def _normalize_effective_lists(config: dict | None) -> dict | None:
    """Normalize list fields in a frontend config payload."""
    if config is None:
        return None
    normalized = dict(config)
    for key in LIST_CONFIG_KEYS:
        normalized[key] = _normalize_list(normalized.get(key))
    normalized["status_icon_entities"] = _normalize_status_icon_list(
        normalized.get("status_icon_entities")
    )
    return normalized


@callback
def _background_dir(hass: HomeAssistant) -> Path:
    """Return the local background image storage directory."""
    return Path(hass.config.path(*BACKGROUND_DIR_PARTS))


@callback
def _builtin_background_url(filename: str) -> str:
    """Return the public URL for a bundled background image filename."""
    return f"{BUILTIN_BACKGROUND_URL_PREFIX}/{filename}"


@callback
def _background_url(filename: str) -> str:
    """Return the public URL for a background image filename."""
    return f"{BACKGROUND_URL_PREFIX}/{filename}"


@callback
def _filename_from_background_url(url: str) -> str:
    """Return a safe filename from a public background URL."""
    url = str(url or "").strip()
    if not url.startswith(f"{BACKGROUND_URL_PREFIX}/"):
        return ""
    filename = Path(url.removeprefix(f"{BACKGROUND_URL_PREFIX}/")).name
    return filename if filename and filename == url.rsplit("/", 1)[-1] else ""


@callback
def _is_builtin_background_url(url: str) -> bool:
    """Return whether a URL points to a bundled background image."""
    url = str(url or "").strip()
    if not url.startswith(f"{BUILTIN_BACKGROUND_URL_PREFIX}/"):
        return False
    filename = Path(url.removeprefix(f"{BUILTIN_BACKGROUND_URL_PREFIX}/")).name
    return filename in BUILTIN_BACKGROUND_FILENAMES and filename == url.rsplit("/", 1)[-1]


@callback
def _sanitize_upload_filename(filename: str) -> tuple[str, str]:
    """Return a safe file stem and extension for an uploaded image."""
    source = Path(str(filename or "image")).name
    extension = Path(source).suffix.lower()
    if extension not in BACKGROUND_ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported image extension")
    stem = Path(source).stem.lower()
    stem = re.sub(r"[^a-z0-9._-]+", "-", stem).strip(".-_") or "image"
    return stem[:80], extension


@callback
def _is_supported_image(data: bytes) -> bool:
    """Return whether the bytes look like a supported image type."""
    return (
        data.startswith(b"\xff\xd8\xff")
        or data.startswith(b"\x89PNG\r\n\x1a\n")
        or data.startswith((b"GIF87a", b"GIF89a"))
        or (data.startswith(b"RIFF") and len(data) > 12 and data[8:12] == b"WEBP")
    )


def _list_background_files_sync(directory: Path) -> list[dict]:
    """List stored background images."""
    if not directory.exists():
        return []

    images = []
    for path in directory.iterdir():
        if not path.is_file() or path.suffix.lower() not in BACKGROUND_ALLOWED_EXTENSIONS:
            continue
        stat = path.stat()
        images.append(
            {
                "filename": path.name,
                "url": _background_url(path.name),
                "size": stat.st_size,
                "modified": stat.st_mtime,
            }
        )
    return sorted(images, key=lambda item: item["filename"].lower())


def _list_builtin_background_files_sync() -> list[dict]:
    """List bundled background images."""
    return [
        {
            "filename": filename,
            "url": _builtin_background_url(filename),
            "size": 0,
            "modified": 0,
            "builtin": True,
        }
        for filename in BUILTIN_BACKGROUND_FILENAMES
    ]


def _write_background_file_sync(
    directory: Path, filename: str, content: bytes
) -> dict:
    """Write a background image to disk."""
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / filename
    path.write_bytes(content)
    stat = path.stat()
    return {
        "filename": filename,
        "url": _background_url(filename),
        "size": stat.st_size,
        "modified": stat.st_mtime,
    }


def _delete_background_file_sync(directory: Path, filename: str) -> bool:
    """Delete a background image from disk."""
    if not filename:
        return False
    path = directory / filename
    if not path.exists() or not path.is_file():
        return False
    path.unlink()
    return True


@callback
def _remove_background_url_from_dict(config: dict, url: str) -> tuple[dict, bool]:
    """Remove one background URL from a config dict."""
    updated = dict(config or {})
    images = _normalize_list(updated.get("background_images"))
    filtered = [image for image in images if image != url]
    if filtered == images:
        return updated, False
    if filtered:
        updated["background_images"] = filtered
    else:
        updated.pop("background_images", None)
    return updated, True


async def _remove_background_url_from_configs(
    hass: HomeAssistant, url: str
) -> dict:
    """Remove a deleted background URL from global and browser configs."""
    entry = _first_entry(hass)
    config_result = None
    if entry is not None:
        data, data_changed = _remove_background_url_from_dict(entry.data, url)
        options, options_changed = _remove_background_url_from_dict(entry.options, url)
        if data_changed or options_changed:
            hass.config_entries.async_update_entry(entry, data=data, options=options)
        config_result = _entry_payload(entry)

    browser_data = await async_load_browser_data(hass)
    browser_changed = False
    for client in browser_data.get("clients", {}).values():
        overrides, changed = _remove_background_url_from_dict(
            client.get("overrides", {}), url
        )
        if changed:
            client["overrides"] = overrides
            browser_changed = True
    if browser_changed:
        browser_data = await async_save_browser_data(hass, browser_data)

    return {"config": config_result, "browser_config": browser_data}


@callback
def _clean_global_config(config: dict) -> dict:
    """Normalize global config received from the panel."""
    cleaned = {}
    for key in GLOBAL_CONFIG_KEYS:
        value = config.get(key)
        if key in LIST_CONFIG_KEYS:
            cleaned[key] = _normalize_list(value)
            continue
        if key == "status_icon_entities":
            cleaned[key] = _normalize_status_icon_list(value)
            continue
        if key in BOOL_CONFIG_KEYS:
            cleaned[key] = bool(value)
            continue
        if key in NUMBER_CONFIG_KEYS:
            if value in ("", None):
                cleaned[key] = ""
                continue
            try:
                number = float(value)
            except (TypeError, ValueError):
                cleaned[key] = ""
                continue
            if key == "hourly_forecast_background_opacity":
                number = min(max(number, 0), 100)
            cleaned[key] = int(number) if number.is_integer() else number
            continue
        cleaned[key] = str(value or "").strip()
    return cleaned


@callback
def _runtime_for_msg(hass: HomeAssistant, msg: dict):
    """Return runtime for websocket message."""
    runtimes = hass.data.get(DOMAIN, {})
    entry_id = msg.get("entry_id")
    if entry_id:
        return runtimes.get(entry_id)
    return next(
        (
            runtime
            for runtime in runtimes.values()
            if hasattr(runtime, "async_overlay_shown")
        ),
        None,
    )


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register websocket commands."""
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_register_client)
    websocket_api.async_register_command(hass, websocket_get_browser_config)
    websocket_api.async_register_command(hass, websocket_save_global_config)
    websocket_api.async_register_command(hass, websocket_save_browser_settings)
    websocket_api.async_register_command(hass, websocket_save_browser_client)
    websocket_api.async_register_command(hass, websocket_delete_browser_client)
    websocket_api.async_register_command(hass, websocket_list_background_images)
    websocket_api.async_register_command(hass, websocket_upload_background_image)
    websocket_api.async_register_command(hass, websocket_delete_background_image)
    websocket_api.async_register_command(hass, websocket_overlay_shown)
    websocket_api.async_register_command(hass, websocket_overlay_hidden)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/get_config",
        vol.Optional("client_id"): str,
    }
)
@websocket_api.async_response
async def websocket_get_config(hass: HomeAssistant, connection, msg) -> None:
    """Return Screensaver Overlay config to the frontend."""
    entries = [
        _entry_payload(entry)
        for entry in hass.config_entries.async_entries(DOMAIN)
        if not entry.disabled_by
    ]
    browser_data = await async_load_browser_data(hass)
    runtime = _runtime_for_msg(hass, msg)
    config = (
        build_effective_config(entries[0], browser_data, msg.get("client_id"))
        if entries
        else None
    )
    config = _normalize_effective_lists(config)
    connection.send_result(
        msg["id"],
        {
            "entries": entries,
            "config": config,
            "overlay_active": bool(
                runtime and runtime.is_overlay_active(msg.get("client_id"))
            ),
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/register_client",
        vol.Required("client_id"): str,
        vol.Optional("name"): str,
        vol.Optional("path"): str,
        vol.Optional("user_agent"): str,
        vol.Optional("platform"): str,
    }
)
@websocket_api.async_response
async def websocket_register_client(hass: HomeAssistant, connection, msg) -> None:
    """Register a browser client."""
    client = await async_register_browser_client(hass, msg)
    async_dispatcher_send(hass, SIGNAL_BROWSER_CONFIG_UPDATED)
    connection.send_result(msg["id"], {"client": client})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/get_browser_config",
    }
)
@websocket_api.async_response
async def websocket_get_browser_config(hass: HomeAssistant, connection, msg) -> None:
    """Return browser registry and global config for the panel."""
    if not _is_admin_connection(connection):
        _send_admin_required(connection, msg)
        return

    entry = _first_entry(hass)
    browser_data = await async_load_browser_data(hass)
    connection.send_result(
        msg["id"],
        {
            "browser_config": browser_data,
            "config": _entry_payload(entry) if entry else None,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/save_global_config",
        vol.Required("config"): dict,
    }
)
@websocket_api.async_response
async def websocket_save_global_config(hass: HomeAssistant, connection, msg) -> None:
    """Save global Screensaver Overlay configuration."""
    if not _is_admin_connection(connection):
        _send_admin_required(connection, msg)
        return

    entry = _first_entry(hass)
    if entry is None:
        connection.send_error(
            msg["id"], "not_found", "No Screensaver Overlay config entry found"
        )
        return

    options = _clean_global_config(msg["config"])
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"config": _entry_payload(entry)})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/save_browser_settings",
        vol.Required("settings"): dict,
    }
)
@websocket_api.async_response
async def websocket_save_browser_settings(
    hass: HomeAssistant, connection, msg
) -> None:
    """Save global browser settings."""
    if not _is_admin_connection(connection):
        _send_admin_required(connection, msg)
        return

    browser_data = await async_update_browser_settings(hass, msg["settings"])
    connection.send_result(msg["id"], {"browser_config": browser_data})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/save_browser_client",
        vol.Required("client_id"): str,
        vol.Required("client_config"): dict,
    }
)
@websocket_api.async_response
async def websocket_save_browser_client(hass: HomeAssistant, connection, msg) -> None:
    """Save browser client configuration."""
    if not _is_admin_connection(connection):
        _send_admin_required(connection, msg)
        return

    browser_data = await async_save_browser_client_config(
        hass, msg["client_id"], msg["client_config"]
    )
    async_dispatcher_send(hass, SIGNAL_BROWSER_CONFIG_UPDATED)
    connection.send_result(msg["id"], {"browser_config": browser_data})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/delete_browser_client",
        vol.Required("client_id"): str,
    }
)
@websocket_api.async_response
async def websocket_delete_browser_client(
    hass: HomeAssistant, connection, msg
) -> None:
    """Delete browser client configuration."""
    if not _is_admin_connection(connection):
        _send_admin_required(connection, msg)
        return

    browser_data = await async_delete_browser_client(hass, msg["client_id"])
    async_dispatcher_send(hass, SIGNAL_BROWSER_CONFIG_UPDATED)
    connection.send_result(msg["id"], {"browser_config": browser_data})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/list_background_images",
    }
)
@websocket_api.async_response
async def websocket_list_background_images(hass: HomeAssistant, connection, msg) -> None:
    """List uploaded background images."""
    if not _is_admin_connection(connection):
        _send_admin_required(connection, msg)
        return

    images = await hass.async_add_executor_job(
        _list_background_files_sync, _background_dir(hass)
    )
    connection.send_result(
        msg["id"], {"images": [*_list_builtin_background_files_sync(), *images]}
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/upload_background_image",
        vol.Required("filename"): str,
        vol.Required("content"): str,
    }
)
@websocket_api.async_response
async def websocket_upload_background_image(
    hass: HomeAssistant, connection, msg
) -> None:
    """Upload one background image."""
    if not _is_admin_connection(connection):
        _send_admin_required(connection, msg)
        return

    try:
        stem, extension = _sanitize_upload_filename(msg["filename"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return

    content = str(msg["content"] or "")
    if "," in content and content.split(",", 1)[0].startswith("data:"):
        content = content.split(",", 1)[1]

    try:
        data = base64.b64decode(content, validate=True)
    except (binascii.Error, ValueError):
        connection.send_error(msg["id"], "invalid_base64", "Invalid upload content")
        return

    if len(data) > BACKGROUND_MAX_BYTES:
        connection.send_error(msg["id"], "too_large", "Image is larger than 8 MB")
        return
    if not _is_supported_image(data):
        connection.send_error(msg["id"], "invalid_image", "Unsupported image data")
        return

    filename = f"{uuid4().hex}-{stem}{extension}"
    image = await hass.async_add_executor_job(
        _write_background_file_sync, _background_dir(hass), filename, data
    )
    images = await hass.async_add_executor_job(
        _list_background_files_sync, _background_dir(hass)
    )
    connection.send_result(msg["id"], {"image": image, "images": images})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/delete_background_image",
        vol.Required("url"): str,
    }
)
@websocket_api.async_response
async def websocket_delete_background_image(
    hass: HomeAssistant, connection, msg
) -> None:
    """Delete one uploaded background image and clean saved selections."""
    if not _is_admin_connection(connection):
        _send_admin_required(connection, msg)
        return

    url = str(msg["url"] or "").strip()
    if _is_builtin_background_url(url):
        connection.send_error(
            msg["id"], "builtin_background", "Bundled background images cannot be deleted"
        )
        return

    filename = _filename_from_background_url(url)
    if not filename:
        connection.send_error(msg["id"], "invalid_url", "Invalid background image URL")
        return

    deleted = await hass.async_add_executor_job(
        _delete_background_file_sync, _background_dir(hass), filename
    )
    configs = await _remove_background_url_from_configs(hass, url)
    images = await hass.async_add_executor_job(
        _list_background_files_sync, _background_dir(hass)
    )
    connection.send_result(
        msg["id"],
        {
            "deleted": deleted,
            "images": [*_list_builtin_background_files_sync(), *images],
            **configs,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/overlay_shown",
        vol.Optional("entry_id"): str,
        vol.Optional("client_id"): str,
    }
)
@websocket_api.async_response
async def websocket_overlay_shown(hass: HomeAssistant, connection, msg) -> None:
    """Tell backend the overlay is visible."""
    runtime = _runtime_for_msg(hass, msg)
    if runtime:
        entries = [
            _entry_payload(entry)
            for entry in hass.config_entries.async_entries(DOMAIN)
            if not entry.disabled_by
        ]
        browser_data = await async_load_browser_data(hass)
        config = (
            build_effective_config(
                entries[0],
                browser_data,
                msg.get("client_id"),
                include_device_config=True,
            )
            if entries
            else None
        )
        config = _normalize_effective_lists(config)
        if config is not None:
            await runtime.async_overlay_shown(msg.get("client_id"), config)
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/overlay_hidden",
        vol.Optional("entry_id"): str,
        vol.Optional("client_id"): str,
    }
)
@websocket_api.async_response
async def websocket_overlay_hidden(hass: HomeAssistant, connection, msg) -> None:
    """Tell backend the overlay is hidden."""
    runtime = _runtime_for_msg(hass, msg)
    if runtime:
        await runtime.async_overlay_hidden(msg.get("client_id"))
    connection.send_result(msg["id"], {"ok": True})
