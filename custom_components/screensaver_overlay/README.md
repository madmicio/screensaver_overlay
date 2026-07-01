# Screensaver Overlay Custom Component

This is the first standalone Home Assistant integration for the global screensaver overlay.

## Install

Copy this directory to:

```text
config/custom_components/screensaver_overlay
```

Restart Home Assistant, then add the integration from:

```text
Settings > Devices & services > Add integration > Screensaver Overlay
```

## What It Does

- Registers a global frontend module.
- Creates a fullscreen overlay on every Home Assistant page.
- Reads configuration from the integration, not from a Lovelace card.
- Exposes websocket commands for the frontend.
- Runs screen switch control in the backend while the overlay is visible.

## Configurable Fields

- Weather entity
- Internal temperature sensor
- External temperature sensor
- Rain sensor
- Calendars
- Value entities
- Status icon entities
- Motion sensor
- Screen switch
- Overlay idle timeout
- Screen off timeout

## Current Limitations

- Status icon entities currently use each entity's own `icon` attribute or a default icon. Per-entity icon overrides can be added later.
- The frontend is a standalone MVP and does not yet reuse the old Lovelace card renderer.
- Forecast timeline parity with the old card is not implemented yet.
