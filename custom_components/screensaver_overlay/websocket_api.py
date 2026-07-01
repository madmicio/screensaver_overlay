"""Websocket API for Screensaver Overlay."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN


@callback
def _entry_payload(entry) -> dict:
    """Return merged config entry data and options for the frontend."""
    return {
        "entry_id": entry.entry_id,
        **entry.data,
        **entry.options,
    }


@callback
def _runtime_for_msg(hass: HomeAssistant, msg: dict):
    """Return runtime for websocket message."""
    runtimes = hass.data.get(DOMAIN, {})
    entry_id = msg.get("entry_id")
    if entry_id:
        return runtimes.get(entry_id)
    return next(iter(runtimes.values()), None)


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register websocket commands."""
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_overlay_shown)
    websocket_api.async_register_command(hass, websocket_overlay_hidden)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/get_config",
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
    connection.send_result(msg["id"], {"entries": entries, "config": entries[0] if entries else None})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/overlay_shown",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.async_response
async def websocket_overlay_shown(hass: HomeAssistant, connection, msg) -> None:
    """Tell backend the overlay is visible."""
    runtime = _runtime_for_msg(hass, msg)
    if runtime:
        await runtime.async_overlay_shown()
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "screensaver_overlay/overlay_hidden",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.async_response
async def websocket_overlay_hidden(hass: HomeAssistant, connection, msg) -> None:
    """Tell backend the overlay is hidden."""
    runtime = _runtime_for_msg(hass, msg)
    if runtime:
        await runtime.async_overlay_hidden()
    connection.send_result(msg["id"], {"ok": True})
