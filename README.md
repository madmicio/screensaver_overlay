# Screensaver Overlay

Screensaver Overlay is a Home Assistant custom integration that registers a global fullscreen screensaver overlay in the frontend.

## Installation with HACS

1. Open HACS in Home Assistant.
2. Go to **Custom repositories**.
3. Add this repository URL:

   ```text
   https://github.com/madmicio/screensaver_overlay
   ```

4. Select category **Integration**.
5. Install **Screensaver Overlay**.
6. Restart Home Assistant.
7. Add the integration from **Settings > Devices & services > Add integration > Screensaver Overlay**.

## Manual Installation

Copy the integration directory to your Home Assistant configuration:

```text
custom_components/screensaver_overlay
```

The final path must be:

```text
config/custom_components/screensaver_overlay
```

Restart Home Assistant, then add the integration from **Settings > Devices & services**.

## Features

- Registers a global frontend module.
- Creates a fullscreen overlay on Home Assistant pages.
- Stores configuration through the integration config flow.
- Exposes websocket commands for the frontend overlay.
- Can control a screen switch while the overlay is visible.
- Supports weather, temperature, calendar, value, status icon and motion entities.
- Supports `cg_alert` calendar events as a discreet red-dot alert.
- Supports custom Material Design Icon overrides for status icons from the sidebar panel.
- Documents which features are enabled by each configured entity in the component README.

## HACS Publishing Checklist

- Repository must be public on GitHub.
- Repository must have a short GitHub description.
- Repository should have topics such as `home-assistant`, `hacs`, `integration`.
- GitHub Issues should be enabled.
- The HACS and Hassfest GitHub Actions should pass.
- Create a GitHub release, for example `v0.1.0`, after the actions pass.
