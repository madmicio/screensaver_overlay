"""Binary sensors for Screensaver Overlay browser clients."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .browser_store import async_load_browser_data
from .const import DOMAIN, SIGNAL_BROWSER_CONFIG_UPDATED


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up browser-specific Screensaver Overlay binary sensors."""
    runtime = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if runtime is None:
        return

    entities: dict[str, ScreensaverClientActiveBinarySensor] = {}

    async def async_refresh_entities() -> None:
        browser_data = await async_load_browser_data(hass)
        clients = browser_data.get("clients", {})
        exposed_clients = {
            client_id: client
            for client_id, client in clients.items()
            if client.get("expose_binary_sensor", False)
        }

        new_entities = []
        for client_id, client in exposed_clients.items():
            entity = entities.get(client_id)
            if entity is None:
                entity = ScreensaverClientActiveBinarySensor(entry, runtime, client)
                entities[client_id] = entity
                new_entities.append(entity)
            else:
                entity.update_client(client)

        if new_entities:
            async_add_entities(new_entities)

        for client_id, entity in list(entities.items()):
            if client_id not in exposed_clients:
                entities.pop(client_id)
                await entity.async_remove()

    await async_refresh_entities()

    @callback
    def schedule_refresh_entities() -> None:
        hass.async_create_task(async_refresh_entities())

    entry.async_on_unload(
        async_dispatcher_connect(
            hass, SIGNAL_BROWSER_CONFIG_UPDATED, schedule_refresh_entities
        )
    )


class ScreensaverClientActiveBinarySensor(BinarySensorEntity):
    """Binary sensor that is on while one browser overlay is visible."""

    _attr_icon = "mdi:monitor-screenshot"

    def __init__(self, entry: ConfigEntry, runtime, client: dict) -> None:
        """Initialize the binary sensor."""
        self._entry = entry
        self._runtime = runtime
        self._unsubscribe: CALLBACK_TYPE | None = None
        self._client_id = str(client.get("id") or "")
        self._client_name = str(client.get("name") or self._client_id)
        self._attr_unique_id = f"{entry.entry_id}_{self._client_id}_screensaver_active"
        self._update_name()

    @callback
    def update_client(self, client: dict) -> None:
        """Update browser metadata from the registry."""
        self._client_name = str(client.get("name") or self._client_id)
        self._update_name()
        if self.hass is not None:
            self.async_write_ha_state()

    @callback
    def _update_name(self) -> None:
        """Update the entity display name."""
        self._attr_name = f"{self._client_name} Screensaver Active"

    @property
    def is_on(self) -> bool:
        """Return true when this browser overlay is visible."""
        return self._runtime.is_overlay_active(self._client_id)

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        """Return browser metadata for automation templates."""
        return {
            "client_id": self._client_id,
            "client_name": self._client_name,
        }

    async def async_added_to_hass(self) -> None:
        """Subscribe to runtime state changes."""
        self._unsubscribe = self._runtime.async_subscribe_state_changes(
            self._handle_runtime_state_change
        )

    async def async_will_remove_from_hass(self) -> None:
        """Unsubscribe from runtime state changes."""
        if self._unsubscribe is not None:
            self._unsubscribe()
            self._unsubscribe = None

    @callback
    def _handle_runtime_state_change(self) -> None:
        """Handle overlay runtime state changes."""
        self.async_write_ha_state()
