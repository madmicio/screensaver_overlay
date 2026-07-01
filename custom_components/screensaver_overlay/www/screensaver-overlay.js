const OVERLAY_ID = "screensaver-overlay";
const DEFAULT_IDLE_TIMEOUT = 60;
const DEFAULT_INFO_TEXT_SIZE = 2;
const DEFAULT_INFO_ITEMS_LIMIT = 5;
const DEFAULT_WEATHER_ICON_SIZE = 27;
const DEFAULT_WEATHER_DESCRIPTION_TEXT_SIZE = 1.8;
const ASSET_BASE = "/screensaver_overlay";

if (!window.__screensaverOverlayComponentInstalled) {
  window.__screensaverOverlayComponentInstalled = true;

  let overlay = null;
  let content = null;
  let idleTimer = undefined;
  let clockTimer = undefined;
  let eventTimer = undefined;
  let infoTimer = undefined;
  let pageAllowedCheckTimer = undefined;
  let stateRenderTimer = undefined;
  let stateChangedUnsub = undefined;
  let forecastUnsub = undefined;
  let config = null;
  let events = [];
  let hourlyForecast = [];
  let isVisible = false;
  let showSensorValues = false;

  const getHass = () => document.querySelector("home-assistant")?.hass;

  const waitForHass = () =>
    new Promise((resolve) => {
      const existingHass = getHass();
      if (existingHass) {
        resolve(existingHass);
        return;
      }

      let attempts = 0;
      const timer = window.setInterval(() => {
        const hass = getHass();
        attempts += 1;

        if (hass || attempts > 120) {
          window.clearInterval(timer);
          resolve(hass || null);
        }
      }, 500);
    });

  const html = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getConfig = async () => {
    const hass = getHass();
    if (!hass) {
      return null;
    }

    try {
      const result = await hass.connection.sendMessagePromise({
        type: "screensaver_overlay/get_config",
      });
      config = result.config;
      return config;
    } catch (err) {
      console.warn("screensaver-overlay failed to load config", err);
      return null;
    }
  };

  const notifyBackend = async (type) => {
    const hass = getHass();
    if (!hass || !config?.entry_id) {
      return;
    }

    try {
      await hass.connection.sendMessagePromise({
        type,
        entry_id: config.entry_id,
      });
    } catch (err) {
      console.warn(`screensaver-overlay failed to send ${type}`, err);
    }
  };

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date, language) =>
    date.toLocaleDateString(language || "en-US", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });

  const getWeatherEntity = () => config?.weather_entity || config?.entity;

  const getValueEntities = () => config?.value_entities || config?.value_entity || [];

  const isBlockVisible = (key) => config?.[key] !== false;

  const normalizePath = (path) => {
    if (!path) {
      return "";
    }

    const withoutQuery = String(path).split(/[?#]/, 1)[0].trim();
    const withSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
    return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
  };

  const parseAllowedDashboardPaths = () => {
    const raw = config?.allowed_dashboard_paths;

    if (Array.isArray(raw)) {
      return raw.map(normalizePath).filter(Boolean);
    }
    if (typeof raw !== "string") {
      return [];
    }

    return raw
      .split(/[\n,]+/)
      .map(normalizePath)
      .filter(Boolean);
  };

  const getDashboardPaths = () => {
    const hass = getHass();

    return Object.entries(hass?.panels || {})
      .filter(([, panel]) => panel?.component_name === "lovelace")
      .map(([path]) => normalizePath(path))
      .filter(Boolean);
  };

  const pathMatches = (currentPath, dashboardPath) =>
    currentPath === dashboardPath || currentPath.startsWith(`${dashboardPath}/`);

  const isCurrentPageAllowed = () => {
    if (!config?.limit_to_dashboards) {
      return true;
    }

    const currentPath = normalizePath(window.location.pathname);
    const allowedPaths = parseAllowedDashboardPaths();
    const dashboardPaths = allowedPaths.length ? allowedPaths : getDashboardPaths();

    return dashboardPaths.some((dashboardPath) => pathMatches(currentPath, dashboardPath));
  };

  const getWeatherDescriptionTextSize = () => {
    const size = Number(config?.weather_description_text_size);
    return Number.isFinite(size) && size > 0
      ? size
      : DEFAULT_WEATHER_DESCRIPTION_TEXT_SIZE;
  };

  const getWeatherIconSize = () => {
    const size = Number(config?.weather_icon_size);
    return Number.isFinite(size) && size > 0 ? size : DEFAULT_WEATHER_ICON_SIZE;
  };

  const getInfoTextSize = () => {
    const size = Number(config?.info_text_size);
    return Number.isFinite(size) && size > 0 ? size : DEFAULT_INFO_TEXT_SIZE;
  };

  const getInfoItemsLimit = () => {
    const limit = Number(config?.info_items_limit ?? config?.number_calendar_events);
    return Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : DEFAULT_INFO_ITEMS_LIMIT;
  };

  const getInfoStyle = () => {
    const primary = getInfoTextSize();
    const secondary = Math.max(0.8, primary * 0.85);
    return `--screensaver-info-font-size:${primary}vh;--screensaver-info-secondary-font-size:${secondary}vh;`;
  };

  const formatDateTime = (dateInput) => {
    const value = typeof dateInput === "object" ? dateInput?.dateTime || dateInput?.date : dateInput;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return `${date.toLocaleDateString()} ${formatTime(date)}`;
  };

  const formatTemperature = (value) => {
    const numeric = Number.parseFloat(String(value ?? "").replace(",", "."));
    return Number.isFinite(numeric) ? numeric.toFixed(1) : String(value ?? "");
  };

  const isStateOn = (stateObj) => {
    if (!stateObj?.state) {
      return false;
    }

    const state = String(stateObj.state).toLowerCase();
    const numericState = Number(state);
    const activeStringStates = [
      "on",
      "open",
      "opening",
      "closing",
      "cleaning",
      "true",
      "idle",
      "home",
      "playing",
      "paused",
      "locked",
      "occupied",
      "available",
      "running",
      "active",
      "connected",
      "online",
      "mowing",
      "starting",
      "heat",
      "cool",
      "dry",
      "heat_cool",
      "fan_only",
      "auto",
      "alarm",
    ];

    return activeStringStates.includes(state) || numericState > 0;
  };

  const defaultIcons = {
    alarm_control_panel: "mdi:shield",
    alert: "mdi:alert",
    automation: "mdi:playlist-play",
    calendar: "mdi:calendar",
    camera: "mdi:video",
    climate: "mdi:thermostat",
    device_tracker: "mdi:account",
    fan: "mdi:fan",
    light: "mdi:lightbulb",
    lock: "mdi:lock",
    media_player: "mdi:speaker",
    person: "mdi:account",
    plant: "mdi:flower",
    remote: "mdi:remote",
    scene: "mdi:palette",
    script: "mdi:file-document",
    switch: "mdi:flash",
    timer: "mdi:timer",
    vacuum: "mdi:robot-vacuum",
    weather: "mdi:white-balance-sunny",
    sun: "mdi:white-balance-sunny",
  };

  const binarySensorIcon = (deviceClass) => {
    switch (deviceClass) {
      case "battery":
        return "mdi:battery-outline";
      case "motion":
        return "mdi:motion-sensor";
      case "door":
        return "mdi:door-open";
      case "garage_door":
        return "mdi:garage-open";
      default:
        return "mdi:checkbox-marked-circle";
    }
  };

  const coverIcon = (deviceClass) => {
    switch (deviceClass) {
      case "awning":
        return "mdi:awning-outline";
      case "blind":
        return "mdi:blinds-open";
      case "curtain":
        return "mdi:curtains-open";
      case "damper":
        return "mdi:window-shutter-open";
      case "door":
        return "mdi:door-open";
      case "garage":
        return "mdi:garage-open";
      case "gate":
        return "mdi:gate-open";
      case "shade":
        return "mdi:roller-shade";
      case "shutter":
        return "mdi:window-shutter-open";
      case "window":
        return "mdi:window-open";
      default:
        return "mdi:window-shutter-open";
    }
  };

  const sensorIcon = (deviceClass, state) => {
    const value = Number(state) || 0;

    switch (deviceClass) {
      case "battery":
        if (value >= 90) return "mdi:battery";
        if (value >= 80) return "mdi:battery-90";
        if (value >= 70) return "mdi:battery-80";
        if (value >= 60) return "mdi:battery-70";
        if (value >= 50) return "mdi:battery-60";
        if (value >= 40) return "mdi:battery-50";
        if (value >= 30) return "mdi:battery-40";
        if (value >= 20) return "mdi:battery-30";
        if (value >= 10) return "mdi:battery-20";
        return "mdi:battery-alert";
      case "humidity":
        return "mdi:water-percent";
      case "temperature":
        return "mdi:thermometer";
      default:
        return "mdi:eye";
    }
  };

  const normalizeStatusIconEntities = () => {
    const rawEntities = [
      ...(config?.status_icon_entities || []),
      ...(config?.entity_icon || []),
    ];

    return rawEntities
      .map((item) => {
        if (typeof item === "string") {
          return { entity: item, icon: undefined };
        }
        return { entity: item?.entity, icon: item?.icon };
      })
      .filter((item) => item.entity);
  };

  const getStatusIcon = (entityId, state, customIcon) => {
    if (customIcon) {
      return customIcon;
    }

    const domain = entityId.split(".", 1)[0];
    const deviceClass = state.attributes?.device_class;

    if (domain === "cover") {
      return coverIcon(deviceClass);
    }
    if (domain === "binary_sensor") {
      return binarySensorIcon(deviceClass);
    }
    if (domain === "sensor") {
      return sensorIcon(deviceClass, state.state);
    }

    return defaultIcons[domain] || state.attributes?.icon || "mdi:eye";
  };

  const fetchCalendarEvents = async () => {
    const hass = getHass();
    const calendars = config?.calendars || [];
    if (!hass || !calendars.length) {
      events = [];
      return;
    }

    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 7);

    const results = await Promise.allSettled(
      calendars.map((calendar) =>
        hass.callApi(
          "GET",
          `calendars/${calendar}?start=${start.toISOString()}&end=${end.toISOString()}`
        )
      )
    );
    const seen = new Set();
    events = results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter((event) => {
        const key = `${event.summary}-${event.start?.dateTime || event.start?.date}`;
        if (event.summary === "cg_alert" || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, getInfoItemsLimit());
  };

  const getWeatherIcon = (hass, condition) => {
    if (!condition) {
      return "";
    }

    if (condition === "partlycloudy") {
      return hass.states["sun.sun"]?.state === "above_horizon"
        ? "partlycloudy"
        : "partlycloudy-night";
    }

    if (config?.rain_sensor && hass.states[config.rain_sensor]?.state === "raining") {
      return "raining";
    }

    return condition;
  };

  const weatherIconsDay = {
    clear: "day",
    "clear-night": "night",
    cloudy: "cloudy",
    fog: "fog",
    hail: "hail",
    lightning: "lightning",
    "lightning-rainy": "lightning-rainy",
    partlycloudy: "partlycloudy",
    pouring: "pouring",
    rainy: "rainy",
    snowy: "snowy",
    "snowy-rainy": "snowy-rainy",
    sunny: "day",
    windy: "windy",
    "windy-variant": "windy-variant",
    exceptional: "!!",
  };

  const subscribeHourlyForecast = async () => {
    const hass = getHass();
    const weatherEntity = getWeatherEntity();

    if (!hass?.connection || forecastUnsub !== undefined || !weatherEntity) {
      return;
    }

    try {
      forecastUnsub = await hass.connection.subscribeMessage(
        (event) => {
          hourlyForecast = event?.forecast || [];
          scheduleStateRender(false);
        },
        {
          type: "weather/subscribe_forecast",
          forecast_type: "hourly",
          entity_id: weatherEntity,
        }
      );
    } catch (err) {
      hourlyForecast = [];
      console.warn("screensaver-overlay failed to subscribe to hourly forecast", err);
    }
  };

  const unsubscribeHourlyForecast = () => {
    if (forecastUnsub !== undefined) {
      forecastUnsub();
      forecastUnsub = undefined;
    }
    hourlyForecast = [];
  };

  const renderValues = (hass) =>
    `<div id="entityState" class="icon-state-div-class">${getValueEntities()
      .slice(0, getInfoItemsLimit())
      .map((entityId) => {
        const state = hass.states[entityId];
        if (!state) {
          return "";
        }

        return `
          <div class="entity">
            <span class="friendly-name">${html(state.attributes.friendly_name || entityId)}</span>
            <div class="value">
              <span class="state">${html(formatTemperature(state.state))}</span>
              <span class="unit">${html(state.attributes.unit_of_measurement || "")}</span>
            </div>
          </div>
        `;
      })
      .join("")}</div>`;

  const renderStatusIcons = (hass) =>
    normalizeStatusIconEntities()
      .map(({ entity, icon }) => {
        const state = hass.states[entity];
        if (!isStateOn(state)) {
          return "";
        }

        const statusIcon = getStatusIcon(entity, state, icon);

        return `<ha-icon icon="${html(statusIcon)}" title="${html(
          state.attributes.friendly_name || entity
        )}"></ha-icon>`;
      })
      .join("");

  const renderWeatherDescription = (hass) => {
    const entityId = config?.weather_description_entity;
    const state = entityId ? hass.states[entityId] : null;

    if (!state || ["unknown", "unavailable"].includes(state.state)) {
      return "";
    }

    return html(state.state);
  };

  const renderEvents = () =>
    `<div class="events">${
      events.length
        ? events
            .map(
              (event) => `
                <div class="event">
                  <div class="event-title">${html(event.summary)}</div>
                  <div class="event-time">${html(formatDateTime(event.start))} - ${html(
                formatDateTime(event.end)
              )}</div>
                </div>
              `
            )
            .join("")
        : `<div class="no-events">No events</div>`
    }</div>`;

  const renderForecastTimeline = (hass) => {
    if (!isBlockVisible("show_hourly_forecast")) {
      return "";
    }

    const weatherState = hass.states[getWeatherEntity()];
    const temperatureUnit = weatherState?.attributes?.temperature_unit || "";
    let previousCondition = "";

    if (!hourlyForecast.length) {
      return "";
    }

    return `
      <div class="forecast">
        <div class="gradient-bar"></div>
        <div class="timeline">
          ${hourlyForecast
            .slice(0, 16)
            .map((forecast) => {
              const showCondition = forecast.condition !== previousCondition;
              previousCondition = forecast.condition;
              const icon = weatherIconsDay[forecast.condition] || "unknown";
              const iconUrl = `${ASSET_BASE}/weather_icons/${html(icon)}.svg`;
              const temperature = Number(forecast.temperature);
              const temperatureClass =
                temperatureUnit === "°C"
                  ? temperature < 10
                    ? "cold"
                    : temperature > 25
                      ? "hot"
                      : ""
                  : temperatureUnit === "°F"
                    ? temperature < 50
                      ? "cold"
                      : temperature > 77
                        ? "hot"
                        : ""
                    : "";

              return `
                <div class="timeline-item">
                  ${
                    showCondition
                      ? `<div class="condition"><img src="${iconUrl}" alt="${html(
                          forecast.condition
                        )}" /></div>`
                      : `<div class="condition"></div>`
                  }
                  <div class="details">
                    <div class="hour">${html(
                      new Date(forecast.datetime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    )}</div>
                    <div class="temperature ${temperatureClass}">${html(
                      forecast.temperature
                    )}${html(temperatureUnit)}</div>
                    ${
                      forecast.precipitation
                        ? `<div class="precipitation">${html(forecast.precipitation)} ${
                            weatherState?.attributes?.precipitation_unit || ""
                          }</div>`
                        : ""
                    }
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  };

  const renderTemperatures = (externalTemperature, internalState) => {
    const externalValue = formatTemperature(externalTemperature);

    if (!internalState) {
      return `<div class="ext-temp">${html(externalValue)}°</div>`;
    }

    const internalValue = formatTemperature(internalState.state);

    return `
      <svg
        class="temperature-svg"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        viewBox="0 0 1152.78 354.73"
        xml:space="preserve"
        aria-label="${html(externalValue)} degrees external, ${html(internalValue)} degrees internal"
      >
        <g>
          <path
            class="temperature-home"
            d="M1134.59,158.27c1.24,1.14,1.56,2.51,0.97,4.07c-0.56,1.48-2.01,2.44-3.59,2.44h-29.34
  c-16.57,0-30,13.43-30,30v24.55c0,4.16,3.37,7.52,7.52,7.52l0,0c4.16,0,7.52-3.37,7.52-7.52v-24.55c0-8.25,6.69-14.94,14.94-14.94
  h29.43c17.14,0,25.35-21.04,12.74-32.65L853.18,8.75c-3.6-3.31-8.16-4.96-12.73-4.96c-4.57,0-9.14,1.65-12.74,4.97L555.94,147.19
  c-12.6,11.61-4.39,32.65,12.74,32.65h33.18c8.25,0,14.94,6.69,14.94,14.94v138.86c0,8.47,8.83,15.24,17.26,15.24h69.4
  c4.16,0,7.52-3.37,7.52-7.52l0,0c0-4.16-3.37-7.52-7.52-7.52h-69.4c-0.68,0-1.7-0.52-2.21-0.99V194.78c0-16.57-13.43-30-30-30
  h-33.09c-1.59,0-3.04-0.96-3.6-2.44c-0.59-1.56-0.25-2.93,0.98-4.07L837.9,19.83c0.89-0.82,1.88-0.99,2.55-0.99
  c0.67,0,1.65,0.17,2.54,0.99"
          />
        </g>
        <text x="0.1313" y="290.461" class="temperature-text">${html(externalValue)}°</text>
        <text x="660.559" y="290.461" class="temperature-text">${html(internalValue)}°</text>
      </svg>
    `;
  };

  const shouldAlternateInfo = () =>
    getValueEntities().length > 0 && (config?.calendars || []).length > 0;

  const renderInfoContent = (hass) => {
    if (getValueEntities().length && (!config?.calendars?.length || showSensorValues)) {
      return renderValues(hass);
    }

    return renderEvents();
  };

  const updateInfo = () => {
    const hass = getHass();
    const infoElement = content?.querySelector(".info");

    if (!hass || !config || !infoElement) {
      return;
    }

    infoElement.innerHTML = renderInfoContent(hass);
  };

  const getWatchedEntities = () => {
    const entities = new Set(
      [
        getWeatherEntity(),
        config?.weather_description_entity,
        config?.internal_temperature,
        config?.external_temperature,
        config?.rain_sensor,
        "sun.sun",
        ...getValueEntities(),
        ...normalizeStatusIconEntities().map((item) => item.entity),
        ...(config?.calendars || []),
      ].filter(Boolean)
    );

    return entities;
  };

  const getClockParts = () => {
    const hass = getHass();
    const now = new Date();
    const language = hass?.locale?.language || "en-US";
    const dayName = now.toLocaleDateString(language, { weekday: "short" });
    const day = now.toLocaleDateString(language, { day: "2-digit" });
    const month = now.toLocaleDateString(language, { month: "2-digit" });
    const year = now.toLocaleDateString(language, { year: "2-digit" });

    return {
      time: formatTime(now),
      date: formatDate(now, language).replaceAll("/", " : "),
      dateParts: [dayName, ":", day, ":", month, ":", year],
    };
  };

  const updateClock = () => {
    if (!content) {
      return;
    }

    const { time, date, dateParts } = getClockParts();
    const timeElement = content.querySelector(".time-value, .fallback-time");
    const dateElement = content.querySelector(".date, .fallback-date");

    if (timeElement) {
      timeElement.textContent = time;
    }
    if (dateElement?.classList.contains("date")) {
      dateElement.innerHTML = dateParts.map((part) => `<div>${html(part)}</div>`).join("");
    } else if (dateElement) {
      dateElement.textContent = date;
    }
  };

  const scheduleStateRender = (refreshCalendarEvents = false) => {
    if (stateRenderTimer !== undefined) {
      window.clearTimeout(stateRenderTimer);
    }

    stateRenderTimer = window.setTimeout(async () => {
      stateRenderTimer = undefined;
      if (!isVisible) {
        return;
      }

      if (refreshCalendarEvents) {
        await fetchCalendarEvents();
      }
      render();
      updateClock();
    }, 250);
  };

  const startStateSubscription = async () => {
    const hass = getHass();
    if (!hass?.connection || stateChangedUnsub !== undefined) {
      return;
    }

    try {
      stateChangedUnsub = await hass.connection.subscribeEvents((event) => {
        const entityId = event?.data?.entity_id;
        if (!entityId || !getWatchedEntities().has(entityId)) {
          return;
        }

        scheduleStateRender((config?.calendars || []).includes(entityId));
      }, "state_changed");
    } catch (err) {
      console.warn("screensaver-overlay failed to subscribe to state changes", err);
    }
  };

  const stopStateSubscription = () => {
    if (stateRenderTimer !== undefined) {
      window.clearTimeout(stateRenderTimer);
      stateRenderTimer = undefined;
    }
    if (stateChangedUnsub !== undefined) {
      stateChangedUnsub();
      stateChangedUnsub = undefined;
    }
  };

  const render = () => {
    if (!content) {
      return;
    }

    const hass = getHass();
    const { time, date, dateParts } = getClockParts();

    if (!hass || !config) {
      content.innerHTML = `
        <div class="fallback">
          <div class="fallback-time">${html(time)}</div>
          <div class="fallback-date">${html(date)}</div>
        </div>
      `;
      return;
    }

    const weatherState = hass.states[getWeatherEntity()];
    const weatherIcon = getWeatherIcon(hass, weatherState?.state);
    const externalState = config.external_temperature
      ? hass.states[config.external_temperature]
      : null;
    const internalState = config.internal_temperature
      ? hass.states[config.internal_temperature]
      : null;
    const externalTemperature =
      externalState?.state ?? weatherState?.attributes?.temperature ?? "";

    content.innerHTML = `
      <div class="screen">
        ${
          isBlockVisible("show_status_icons")
            ? `<div class="status-icons">${renderStatusIcons(hass)}</div>`
            : ""
        }
        <div
          class="weather-description"
          style="--screensaver-weather-description-font-size:${getWeatherDescriptionTextSize()}vh;"
        >${renderWeatherDescription(hass)}</div>
        ${
          isBlockVisible("show_weather_icon")
            ? `<div class="weather-icon" style="--screensaver-weather-icon-size:${getWeatherIconSize()}vw;">
                ${
                  weatherIcon
                    ? `<img src="${ASSET_BASE}/weather_icons/now_icon/${html(weatherIcon)}.svg" />`
                    : ""
                }
              </div>`
            : ""
        }
        ${
          isBlockVisible("show_temperatures")
            ? `<div class="temperatures">
                ${renderTemperatures(externalTemperature, internalState)}
              </div>`
            : ""
        }
        ${
          isBlockVisible("show_clock")
            ? `<div class="clock">
                <div class="time">
                  <span class="time-value">${html(time)}</span>
                  <div class="date">${dateParts.map((part) => `<div>${html(part)}</div>`).join("")}</div>
                </div>
              </div>`
            : ""
        }
        ${
          isBlockVisible("show_info")
            ? `<div class="info" style="${getInfoStyle()}">
                ${renderInfoContent(hass)}
              </div>`
            : ""
        }
        ${renderForecastTimeline(hass)}
          </div>
    `;
  };

  const stopVisibleTimers = () => {
    if (clockTimer !== undefined) {
      window.clearInterval(clockTimer);
      clockTimer = undefined;
    }
    if (eventTimer !== undefined) {
      window.clearInterval(eventTimer);
      eventTimer = undefined;
    }
    if (infoTimer !== undefined) {
      window.clearInterval(infoTimer);
      infoTimer = undefined;
    }
  };

  const startVisibleTimers = async () => {
    await fetchCalendarEvents();
    showSensorValues = false;
    if (isBlockVisible("show_hourly_forecast")) {
      await subscribeHourlyForecast();
    }
    render();
    updateClock();
    await startStateSubscription();

    if (clockTimer === undefined && isBlockVisible("show_clock")) {
      clockTimer = window.setInterval(updateClock, 1000);
    }
    if (eventTimer === undefined && isBlockVisible("show_info")) {
      eventTimer = window.setInterval(async () => {
        await fetchCalendarEvents();
        render();
        updateClock();
      }, 5 * 60 * 1000);
    }
    if (infoTimer === undefined && isBlockVisible("show_info") && shouldAlternateInfo()) {
      infoTimer = window.setInterval(() => {
        showSensorValues = !showSensorValues;
        updateInfo();
      }, 7000);
    }
  };

  const showOverlay = async () => {
    if (!overlay || isVisible) {
      return;
    }

    config = (await getConfig()) || config;
    if (!isCurrentPageAllowed()) {
      stopIdleTimer();
      schedulePageAllowedCheck();
      return;
    }

    isVisible = true;
    overlay.style.opacity = "1";
    overlay.style.visibility = "visible";
    overlay.style.pointerEvents = "auto";
    overlay.setAttribute("aria-hidden", "false");
    await notifyBackend("screensaver_overlay/overlay_shown");
    await startVisibleTimers();
  };

  const hideOverlay = async () => {
    if (!overlay || !isVisible) {
      return;
    }

    isVisible = false;
    overlay.style.opacity = "0";
    overlay.style.visibility = "hidden";
    overlay.style.pointerEvents = "none";
    overlay.setAttribute("aria-hidden", "true");
    stopVisibleTimers();
    stopStateSubscription();
    unsubscribeHourlyForecast();
    await notifyBackend("screensaver_overlay/overlay_hidden");
  };

  const stopPageAllowedCheck = () => {
    if (pageAllowedCheckTimer !== undefined) {
      window.clearTimeout(pageAllowedCheckTimer);
      pageAllowedCheckTimer = undefined;
    }
  };

  const schedulePageAllowedCheck = () => {
    if (pageAllowedCheckTimer !== undefined) {
      return;
    }

    pageAllowedCheckTimer = window.setTimeout(async () => {
      pageAllowedCheckTimer = undefined;
      config = (await getConfig()) || config;

      if (isCurrentPageAllowed()) {
        resetIdleTimer();
        return;
      }

      schedulePageAllowedCheck();
    }, 10000);
  };

  const resetIdleTimer = () => {
    if (idleTimer !== undefined) {
      window.clearTimeout(idleTimer);
      idleTimer = undefined;
    }

    if (!isCurrentPageAllowed()) {
      schedulePageAllowedCheck();
      return;
    }

    stopPageAllowedCheck();
    const timeout = Number(config?.overlay_idle_timeout || DEFAULT_IDLE_TIMEOUT) * 1000;
    console.debug("screensaver-overlay idle timer set", timeout);
    idleTimer = window.setTimeout(showOverlay, timeout);
  };

  const handleInput = () => {
    if (isVisible) {
      hideOverlay();
    }
    resetIdleTimer();
  };

  const refreshConfig = async () => {
    config = (await getConfig()) || config;
    resetIdleTimer();
    return config;
  };

  const stopIdleTimer = () => {
    if (idleTimer !== undefined) {
      window.clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  };

  const handleLocationChanged = () => {
    if (!isCurrentPageAllowed()) {
      stopIdleTimer();
      schedulePageAllowedCheck();
      if (isVisible) {
        hideOverlay();
      }
      return;
    }

    resetIdleTimer();
  };

  const installLocationWatcher = () => {
    if (window.__screensaverOverlayLocationWatcherInstalled) {
      return;
    }
    window.__screensaverOverlayLocationWatcherInstalled = true;

    const dispatchLocationChanged = () => {
      window.dispatchEvent(new Event("screensaver-overlay-location-changed"));
    };
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args);
      dispatchLocationChanged();
      return result;
    };
    history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      dispatchLocationChanged();
      return result;
    };
    window.addEventListener("popstate", dispatchLocationChanged);
  };

  const createOverlay = () => {
    overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      content = overlay.querySelector(".screensaver-overlay-content");
      return;
    }

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <style>
        @font-face {
          font-family: 'bw_font';
          src: url('${ASSET_BASE}/BwModelica-HairlineExpanded.otf') format('truetype');
        }
        #${OVERLAY_ID} {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: black;
          color: white;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.6s ease;
          overflow: hidden;
          user-select: none;
          font-family: 'bw_font', var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        }
        #${OVERLAY_ID} .screensaver-overlay-content,
        #${OVERLAY_ID} .screen {
          width: 100%;
          height: 100%;
        }
        #${OVERLAY_ID} .screen {
          box-sizing: border-box;
          display: grid;
          grid-template-areas:
            ". icon icon now_icon alert"
            ". . . temp ."
            ". date . cal-event ."
            "tline tline tline tline tline";
          grid-template-columns: 7vw auto auto auto 1vw;
          grid-template-rows: auto auto 1fr auto;
          padding-top: 1vw;
          background: black;
        }
        #${OVERLAY_ID} .status-icons {
          grid-area: icon;
          margin-top: 4vh;
        }
        #${OVERLAY_ID} .weather-description {
          grid-area: icon;
          align-self: start;
          justify-self: start;
          margin-top: 9vh;
          max-width: 44vw;
          color: white;
          font-family: 'bw_font', monospace;
          font-size: var(--screensaver-weather-description-font-size, 1.8vh);
          font-weight: 700;
          line-height: 1.65;
          white-space: pre-wrap;
        }
        #${OVERLAY_ID} ha-icon {
          --mdc-icon-size: 4.5vh;
          color: #757575;
          margin: 0 8px;
        }
        #${OVERLAY_ID} .weather-icon {
          grid-area: now_icon;
          justify-self: end;
          width: var(--screensaver-weather-icon-size, 27vw);
          height: 100%;
        }
        #${OVERLAY_ID} .weather-icon img {
          width: 100%;
          height: auto;
        }
        #${OVERLAY_ID} .temperatures {
          grid-area: temp;
          justify-self: end;
          color: #757575;
        }
        #${OVERLAY_ID} .temperature-svg {
          display: block;
          height: 7vh;
          width: auto;
          overflow: visible;
        }
        #${OVERLAY_ID} .temperature-home,
        #${OVERLAY_ID} .temperature-text {
          fill: #757575;
        }
        #${OVERLAY_ID} .temperature-text {
          font-family: 'bw_font', var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
          font-size: 165px;
          font-weight: 700;
        }
        #${OVERLAY_ID} .ext-temp {
          font-family: 'bw_font', monospace;
          font-size: 4vh;
          font-weight: 700;
          color: #757575;
          text-align: right;
        }
        #${OVERLAY_ID} .clock {
          grid-area: date;
          font-family: 'bw_font', monospace;
          color: white;
          align-self: end;
          justify-self: start;
        }
        #${OVERLAY_ID} .time,
        #${OVERLAY_ID} .date {
          text-align: center;
          font-family: 'bw_font', monospace;
          line-height: 1;
        }
        #${OVERLAY_ID} .time {
          font-size: 13vw;
          white-space: nowrap;
        }
        #${OVERLAY_ID} .date {
          font-size: 4.5vw;
          display: flex;
          justify-content: space-between;
        }
        #${OVERLAY_ID} .info {
          grid-area: cal-event;
          align-self: end;
          justify-self: end;
          text-align: right;
          line-height: 1;
        }
        #${OVERLAY_ID} #entityState {
          display: flex;
          flex-direction: column;
          justify-content: end;
          line-height: 1;
        }
        #${OVERLAY_ID} .entity {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          margin-top: 1vh;
        }
        #${OVERLAY_ID} .friendly-name {
          display: flex;
          justify-content: flex-end;
          color: #757575;
          font-size: var(--screensaver-info-secondary-font-size, 1.7vh);
        }
        #${OVERLAY_ID} .value {
          display: flex;
          color: white;
          font-size: var(--screensaver-info-font-size, 2vh);
          margin-top: 0.5vh;
        }
        #${OVERLAY_ID} .state {
          margin-left: auto;
          margin-right: 4px;
        }
        #${OVERLAY_ID} .unit {
          color: #757575;
          font-style: italic;
        }
        #${OVERLAY_ID} .events {
          display: flex;
          flex-direction: column;
          justify-content: end;
          color: white;
          line-height: 1;
        }
        #${OVERLAY_ID} .event {
          margin-bottom: 10px;
          text-align: right;
          color: white;
        }
        #${OVERLAY_ID} .event-title {
          text-align: right;
          margin-top: 1vh;
          color: white;
          font-size: var(--screensaver-info-font-size, 2vh);
        }
        #${OVERLAY_ID} .event-time {
          color: #757575;
          text-align: right;
          font-size: var(--screensaver-info-secondary-font-size, 1.7vh);
        }
        #${OVERLAY_ID} .no-events {
          color: #999;
          font-style: italic;
          text-align: right;
        }
        #${OVERLAY_ID} .forecast {
          grid-area: tline;
          margin-top: 7vh;
        }
        #${OVERLAY_ID} .gradient-bar {
          width: 100%;
          height: 2px;
          background: linear-gradient(
            to right,
            black,
            rgba(255, 255, 255, 0.3),
            black
          );
          position: relative;
          top: 42px;
        }
        #${OVERLAY_ID} .timeline {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          overflow-x: auto;
          justify-content: space-between;
          height: auto;
        }
        #${OVERLAY_ID} .timeline-item {
          flex: 0 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: -webkit-fill-available;
        }
        #${OVERLAY_ID} .condition {
          height: 50px;
        }
        #${OVERLAY_ID} .condition img {
          width: 40px;
          height: 40px;
        }
        #${OVERLAY_ID} .details {
          font-size: 0.9em;
          color: #757575;
        }
        #${OVERLAY_ID} .details .hour {
          font-weight: bold;
        }
        #${OVERLAY_ID} .details .temperature {
          color: #ff5722;
        }
        #${OVERLAY_ID} .details .temperature.cold {
          color: #2196f3;
        }
        #${OVERLAY_ID} .details .temperature.hot {
          color: #f44336;
        }
        #${OVERLAY_ID} .details .precipitation {
          color: #9e9e9e;
          font-size: 0.8em;
        }
        #${OVERLAY_ID} .fallback {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        #${OVERLAY_ID} .fallback-time {
          font-size: clamp(72px, 18vw, 220px);
        }
        #${OVERLAY_ID} .fallback-date {
          color: #bdbdbd;
          font-size: clamp(22px, 4vw, 56px);
        }
      </style>
      <div class="screensaver-overlay-content"></div>
    `;
    content = overlay.querySelector(".screensaver-overlay-content");
    document.body.appendChild(overlay);
  };

  const bootstrap = async () => {
    createOverlay();
    installLocationWatcher();
    await waitForHass();
    config = await getConfig();
    resetIdleTimer();
    console.debug("screensaver-overlay installed", { hasConfig: !!config, config });
    window.__screensaverOverlayComponentShow = showOverlay;
    window.__screensaverOverlayComponentHide = hideOverlay;
    window.__screensaverOverlayComponentRefreshConfig = refreshConfig;
    window.__screensaverOverlayComponentDashboardPaths = getDashboardPaths;
    window.__screensaverOverlayComponentIsPageAllowed = isCurrentPageAllowed;

    window.addEventListener("pointerdown", handleInput, { passive: true });
    window.addEventListener("touchstart", handleInput, { passive: true });
    window.addEventListener("keydown", handleInput, { passive: true });
    window.addEventListener("wheel", handleInput, { passive: true });
    window.addEventListener("screensaver-overlay-location-changed", handleLocationChanged);
  };

  if (document.body) {
    bootstrap();
  } else {
    window.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  }
}
