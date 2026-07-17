const OVERLAY_ID = "screensaver-overlay";
const DEFAULT_IDLE_TIMEOUT = 60;
const DEFAULT_INFO_TEXT_SIZE = 2;
const DEFAULT_INFO_ITEMS_LIMIT = 5;
const DEFAULT_WEATHER_ICON_SIZE = 27;
const DEFAULT_WEATHER_DESCRIPTION_TEXT_SIZE = 1.8;
const DEFAULT_BACKGROUND_CAROUSEL_INTERVAL = 60;
const DEFAULT_HOURLY_FORECAST_BACKGROUND_OPACITY = 70;
const BURN_IN_PADDING_TOTAL = 60;
const BURN_IN_PADDING_MAX = 30;
const BURN_IN_PADDING_STEP = 5;
const BURN_IN_INTERVAL = 30000;
const CLIENT_ID_STORAGE_KEY = "screensaver-overlay-client-id";
const OVERLAY_ACTIVE_STORAGE_PREFIX = "screensaver-overlay-active";
const ASSET_BASE = "/screensaver_overlay";

if (!window.__screensaverOverlayComponentInstalled) {
  window.__screensaverOverlayComponentInstalled = true;

  let overlay = null;
  let content = null;
  let idleTimer = undefined;
  let clockTimer = undefined;
  let eventTimer = undefined;
  let infoTimer = undefined;
  let backgroundTimer = undefined;
  let burnInTimer = undefined;
  let pageAllowedCheckTimer = undefined;
  let stateRenderTimer = undefined;
  let stateChangedUnsub = undefined;
  let forecastUnsub = undefined;
  let wakeEventUnsub = undefined;
  let sleepEventUnsub = undefined;
  let config = null;
  let events = [];
  let hourlyForecast = [];
  let clientId = null;
  let isVisible = false;
  let cgAlertActive = false;
  let backendOverlayActive = false;
  let overlayStateVersion = 0;
  let showSensorValues = false;
  let backgroundIndex = 0;
  let activeBackgroundLayer = 0;
  let backgroundDomVersion = 0;
  let activeBackgroundSignature = "";
  let activeBackgroundDomVersion = -1;
  let lastClockDateKey = "";
  let derivedConfig = null;
  let previousDocumentBackground = null;
  let wakeRepaintTimers = [];
  const forecastTimeCache = new Map();
  const preloadedBackgroundImages = new Set();
  let inputShieldTimer = undefined;
  let sleepShieldReleaseTimer = undefined;

  const INPUT_SHIELD_MS = 350;
  const WAKE_SHIELD_RELEASE_MS = 600;
  const INPUT_SHIELD_EVENTS = [
    "pointerdown",
    "pointerup",
    "pointercancel",
    "mousedown",
    "mouseup",
    "touchstart",
    "touchend",
    "touchcancel",
    "click",
  ];

  const getHass = () => document.querySelector("home-assistant")?.hass;

  const getClientId = () => {
    try {
      const stored = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
      if (stored) {
        return stored;
      }
      const generated =
        window.crypto?.randomUUID?.() ||
        `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, generated);
      return generated;
    } catch {
      return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  };

  const getDefaultClientName = () => {
    const ua = navigator.userAgent || "Browser";
    if (/Fully/i.test(ua)) return "Fully Kiosk";
    if (/Home Assistant/i.test(ua)) return "Home Assistant Companion";
    if (/Chrome/i.test(ua)) return "Chrome";
    if (/Safari/i.test(ua)) return "Safari";
    if (/Firefox/i.test(ua)) return "Firefox";
    if (/Edge/i.test(ua)) return "Edge";
    return "Browser";
  };

  const overlayActiveStorageKey = () =>
    `${OVERLAY_ACTIVE_STORAGE_PREFIX}-${clientId || getClientId()}`;

  const setStoredOverlayActive = (active) => {
    try {
      if (active) {
        window.localStorage.setItem(overlayActiveStorageKey(), "1");
      } else {
        window.localStorage.removeItem(overlayActiveStorageKey());
      }
    } catch {
      // Ignore unavailable storage.
    }
  };

  const getStoredOverlayActive = () => {
    try {
      return window.localStorage.getItem(overlayActiveStorageKey()) === "1";
    } catch {
      return false;
    }
  };

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

  const normalizeEntityList = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item : item?.entity || item?.value))
        .map((item) => String(item || "").trim())
        .filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getConfig = async () => {
    const hass = getHass();
    if (!hass) {
      return null;
    }

    try {
      const result = await hass.connection.sendMessagePromise({
        type: "screensaver_overlay/get_config",
        client_id: clientId,
      });
      config = result.config;
      const globalConfig = result.entries?.[0] || {};
      const calendars = normalizeEntityList(config?.calendars);
      const globalCalendars = normalizeEntityList(globalConfig.calendars);
      const valueEntities = normalizeEntityList(
        config?.value_entities || config?.value_entity
      );
      const globalValueEntities = normalizeEntityList(
        globalConfig.value_entities || globalConfig.value_entity
      );
      if (config) {
        config.calendars = calendars.length ? calendars : globalCalendars;
        config.value_entities = valueEntities.length ? valueEntities : globalValueEntities;
      }
      invalidateDerivedConfig();
      backendOverlayActive = !!result.overlay_active;
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
        client_id: clientId,
      });
    } catch (err) {
      console.warn(`screensaver-overlay failed to send ${type}`, err);
    }
  };

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatForecastTime = (datetime) => {
    const key = String(datetime || "");
    if (forecastTimeCache.has(key)) {
      return forecastTimeCache.get(key);
    }
    const formatted = new Date(datetime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    forecastTimeCache.set(key, formatted);
    return formatted;
  };

  const formatDate = (date, language) =>
    date.toLocaleDateString(language || "en-US", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });

  const getWeatherEntity = () => config?.weather_entity || config?.entity;

  const invalidateDerivedConfig = () => {
    derivedConfig = null;
  };

  const getDerivedConfig = () => {
    if (derivedConfig) {
      return derivedConfig;
    }

    const calendars = normalizeEntityList(config?.calendars);
    const valueEntities = normalizeEntityList(config?.value_entities || config?.value_entity);
    const statusIconEntities = [
      ...(config?.status_icon_entities || []),
      ...(config?.entity_icon || []),
    ]
      .map((item) => {
        if (typeof item === "string") {
          return { entity: item, icon: undefined };
        }
        return { entity: item?.entity, icon: item?.icon };
      })
      .filter((item) => item.entity);
    const backgroundImages =
      config?.background_mode === "black"
        ? []
        : normalizeStringList(config?.background_images);

    const watchedEntities = new Set(
      [
        getWeatherEntity(),
        config?.weather_description_entity,
        config?.internal_temperature,
        config?.external_temperature,
        config?.rain_sensor,
        config?.screen_switch,
        "sun.sun",
        ...valueEntities,
        ...statusIconEntities.map((item) => item.entity),
        ...calendars,
      ].filter(Boolean)
    );

    derivedConfig = {
      calendars,
      valueEntities,
      statusIconEntities,
      backgroundImages,
      watchedEntities,
    };
    return derivedConfig;
  };

  const registerClient = async () => {
    const hass = getHass();
    if (!hass || !clientId) {
      return;
    }

    try {
      await hass.connection.sendMessagePromise({
        type: "screensaver_overlay/register_client",
        client_id: clientId,
        name: getDefaultClientName(),
        path: window.location.pathname,
        user_agent: navigator.userAgent || "",
        platform: navigator.platform || "",
      });
    } catch (err) {
      console.warn("screensaver-overlay failed to register browser client", err);
    }
  };

  const getCalendars = () => getDerivedConfig().calendars;

  const getValueEntities = () => getDerivedConfig().valueEntities;

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

  const getHourlyForecastBackgroundOpacity = () => {
    const opacity = Number(config?.hourly_forecast_background_opacity);
    const percentage =
      Number.isFinite(opacity) ? opacity : DEFAULT_HOURLY_FORECAST_BACKGROUND_OPACITY;
    return Math.min(Math.max(percentage, 0), 100) / 100;
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

  const normalizeStringList = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getBackgroundImages = () => getDerivedConfig().backgroundImages;

  const getBackgroundCarouselInterval = () => {
    const seconds = Number(config?.background_carousel_interval);
    return (
      (Number.isFinite(seconds) && seconds > 0
        ? seconds
        : DEFAULT_BACKGROUND_CAROUSEL_INTERVAL) * 1000
    );
  };

  const preloadBackgroundImage = (url) => {
    if (!url || preloadedBackgroundImages.has(url)) {
      return;
    }
    preloadedBackgroundImages.add(url);
    const image = new Image();
    image.src = url;
  };

  const preloadNextBackgroundImage = (images) => {
    if (images.length <= 1) {
      return;
    }
    preloadBackgroundImage(images[(backgroundIndex + 1) % images.length]);
  };

  const backgroundSignature = () =>
    `${getBackgroundCarouselInterval()}|${getBackgroundImages().join("\n")}`;

  const setBackgroundImage = () => {
    if (!content) {
      return;
    }

    const layers = Array.from(content.querySelectorAll(".screensaver-background-image"));
    if (!layers.length) {
      content.classList.remove("has-background");
      return;
    }

    const images = getBackgroundImages();
    if (!images.length) {
      layers.forEach((layer) => {
        layer.style.backgroundImage = "";
        layer.classList.remove("is-active");
      });
      content.classList.remove("has-background");
      return;
    }

    if (backgroundIndex >= images.length) {
      backgroundIndex = 0;
    }
    const url = images[backgroundIndex];
    const cssUrl = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const nextLayerIndex = layers.length > 1 ? (activeBackgroundLayer + 1) % layers.length : 0;
    const nextLayer = layers[nextLayerIndex];

    nextLayer.style.backgroundImage = `url("${cssUrl}")`;
    nextLayer.classList.add("is-active");
    layers.forEach((layer, index) => {
      if (index !== nextLayerIndex) {
        layer.classList.remove("is-active");
      }
    });
    activeBackgroundLayer = nextLayerIndex;
    content.classList.add("has-background");
    preloadNextBackgroundImage(images);
  };

  const stopBackgroundCarousel = (clearBackground = false) => {
    if (backgroundTimer !== undefined) {
      window.clearInterval(backgroundTimer);
      backgroundTimer = undefined;
    }
    backgroundIndex = 0;
    activeBackgroundLayer = 0;
    activeBackgroundSignature = "";
    activeBackgroundDomVersion = -1;

    if (!clearBackground || !content) {
      return;
    }
    const layers = content.querySelectorAll(".screensaver-background-image");
    layers.forEach((layer) => {
      layer.style.backgroundImage = "";
      layer.classList.remove("is-active");
    });
    content.classList.remove("has-background");
  };

  const startBackgroundCarousel = (force = false) => {
    if (!isVisible) {
      return;
    }

    const signature = backgroundSignature();
    if (
      !force &&
      signature === activeBackgroundSignature &&
      backgroundDomVersion === activeBackgroundDomVersion
    ) {
      return;
    }

    if (backgroundTimer !== undefined) {
      window.clearInterval(backgroundTimer);
      backgroundTimer = undefined;
    }
    backgroundIndex = 0;
    setBackgroundImage();
    activeBackgroundSignature = signature;
    activeBackgroundDomVersion = backgroundDomVersion;

    const images = getBackgroundImages();
    if (images.length <= 1) {
      return;
    }

    backgroundTimer = window.setInterval(() => {
      const currentImages = getBackgroundImages();
      if (currentImages.length <= 1) {
        stopBackgroundCarousel();
        setBackgroundImage();
        return;
      }
      backgroundIndex = (backgroundIndex + 1) % currentImages.length;
      setBackgroundImage();
    }, getBackgroundCarouselInterval());
  };

  const updateBurnInPadding = () => {
    const y =
      Math.floor(Math.random() * (BURN_IN_PADDING_MAX / BURN_IN_PADDING_STEP + 1)) *
        BURN_IN_PADDING_STEP -
      BURN_IN_PADDING_MAX / 2;
    const x =
      Math.floor(Math.random() * (BURN_IN_PADDING_MAX / BURN_IN_PADDING_STEP + 1)) *
        BURN_IN_PADDING_STEP -
      BURN_IN_PADDING_MAX / 2;
    const left = BURN_IN_PADDING_MAX / 2 + x;
    const right = BURN_IN_PADDING_TOTAL - left;

    overlay?.style.setProperty("--screensaver-burn-in-x", `${x}px`);
    overlay?.style.setProperty("--screensaver-burn-in-y", `${y}px`);
    overlay?.style.setProperty("--screensaver-burn-in-left", `${left}px`);
    overlay?.style.setProperty("--screensaver-burn-in-right", `${right}px`);
  };

  const startBurnInMovement = () => {
    updateBurnInPadding();

    if (burnInTimer !== undefined) {
      return;
    }

    burnInTimer = window.setInterval(updateBurnInPadding, BURN_IN_INTERVAL);
  };

  const stopBurnInMovement = () => {
    if (burnInTimer !== undefined) {
      window.clearInterval(burnInTimer);
      burnInTimer = undefined;
    }
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
    return getDerivedConfig().statusIconEntities;
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
    const calendars = getCalendars();
    if (!hass || !calendars.length) {
      events = [];
      cgAlertActive = false;
      return;
    }

    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 7);

    const fetchCalendar = async (calendar) => {
      try {
        const response = await hass.callApi(
          "POST",
          "services/calendar/get_events?return_response",
          {
            entity_id: calendar,
            start_date_time: start.toISOString(),
            end_date_time: end.toISOString(),
          }
        );
        const serviceResponse = response?.service_response || response || {};
        return serviceResponse[calendar]?.events || serviceResponse.events || [];
      } catch (err) {
        return hass.callApi(
          "GET",
          `calendars/${calendar}?start=${start.toISOString()}&end=${end.toISOString()}`
        );
      }
    };

    const results = await Promise.allSettled(calendars.map(fetchCalendar));
    const seen = new Set();
    const getEventStart = (event) => {
      const value =
        typeof event.start === "object" ? event.start?.dateTime || event.start?.date : event.start;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };
    const isCgAlertCurrentlyActive = (event) => {
      if (event.summary !== "cg_alert") {
        return false;
      }
      const startValue =
        typeof event.start === "object" ? event.start?.dateTime || event.start?.date : event.start;
      const endValue =
        typeof event.end === "object" ? event.end?.dateTime || event.end?.date : event.end;
      const startDate = new Date(startValue);
      const endDate = new Date(endValue);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return false;
      }
      const now = new Date();
      if (event.start?.date && event.end?.date) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return startDate <= today && today <= endDate;
      }
      return startDate <= now && now <= endDate;
    };
    const fetchedEvents = results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);
    cgAlertActive = fetchedEvents.some(isCgAlertCurrentlyActive);
    events = results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter((event) => {
        const startValue =
          typeof event.start === "object" ? event.start?.dateTime || event.start?.date : event.start;
        const key = `${event.summary}-${startValue}`;
        if (event.summary === "cg_alert" || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .sort((a, b) => getEventStart(a) - getEventStart(b))
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
          updateForecast(hass);
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
    forecastTimeCache.clear();
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
      <div class="forecast" style="--screensaver-hourly-forecast-background-opacity:${getHourlyForecastBackgroundOpacity()};">
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
                    <div class="hour">${html(formatForecastTime(forecast.datetime))}</div>
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
        <text x="0.1313" y="290.461" class="temperature-text external-temperature-text">${html(externalValue)}°</text>
        <text x="660.559" y="290.461" class="temperature-text internal-temperature-text">${html(internalValue)}°</text>
      </svg>
    `;
  };

  const getTemperatureValues = (hass) => {
    const weatherState = hass.states[getWeatherEntity()];
    const externalState = config.external_temperature
      ? hass.states[config.external_temperature]
      : null;
    const internalState = config.internal_temperature
      ? hass.states[config.internal_temperature]
      : null;

    return {
      externalTemperature:
        externalState?.state ?? weatherState?.attributes?.temperature ?? "",
      internalState,
    };
  };

  const shouldAlternateInfo = () =>
    getValueEntities().length > 0 && getCalendars().length > 0;

  const renderInfoContent = (hass) => {
    if (
      getValueEntities().length &&
      (!getCalendars().length || showSensorValues || !events.length)
    ) {
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

  const updateStatusIcons = (hass) => {
    const statusElement = content?.querySelector(".status-icons");
    if (!hass || !config || !statusElement || !isBlockVisible("show_status_icons")) {
      return;
    }
    statusElement.innerHTML = renderStatusIcons(hass);
  };

  const updateWeatherDescription = (hass) => {
    const weatherDescriptionElement = content?.querySelector(".weather-description");
    if (!hass || !config || !weatherDescriptionElement) {
      return;
    }
    weatherDescriptionElement.innerHTML = renderWeatherDescription(hass);
  };

  const updateWeatherIcon = (hass) => {
    const weatherIconElement = content?.querySelector(".weather-icon");
    if (!hass || !config || !weatherIconElement || !isBlockVisible("show_weather_icon")) {
      return;
    }
    const weatherState = hass.states[getWeatherEntity()];
    const weatherIcon = getWeatherIcon(hass, weatherState?.state);
    weatherIconElement.innerHTML = weatherIcon
      ? `<img src="${ASSET_BASE}/weather_icons/now_icon/${html(weatherIcon)}.svg" />`
      : "";
  };

  const updateTemperatures = (hass) => {
    const temperaturesElement = content?.querySelector(".temperatures");
    if (!hass || !config || !temperaturesElement || !isBlockVisible("show_temperatures")) {
      return;
    }

    const { externalTemperature, internalState } = getTemperatureValues(hass);
    const externalValue = formatTemperature(externalTemperature);

    if (!internalState) {
      const externalElement = temperaturesElement.querySelector(".ext-temp");
      if (externalElement) {
        externalElement.textContent = `${externalValue}°`;
      } else {
        temperaturesElement.innerHTML = renderTemperatures(externalTemperature, internalState);
      }
      return;
    }

    const internalValue = formatTemperature(internalState.state);
    const svg = temperaturesElement.querySelector(".temperature-svg");
    if (!svg) {
      temperaturesElement.innerHTML = renderTemperatures(externalTemperature, internalState);
      return;
    }

    svg.setAttribute(
      "aria-label",
      `${externalValue} degrees external, ${internalValue} degrees internal`
    );
    const externalText = svg.querySelector(".external-temperature-text");
    const internalText = svg.querySelector(".internal-temperature-text");
    if (externalText) {
      externalText.textContent = `${externalValue}°`;
    }
    if (internalText) {
      internalText.textContent = `${internalValue}°`;
    }
  };

  const updateForecast = (hass = getHass()) => {
    const screen = content?.querySelector(".screen");
    if (!hass || !config || !screen) {
      return;
    }

    const existing = screen.querySelector(".forecast");
    const forecastHtml = renderForecastTimeline(hass).trim();
    if (!forecastHtml) {
      existing?.remove();
      return;
    }
    if (existing) {
      existing.outerHTML = forecastHtml;
      return;
    }
    screen.insertAdjacentHTML("beforeend", forecastHtml);
  };

  const updateVisibleContent = async (refreshCalendarEvents = false) => {
    const hass = getHass();
    if (!hass || !config || !content) {
      return;
    }

    if (refreshCalendarEvents) {
      await fetchCalendarEvents();
    }
    updateStatusIcons(hass);
    updateWeatherDescription(hass);
    updateWeatherIcon(hass);
    updateTemperatures(hass);
    updateInfo();
    updateForecast(hass);
    updateClock();
  };

  const getWatchedEntities = () => {
    return getDerivedConfig().watchedEntities;
  };

  const setDocumentWakeBackground = (active) => {
    const root = document.documentElement;
    const body = document.body;
    if (!root || !body) {
      return;
    }

    if (active) {
      if (!previousDocumentBackground) {
        previousDocumentBackground = {
          root: root.style.backgroundColor,
          rootPriority: root.style.getPropertyPriority("background-color"),
          body: body.style.backgroundColor,
          bodyPriority: body.style.getPropertyPriority("background-color"),
        };
      }
      root.classList.add("screensaver-overlay-document-active");
      root.style.setProperty("background-color", "black", "important");
      body.style.setProperty("background-color", "black", "important");
      return;
    }

    root.classList.remove("screensaver-overlay-document-active");
    if (!previousDocumentBackground) {
      return;
    }
    root.style.setProperty(
      "background-color",
      previousDocumentBackground.root,
      previousDocumentBackground.rootPriority
    );
    body.style.setProperty(
      "background-color",
      previousDocumentBackground.body,
      previousDocumentBackground.bodyPriority
    );
    previousDocumentBackground = null;
  };

  const clearWakeRepaintTimers = () => {
    wakeRepaintTimers.forEach((timer) => window.clearTimeout(timer));
    wakeRepaintTimers = [];
  };

  const forceOverlayRepaint = () => {
    if (!overlay || !content || !isVisible) {
      return;
    }

    overlay.style.visibility = "visible";
    overlay.style.opacity = "1";
    overlay.style.backgroundColor = "black";
    content.style.backgroundColor = "black";
    overlay.style.setProperty(
      "--screensaver-wake-repaint-nudge",
      `${Date.now() % 2}px`
    );
    void overlay.offsetHeight;
    window.requestAnimationFrame(() => {
      if (!overlay || !isVisible) {
        return;
      }
      overlay.style.opacity = "1";
      void overlay.offsetHeight;
    });
  };

  const scheduleWakeRepaints = () => {
    clearWakeRepaintTimers();
    [0, 50, 150, 350, 750, 1500, 2500].forEach((delay) => {
      wakeRepaintTimers.push(window.setTimeout(forceOverlayRepaint, delay));
    });
  };

  const applyScreenSleepShield = () => {
    if (!overlay || !content || !isVisible) {
      return;
    }
    setDocumentWakeBackground(true);
    overlay.classList.add("screen-sleeping");
    overlay.classList.add("resume-immediate");
    overlay.style.visibility = "visible";
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
    overlay.style.backgroundColor = "black";
    content.style.backgroundColor = "black";
    overlay.setAttribute("aria-hidden", "false");
    forceOverlayRepaint();
  };

  const clearScreenSleepShield = () => {
    if (sleepShieldReleaseTimer !== undefined) {
      window.clearTimeout(sleepShieldReleaseTimer);
      sleepShieldReleaseTimer = undefined;
    }
    if (!overlay) {
      return;
    }
    overlay.classList.remove("screen-sleeping");
    overlay.classList.remove("resume-immediate");
  };

  const releaseScreenSleepShieldAfterWake = () => {
    if (!overlay?.classList.contains("screen-sleeping")) {
      return;
    }
    if (sleepShieldReleaseTimer !== undefined) {
      window.clearTimeout(sleepShieldReleaseTimer);
    }
    sleepShieldReleaseTimer = window.setTimeout(
      clearScreenSleepShield,
      WAKE_SHIELD_RELEASE_MS
    );
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
      dateKey: `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`,
      dateParts: [dayName, ":", day, ":", month, ":", year],
    };
  };

  const updateClock = () => {
    if (!content) {
      return;
    }

    const { time, date, dateKey, dateParts } = getClockParts();
    const timeElement = content.querySelector(".time-value, .fallback-time");
    const dateElement = content.querySelector(".date, .fallback-date");

    if (timeElement) {
      timeElement.textContent = time;
    }
    if (dateKey === lastClockDateKey) {
      return;
    }
    lastClockDateKey = dateKey;

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
        await updateVisibleContent(true);
        return;
      }
      await updateVisibleContent(false);
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

        if (entityId === config?.screen_switch && isVisible) {
          const newState = event?.data?.new_state?.state;
          if (newState === "off") {
            applyScreenSleepShield();
            return;
          }
          if (newState === "on") {
            restoreOverlayFromBackend({ forceLocalRestore: true });
            releaseScreenSleepShieldAfterWake();
            return;
          }
        }

        scheduleStateRender(getCalendars().includes(entityId));
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

  const startWakeEventSubscription = async () => {
    const hass = getHass();
    if (!hass?.connection || wakeEventUnsub !== undefined || sleepEventUnsub !== undefined) {
      return;
    }

    try {
      sleepEventUnsub = await hass.connection.subscribeEvents((event) => {
        const eventClientId = event?.data?.client_id;
        if (eventClientId && eventClientId !== clientId) {
          return;
        }
        applyScreenSleepShield();
      }, "screensaver_overlay_screen_sleep");
      wakeEventUnsub = await hass.connection.subscribeEvents((event) => {
        const eventClientId = event?.data?.client_id;
        if (eventClientId && eventClientId !== clientId) {
          return;
        }
        restoreOverlayFromBackend({ forceLocalRestore: true });
        releaseScreenSleepShieldAfterWake();
      }, "screensaver_overlay_screen_wake");
    } catch (err) {
      console.warn("screensaver-overlay failed to subscribe to wake events", err);
    }
  };

  const render = () => {
    if (!content) {
      return;
    }

    const hass = getHass();
    const { time, date, dateKey, dateParts } = getClockParts();

    if (!hass || !config) {
      content.innerHTML = `
        <div class="screensaver-background-image"></div>
        <div class="screensaver-background-image"></div>
        <div class="screensaver-background-scrim"></div>
        <div class="fallback">
          <div class="fallback-time">${html(time)}</div>
          <div class="fallback-date">${html(date)}</div>
        </div>
      `;
      backgroundDomVersion += 1;
      lastClockDateKey = dateKey;
      setBackgroundImage();
      return;
    }

    const weatherState = hass.states[getWeatherEntity()];
    const weatherIcon = getWeatherIcon(hass, weatherState?.state);
    const { externalTemperature, internalState } = getTemperatureValues(hass);

    content.innerHTML = `
      <div class="screensaver-background-image"></div>
      <div class="screensaver-background-image"></div>
      <div class="screensaver-background-scrim"></div>
      <div class="screen">
        ${cgAlertActive ? `<div class="cg-alert" aria-label="Calendar alert"></div>` : ""}
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
    backgroundDomVersion += 1;
    lastClockDateKey = dateKey;
    setBackgroundImage();
  };

  const ensureOverlayRendered = () => {
    if (!content?.childElementCount) {
      render();
    }
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
    stopBackgroundCarousel();
  };

  const startVisibleTimers = async () => {
    await fetchCalendarEvents();
    showSensorValues = false;
    if (isBlockVisible("show_hourly_forecast")) {
      await subscribeHourlyForecast();
    }
    await updateVisibleContent(false);
    startBackgroundCarousel();
    updateClock();
    await startStateSubscription();

    if (clockTimer === undefined && isBlockVisible("show_clock")) {
      clockTimer = window.setInterval(updateClock, 1000);
    }
    if (eventTimer === undefined && isBlockVisible("show_info")) {
      eventTimer = window.setInterval(async () => {
        await fetchCalendarEvents();
        await updateVisibleContent(false);
      }, 5 * 60 * 1000);
    }
    if (infoTimer === undefined && isBlockVisible("show_info") && shouldAlternateInfo()) {
      infoTimer = window.setInterval(() => {
        showSensorValues = !showSensorValues;
        updateInfo();
      }, 7000);
    }
  };

  const applyOverlayVisibleStyles = ({ immediate = false } = {}) => {
    if (!overlay) {
      return;
    }
    stopInputShield();
    setDocumentWakeBackground(true);
    const keepSleepShield = overlay.classList.contains("screen-sleeping");
    if (!immediate && !keepSleepShield) {
      clearScreenSleepShield();
    }
    if (immediate) {
      overlay.classList.add("resume-immediate");
    }
    overlay.style.opacity = "1";
    overlay.style.visibility = "visible";
    overlay.style.pointerEvents = "auto";
    overlay.setAttribute("aria-hidden", "false");
    if (immediate) {
      scheduleWakeRepaints();
      window.requestAnimationFrame(() => {
        if (!keepSleepShield) {
          clearScreenSleepShield();
          overlay?.classList.remove("resume-immediate");
        }
      });
    }
  };

  const applyOverlayHiddenStyles = () => {
    if (!overlay) {
      return;
    }
    overlay.style.opacity = "0";
    overlay.style.visibility = "hidden";
    overlay.style.pointerEvents = "none";
    overlay.setAttribute("aria-hidden", "true");
    clearScreenSleepShield();
    clearWakeRepaintTimers();
    setDocumentWakeBackground(false);
  };

  const restoreOverlayFromBackend = async ({ forceLocalRestore = false } = {}) => {
    if (!overlay) {
      return;
    }

    const localOverlayActive =
      forceLocalRestore || isVisible || getStoredOverlayActive() || backendOverlayActive;
    if (localOverlayActive && isCurrentPageAllowed()) {
      stopIdleTimer();
      isVisible = true;
      setStoredOverlayActive(true);
      applyOverlayVisibleStyles({ immediate: true });
      startBurnInMovement();
      ensureOverlayRendered();
      startBackgroundCarousel();
      updateClock();
    }

    config = (await getConfig()) || config;
    if (!config || !(backendOverlayActive || localOverlayActive) || !isCurrentPageAllowed()) {
      return;
    }

    stopIdleTimer();
    isVisible = true;
    const showVersion = ++overlayStateVersion;
    setStoredOverlayActive(true);
    applyOverlayVisibleStyles({ immediate: true });
    startBurnInMovement();
    ensureOverlayRendered();
    startBackgroundCarousel();
    updateClock();
    await notifyBackend("screensaver_overlay/overlay_shown");
    if (!isVisible || overlayStateVersion !== showVersion) {
      return;
    }
    backendOverlayActive = true;
    await startVisibleTimers();
  };

  const handleFrontendResume = async () => {
    if (isVisible) {
      if (!config?.entry_id) {
        config = (await getConfig()) || config;
      }
      applyOverlayVisibleStyles({ immediate: true });
      ensureOverlayRendered();
      startBackgroundCarousel();
      updateClock();
      releaseScreenSleepShieldAfterWake();
      const showVersion = overlayStateVersion;
      await notifyBackend("screensaver_overlay/overlay_shown");
      if (!isVisible || overlayStateVersion !== showVersion) {
        return;
      }
      backendOverlayActive = true;
      return;
    }
    await restoreOverlayFromBackend();
  };

  const showOverlay = async () => {
    if (!overlay || isVisible) {
      return;
    }

    config = (await getConfig()) || config;
    if (!config) {
      stopIdleTimer();
      schedulePageAllowedCheck();
      return;
    }
    if (!isCurrentPageAllowed()) {
      stopIdleTimer();
      schedulePageAllowedCheck();
      return;
    }

    isVisible = true;
    const showVersion = ++overlayStateVersion;
    setStoredOverlayActive(true);
    applyOverlayVisibleStyles();
    startBurnInMovement();
    render();
    startBackgroundCarousel();
    updateClock();
    await notifyBackend("screensaver_overlay/overlay_shown");
    if (!isVisible || overlayStateVersion !== showVersion) {
      return;
    }
    backendOverlayActive = true;
    await startVisibleTimers();
  };

  const stopInputShield = () => {
    if (inputShieldTimer !== undefined) {
      window.clearTimeout(inputShieldTimer);
      inputShieldTimer = undefined;
    }

    INPUT_SHIELD_EVENTS.forEach((eventName) => {
      document.removeEventListener(eventName, shieldInputEvent, true);
    });
  };

  const shieldInputEvent = (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
  };

  const startInputShield = () => {
    stopInputShield();
    const options = { capture: true, passive: false };
    INPUT_SHIELD_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, shieldInputEvent, options);
    });
    inputShieldTimer = window.setTimeout(stopInputShield, INPUT_SHIELD_MS);
  };

  const notifyOverlayHidden = async (hiddenVersion) => {
    if (!config?.entry_id) {
      config = (await getConfig()) || config;
    }
    await notifyBackend("screensaver_overlay/overlay_hidden");
    if (!isVisible && overlayStateVersion === hiddenVersion) {
      backendOverlayActive = false;
    }
  };

  const hideOverlayNow = () => {
    if (!overlay || !isVisible) {
      return false;
    }

    isVisible = false;
    const hiddenVersion = ++overlayStateVersion;
    backendOverlayActive = false;
    setStoredOverlayActive(false);
    applyOverlayHiddenStyles();
    stopBurnInMovement();
    stopVisibleTimers();
    stopStateSubscription();
    unsubscribeHourlyForecast();
    return hiddenVersion;
  };

  const hideOverlay = async () => {
    const hiddenVersion = hideOverlayNow();
    if (!hiddenVersion) {
      return;
    }

    await notifyOverlayHidden(hiddenVersion);
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

    if (!config) {
      schedulePageAllowedCheck();
      return;
    }

    stopPageAllowedCheck();
    const timeout = Number(config?.overlay_idle_timeout || DEFAULT_IDLE_TIMEOUT) * 1000;
    console.debug("screensaver-overlay idle timer set", timeout);
    idleTimer = window.setTimeout(showOverlay, timeout);
  };

  const dismissOverlayFromInput = (event, { shield = true } = {}) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopImmediatePropagation();

    if (!isVisible) {
      resetIdleTimer();
      return;
    }

    if (shield) {
      startInputShield();
    }

    const hiddenVersion = hideOverlayNow();
    if (hiddenVersion) {
      void notifyOverlayHidden(hiddenVersion);
    }
    resetIdleTimer();
  };

  const handleInput = (event) => {
    if (isVisible) {
      if (event.type === "keydown") {
        dismissOverlayFromInput(event, { shield: false });
      }
      return;
    }
    resetIdleTimer();
  };

  const installOverlayInputHandlers = () => {
    if (!overlay || overlay.__screensaverOverlayInputHandlersInstalled) {
      return;
    }
    overlay.__screensaverOverlayInputHandlersInstalled = true;
    const options = { capture: true, passive: false };
    overlay.addEventListener("pointerdown", dismissOverlayFromInput, options);
    overlay.addEventListener("touchstart", dismissOverlayFromInput, options);
    overlay.addEventListener("wheel", dismissOverlayFromInput, options);
  };

  const refreshConfig = async () => {
    await registerClient();
    config = (await getConfig()) || config;
    if (isVisible) {
      render();
      startBackgroundCarousel();
      updateClock();
    } else {
      resetIdleTimer();
    }
    return config;
  };

  const stopIdleTimer = () => {
    if (idleTimer !== undefined) {
      window.clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  };

  const handleLocationChanged = () => {
    registerClient();
    if (!config) {
      schedulePageAllowedCheck();
      return;
    }
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
        html.screensaver-overlay-document-active,
        html.screensaver-overlay-document-active body {
          background: #000 !important;
        }
        #${OVERLAY_ID} {
          --screensaver-muted-text-color: #757575;
          --screensaver-subtle-line-color: #4d4d4d;
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
          outline: var(--screensaver-wake-repaint-nudge, 0px) solid transparent;
          font-family: 'bw_font', var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        }
        #${OVERLAY_ID}.resume-immediate {
          transition: none;
        }
        #${OVERLAY_ID}.screen-sleeping {
          background: #000 !important;
          opacity: 1 !important;
          visibility: visible !important;
          transition: none !important;
        }
        #${OVERLAY_ID}.screen-sleeping .screensaver-overlay-content {
          opacity: 0 !important;
          transition: none !important;
        }
        #${OVERLAY_ID} .screensaver-overlay-content,
        #${OVERLAY_ID} .screen {
          width: 100%;
          height: 100%;
        }
        #${OVERLAY_ID} .screensaver-overlay-content {
          position: relative;
          overflow: hidden;
          background: black;
        }
        #${OVERLAY_ID} .screensaver-background-image,
        #${OVERLAY_ID} .screensaver-background-scrim {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        #${OVERLAY_ID} .screensaver-background-image {
          z-index: 0;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          opacity: 0;
          transition: opacity 0.8s ease;
        }
        #${OVERLAY_ID} .screensaver-background-scrim {
          z-index: 1;
          background: rgba(0, 0, 0, 0.42);
          opacity: 0;
          transition: opacity 0.8s ease;
        }
        #${OVERLAY_ID} .screensaver-overlay-content.has-background .screensaver-background-image.is-active,
        #${OVERLAY_ID} .screensaver-overlay-content.has-background .screensaver-background-scrim {
          opacity: 1;
        }
        #${OVERLAY_ID} .screen {
          position: relative;
          z-index: 2;
          box-sizing: border-box;
          display: grid;
          grid-template-areas:
            ". icon icon now_icon alert"
            ". . . temp ."
            ". date . cal-event ."
            "tline tline tline tline tline";
          grid-template-columns: 7vw auto auto auto 1vw;
          grid-template-rows: auto auto 1fr auto;
          padding: 30px;
          background: transparent;
          transform: translate(
            var(--screensaver-burn-in-x, 0px),
            var(--screensaver-burn-in-y, 0px)
          );
          will-change: transform;
        }
        #${OVERLAY_ID} .status-icons {
          grid-area: icon;
          margin-top: 4vh;
        }
        #${OVERLAY_ID} .cg-alert {
          grid-area: alert;
          align-self: start;
          justify-self: end;
          width: 14px;
          height: 14px;
          margin-top: 4vh;
          border-radius: 50%;
          background: #f44336;
          box-shadow: 0 0 10px rgba(244, 67, 54, 0.9);
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
          color: var(--screensaver-muted-text-color);
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
          color: var(--screensaver-muted-text-color);
        }
        #${OVERLAY_ID} .screensaver-overlay-content.has-background .temperatures {
          --screensaver-muted-text-color: #bdbdbd;
        }
        #${OVERLAY_ID} .temperature-svg {
          display: block;
          height: 7vh;
          width: auto;
          overflow: visible;
        }
        #${OVERLAY_ID} .temperature-home,
        #${OVERLAY_ID} .temperature-text {
          fill: var(--screensaver-muted-text-color);
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
          color: var(--screensaver-muted-text-color);
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
          font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        }
        #${OVERLAY_ID} .screensaver-overlay-content.has-background .info {
          --screensaver-muted-text-color: #bdbdbd;
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
          color: var(--screensaver-muted-text-color);
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
          color: var(--screensaver-muted-text-color);
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
          color: var(--screensaver-muted-text-color);
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
          font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
          position: relative;
          z-index: 0;
        }
        #${OVERLAY_ID} .forecast::before {
          content: "";
          position: absolute;
          inset:
            0
            calc(-30px + var(--screensaver-burn-in-x, 0px))
            -8px
            calc(-30px - var(--screensaver-burn-in-x, 0px));
          background: rgba(0, 0, 0, var(--screensaver-hourly-forecast-background-opacity, 0.7));
          z-index: -1;
        }
        #${OVERLAY_ID} .gradient-bar {
          width: 100%;
          height: 2px;
          background: linear-gradient(
            to right,
            black,
            var(--screensaver-subtle-line-color),
            black
          );
          position: relative;
          top: 60px;
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
          height: 72px;
        }
        #${OVERLAY_ID} .condition img {
          width: 58px;
          height: 58px;
        }
        #${OVERLAY_ID} .details {
          font-size: 1.3em;
          color: var(--screensaver-muted-text-color);
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
          font-size: 1.15em;
        }
        #${OVERLAY_ID} .fallback {
          position: absolute;
          inset: 0;
          z-index: 2;
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
    installOverlayInputHandlers();
  };

  const bootstrap = async () => {
    clientId = getClientId();
    createOverlay();
    installOverlayInputHandlers();
    if (getStoredOverlayActive()) {
      isVisible = true;
      applyOverlayVisibleStyles({ immediate: true });
      render();
    }
    installLocationWatcher();
    await waitForHass();
    window.__screensaverOverlayComponentClientId = clientId;
    await registerClient();
    config = await getConfig();
    await startWakeEventSubscription();
    if (backendOverlayActive) {
      await restoreOverlayFromBackend();
    } else {
      if (isVisible) {
        isVisible = false;
        setStoredOverlayActive(false);
        applyOverlayHiddenStyles();
      }
      resetIdleTimer();
    }
    console.debug("screensaver-overlay installed", { hasConfig: !!config, config });
    window.__screensaverOverlayComponentShow = showOverlay;
    window.__screensaverOverlayComponentHide = hideOverlay;
    window.__screensaverOverlayComponentRefreshConfig = refreshConfig;
    window.__screensaverOverlayComponentDashboardPaths = getDashboardPaths;
    window.__screensaverOverlayComponentIsPageAllowed = isCurrentPageAllowed;

    window.addEventListener("pointerdown", handleInput, { passive: true });
    window.addEventListener("touchstart", handleInput, { passive: true });
    window.addEventListener("keydown", handleInput, { passive: false });
    window.addEventListener("wheel", handleInput, { passive: true });
    window.addEventListener("screensaver-overlay-location-changed", handleLocationChanged);
    window.addEventListener("focus", handleFrontendResume);
    window.addEventListener("pageshow", handleFrontendResume);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        handleFrontendResume();
      }
    });
  };

  if (document.body) {
    bootstrap();
  } else {
    window.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  }
}
