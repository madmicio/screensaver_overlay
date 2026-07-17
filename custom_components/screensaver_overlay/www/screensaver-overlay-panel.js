const CLIENT_ID_STORAGE_KEY = "screensaver-overlay-client-id";
const VISIBILITY_KEYS = [
  "show_status_icons",
  "show_weather_icon",
  "show_clock",
  "show_info",
  "show_temperatures",
  "show_hourly_forecast",
];
const GLOBAL_DEFAULTS = {
  overlay_idle_timeout: 60,
  limit_to_dashboards: false,
  background_images: [],
  background_carousel_interval: 60,
  weather_icon_size: 27,
  weather_description_text_size: 1.8,
  hourly_forecast_background_opacity: 70,
  info_text_size: 2,
  info_items_limit: 5,
  show_status_icons: true,
  show_weather_icon: true,
  show_clock: true,
  show_info: true,
  show_temperatures: true,
  show_hourly_forecast: true,
};
const DEVICE_CONFIG_KEYS = [
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
];
const BACKGROUND_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const BACKGROUND_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BACKGROUND_UPLOAD_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const PANEL_TRANSLATIONS = {
  en: {
    addEntity: "Add entity",
    backgroundAlwaysBlack:
      "This browser always uses a black background, even when images are selected globally.",
    backgroundCarouselInterval: "Image carousel interval (seconds)",
    backgroundInherited:
      "This browser inherits images and interval from the global settings.",
    backgroundModeBlack: "Black background",
    backgroundMode: "Background mode",
    backgroundScreensaver: "Screensaver background",
    backgroundScreensaverHelp:
      "These settings apply only to the selected browser. When inherited, global images and interval are used.",
    behavior: "Behavior",
    binarySensor: "Create binary sensor for automations",
    brightnessCompanionHelp:
      "Companion App requires Android, permission to modify system settings, and an updated brightness sensor every 15 seconds when using percentage reduction.",
    brightnessDashboardValue: "Dashboard brightness value",
    brightnessDevice: "Device brightness",
    brightnessDeviceHelp:
      "Set these fields only on browsers/tablets that should control physical brightness. Other browsers do not inherit brightness services or sensors.",
    brightnessFixed: "Fixed values",
    brightnessFullyHelp:
      "Fully Kiosk uses Remote Admin REST only: enable Remote Admin in Fully and enter host, port, and password.",
    brightnessLogarithmic: "Logarithmic reduction",
    brightnessLogarithmicHelp:
      "0 does not reduce, 100 goes to the configured minimum. Higher values make the curve darker.",
    brightnessLogarithmicIntensity: "Logarithmic reduction intensity (%)",
    brightnessLogarithmicMinimum: "Minimum screensaver brightness (0-255)",
    brightnessLogarithmicMinimumHelp:
      "Absolute minimum limit: the value calculated by the curve does not go below this brightness.",
    brightnessManagement: "Brightness control",
    brightnessModeCompanion: "Companion App",
    brightnessModeDisabled: "Disabled",
    brightnessModeFully: "Fully Kiosk",
    brightnessPercentage: "Percentage reduction",
    brightnessPercentageHelp:
      "Reduction percentage from current brightness. 80 is the default when the field is empty.",
    brightnessReduction: "Screensaver brightness reduction (%)",
    brightnessScreenUnchanged:
      "Brightness stays unchanged between dashboard and screensaver.",
    brightnessScreensaverValue: "Screensaver brightness value",
    browserBehavior: "Browser and device behavior",
    browserBehaviorHelp:
      "Overlay timeout and dashboards can inherit global settings. Motion sensor, screen switch, and screen off are only for this browser/device.",
    browserName: "Browser name",
    calendars: "Calendars",
    clientConfiguration: "Selected browser configuration",
    clientConfigurationHelp:
      "All sections below modify only this browser/device. Global settings stay in the upper section.",
    companionBrightnessSensor: "Companion App brightness sensor",
    companionNotifyService: "Companion App notify service",
    contentsAndBlocks: "Content and blocks",
    customIcon: "Custom icon",
    dashboardAvailable: "Available dashboards",
    dashboardEnabled: "Allowed dashboards",
    dashboardLimit: "Limit to selected dashboards",
    defaultBadge: "Default",
    delete: "Delete",
    deleteBackgroundConfirm: "Delete this background image?",
    deleteBrowser: "Delete browser",
    emptyBackgrounds: "No images uploaded.",
    emptyBrowsers:
      "No browser registered. Open Home Assistant from a browser or tablet with the component installed, then reload this page.",
    emptyCalendars: "No calendars configured.",
    emptyDashboards: "No Lovelace dashboard detected.",
    deviceSettingsNote:
      "Motion sensor, screen switch, screen off timeout, and brightness are per-device settings: configure them in the browser tab after that browser has opened Home Assistant at least once.",
    emptyGlobalConfig: "No global configuration available.",
    emptyStatusIcons: "No status icon configured.",
    emptyValueEntities: "No value entity configured.",
    entityWeather: "Weather entity",
    eventsAndValuesLimit: "Maximum events and values",
    eventsAndValuesTextSize: "Events and values text size",
    externalTemperature: "External temperature",
    fileTooLarge: "File too large",
    fullyHost: "Fully Kiosk host/IP",
    fullyHostHelp: "Required only for Fully Kiosk.",
    fullyHttps: "Use HTTPS for Fully Kiosk REST",
    fullyPassword: "Fully Remote Admin password",
    fullyPort: "Fully Kiosk port",
    fullyPortHelp: "Default: 2323.",
    fullyScreenSwitchHelp:
      "In Fully Kiosk mode, the screen is turned on and off through Remote Admin REST, so a Home Assistant switch is not needed.",
    global: "Global",
    globalBrowserRule: "Global browser rule",
    globalBrowserRuleHelp:
      "This is not the global screensaver configuration: it is only the rule that decides whether to limit the screensaver to browsers enabled in the panel. If disabled, unconfigured browsers keep using global options. A browser present in the list but disabled is still excluded.",
    globalOptions: "Global options",
    globalOptionsHelp:
      'are changed in the section below. Overrides for the selected browser can stay on "Use global value" to inherit these values.',
    globalSettings: "Global settings",
    globalSettingsHelp:
      "Global values used by browsers when a field remains global.",
    hourlyForecastBackgroundOpacity: "Hourly forecast background opacity (%)",
    inheritGlobal: "Use global",
    internalTemperature: "Internal temperature",
    invalidFormat: "Unsupported format",
    lastPath: "Last path",
    lastSeen: "Last seen",
    limitToDashboards: "Limit to selected dashboards",
    mainWeatherIconSize: "Main weather icon size",
    motionSensor: "Motion sensor",
    no: "No",
    notSet: "Not set",
    optionalDefault: "Optional field. If empty, the default value is used.",
    overlayTimeout: "Overlay timeout (seconds)",
    overridesEmpty: "No override: use the global value.",
    overridesHint:
      "All blocks are enabled by default. Turn off only those you want to hide on this browser.",
    platform: "Platform",
    rainSensor: "Rain sensor",
    reload: "Reload",
    remove: "Remove",
    removeEntity: "Remove entity",
    resetOverrides: "Clear overrides",
    restrictEnabledClients: "Enable the screensaver only on browsers enabled below",
    restoreAutoBrightness: "Restore automatic brightness after screensaver",
    saveBrowser: "Save browser",
    saveBrowserRule: "Save browser rule",
    saveGlobalSettings: "Save global settings",
    screensaverEnabled: "Screensaver enabled on this browser",
    screenOffTimeout: "Screen off timeout (seconds)",
    screenSwitch: "Screen switch",
    selected: "selected",
    selectImages: "Selected images",
    showClock: "Time and date",
    showHourlyForecast: "Lower hourly forecast",
    showInfo: "Calendar and value entities",
    showStatusIcons: "Status icons",
    showTemperatures: "Temperatures",
    showWeatherIcon: "Large weather icon",
    statusIconEntities: "Status icon entities",
    strategy: "Strategy",
    titleHelp: "Configuration for browsers and tablets",
    uploadImages: "Upload images",
    uploading: "Uploading...",
    uploadLimits: "JPG, PNG, WEBP or GIF. Maximum 8 MB per file.",
    use: "Use",
    useGlobalValue: "Use global value",
    valueEntities: "Value entities",
    weatherDescriptionSensor: "Weather description sensor",
    weatherDescriptionTextSize: "Weather description text size",
    yes: "Yes",
  },
  it: {
    addEntity: "Aggiungi entita",
    backgroundAlwaysBlack:
      "Questo browser usa sempre sfondo nero, anche se globalmente sono selezionate immagini.",
    backgroundCarouselInterval: "Intervallo carosello immagini (secondi)",
    backgroundInherited:
      "Questo browser eredita immagini e intervallo dalle impostazioni generali.",
    backgroundModeBlack: "Sfondo nero",
    backgroundMode: "Modalita sfondo",
    backgroundScreensaver: "Sfondo screensaver",
    backgroundScreensaverHelp:
      "Queste impostazioni valgono solo per il browser selezionato. In eredita usa immagini e intervallo globali.",
    behavior: "Comportamento",
    binarySensor: "Crea binary sensor per automazioni",
    brightnessCompanionHelp:
      "App Companion richiede Android, permesso modifica impostazioni di sistema e sensore luminosita aggiornato ogni 15 secondi quando usi la riduzione percentuale.",
    brightnessDashboardValue: "Valore luminosita dashboard",
    brightnessDevice: "Luminosita device",
    brightnessDeviceHelp:
      "Imposta questi campi solo sui browser/tablet che devono controllare la luminosita fisica. Gli altri browser non ereditano servizi o sensori di luminosita.",
    brightnessFixed: "Valori fissi",
    brightnessFullyHelp:
      "Fully Kiosk usa solo REST Remote Admin: abilita Remote Admin in Fully e inserisci host, porta e password.",
    brightnessLogarithmic: "Riduzione logaritmica",
    brightnessLogarithmicHelp:
      "0 non riduce, 100 porta al minimo configurato. Valori piu alti rendono la curva piu scura.",
    brightnessLogarithmicIntensity: "Intensita riduzione logaritmica (%)",
    brightnessLogarithmicMinimum: "Luminosita minima screensaver (0-255)",
    brightnessLogarithmicMinimumHelp:
      "Limite minimo assoluto: il valore calcolato dalla curva non scende sotto questa luminosita.",
    brightnessManagement: "Gestione luminosita",
    brightnessModeCompanion: "App Companion",
    brightnessModeDisabled: "Disabilitato",
    brightnessModeFully: "Fully Kiosk",
    brightnessPercentage: "Riduzione percentuale",
    brightnessPercentageHelp:
      "Percentuale di riduzione rispetto alla luminosita corrente. 80 e il default se il campo resta vuoto.",
    brightnessReduction: "Riduzione luminosita screensaver (%)",
    brightnessScreenUnchanged:
      "La luminosita resta invariata tra dashboard e screensaver.",
    brightnessScreensaverValue: "Valore luminosita screensaver",
    browserBehavior: "Comportamento browser e device",
    browserBehaviorHelp:
      "Timeout overlay e dashboard possono ereditare le impostazioni generali. Sensore movimento, switch schermo e spegnimento schermo sono solo di questo browser/device.",
    browserName: "Nome browser",
    calendars: "Calendari",
    clientConfiguration: "Configurazione browser selezionato",
    clientConfigurationHelp:
      "Tutte le sezioni qui sotto modificano solo questo browser/device. Le impostazioni generali restano nella sezione superiore.",
    companionBrightnessSensor: "Sensore luminosita Companion App",
    companionNotifyService: "Servizio notify Companion App",
    contentsAndBlocks: "Contenuti e blocchi",
    customIcon: "Icona custom",
    dashboardAvailable: "Dashboard disponibili",
    dashboardEnabled: "Dashboard abilitate",
    dashboardLimit: "Limita alle dashboard indicate",
    defaultBadge: "Default",
    delete: "Elimina",
    deleteBackgroundConfirm: "Eliminare questa immagine di sfondo?",
    deleteBrowser: "Elimina browser",
    emptyBackgrounds: "Nessuna immagine caricata.",
    emptyBrowsers:
      "Nessun browser registrato. Apri Home Assistant da un browser o tablet con il componente installato, poi ricarica questa pagina.",
    emptyCalendars: "Nessun calendario configurato.",
    emptyDashboards: "Nessuna dashboard Lovelace rilevata.",
    deviceSettingsNote:
      "Sensore movimento, switch schermo, timeout spegnimento e luminosita sono impostazioni del singolo device: configurali nel tab del browser dopo che quel browser ha aperto Home Assistant almeno una volta.",
    emptyGlobalConfig: "Nessuna configurazione globale disponibile.",
    emptyStatusIcons: "Nessuna icona stato configurata.",
    emptyValueEntities: "Nessuna entita valore configurata.",
    entityWeather: "Entita meteo",
    eventsAndValuesLimit: "Numero massimo eventi e valori",
    eventsAndValuesTextSize: "Dimensione testo eventi e valori",
    externalTemperature: "Temperatura esterna",
    fileTooLarge: "File troppo grande",
    fullyHost: "Host/IP Fully Kiosk",
    fullyHostHelp: "Obbligatorio solo per Fully Kiosk.",
    fullyHttps: "Usa HTTPS per Fully Kiosk REST",
    fullyPassword: "Password Remote Admin Fully",
    fullyPort: "Porta Fully Kiosk",
    fullyPortHelp: "Default: 2323.",
    fullyScreenSwitchHelp:
      "In modalita Fully Kiosk lo schermo viene acceso e spento tramite REST Remote Admin, quindi non serve indicare uno switch Home Assistant.",
    global: "Globale",
    globalBrowserRule: "Regola globale browser",
    globalBrowserRuleHelp:
      "Questa non e la configurazione globale dello screensaver: e solo la regola che decide se limitare lo screensaver ai browser abilitati nel pannello. Se disattivata, i browser non configurati continuano a usare le opzioni globali. Un browser presente in elenco ma disabilitato resta comunque escluso.",
    globalOptions: "Opzioni globali",
    globalOptionsHelp:
      'si modificano nella sezione qui sotto. Gli override del browser selezionato possono invece restare su "Usa valore globale" per ereditare questi valori.',
    globalSettings: "Impostazioni generali",
    globalSettingsHelp:
      "Valori globali usati dai browser quando un campo resta su globale.",
    hourlyForecastBackgroundOpacity: "Opacita sfondo meteo orario (%)",
    inheritGlobal: "Usa globale",
    internalTemperature: "Temperatura interna",
    invalidFormat: "Formato non supportato",
    lastPath: "Ultimo percorso",
    lastSeen: "Ultima vista",
    limitToDashboards: "Limita alle dashboard indicate",
    mainWeatherIconSize: "Grandezza icona meteo principale",
    motionSensor: "Sensore movimento",
    no: "No",
    notSet: "Non impostato",
    optionalDefault: "Campo opzionale. Se vuoto usa il valore predefinito.",
    overlayTimeout: "Timeout overlay (secondi)",
    overridesEmpty: "Nessun override: usa il valore globale.",
    overridesHint:
      "Tutti i blocchi sono attivi di default. Spegni solo quelli che vuoi nascondere su questo browser.",
    platform: "Piattaforma",
    rainSensor: "Sensore pioggia",
    reload: "Ricarica",
    remove: "Rimuovi",
    removeEntity: "Rimuovi entita",
    resetOverrides: "Svuota override",
    restrictEnabledClients: "Abilita lo screensaver solo sui browser abilitati qui sotto",
    restoreAutoBrightness: "Ripristina luminosita automatica dopo screensaver",
    saveBrowser: "Salva browser",
    saveBrowserRule: "Salva regola browser",
    saveGlobalSettings: "Salva impostazioni generali",
    screensaverEnabled: "Screensaver abilitato su questo browser",
    screenOffTimeout: "Timeout spegnimento schermo (secondi)",
    screenSwitch: "Switch schermo",
    selected: "selezionate",
    selectImages: "Immagini selezionate",
    showClock: "Ora e data",
    showHourlyForecast: "Meteo orario inferiore",
    showInfo: "Calendario ed entita valore",
    showStatusIcons: "Icone di stato",
    showTemperatures: "Temperature",
    showWeatherIcon: "Icona grande meteo",
    statusIconEntities: "Entita icone stato",
    strategy: "Strategia",
    titleHelp: "Configurazione per browser e tablet",
    uploadImages: "Carica immagini",
    uploading: "Caricamento...",
    uploadLimits: "JPG, PNG, WEBP o GIF. Massimo 8 MB per file.",
    use: "Usa",
    useGlobalValue: "Usa valore globale",
    valueEntities: "Entita valore",
    weatherDescriptionSensor: "Sensore descrizione meteo",
    weatherDescriptionTextSize: "Dimensione testo descrizione meteo",
    yes: "Si",
  },
};

class ScreensaverOverlayPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._loaded = false;
    this._browserConfig = null;
    this._globalConfig = null;
    this._globalDraft = null;
    this._activeClientId = null;
    this._draft = null;
    this._backgroundImages = [];
    this._uploading = false;
    this._saving = false;
    this._error = "";
    this._lastLanguage = null;
  }

  set hass(hass) {
    const previousLanguage = this._lastLanguage;
    this._hass = hass;
    this._lastLanguage = this._language();
    if (!this._loaded) {
      this._loaded = true;
      this._load();
      return;
    }
    if (previousLanguage && previousLanguage !== this._lastLanguage) {
      this._render();
    }
  }

  get hass() {
    return this._hass;
  }

  async _sendMessage(message) {
    if (!this._hass?.connection) {
      return null;
    }
    return this._hass.connection.sendMessagePromise(message);
  }

  _language() {
    const language = this._hass?.locale?.language || this._hass?.language || "en";
    return String(language).toLowerCase().startsWith("it") ? "it" : "en";
  }

  _t(key) {
    return PANEL_TRANSLATIONS[this._language()]?.[key] || PANEL_TRANSLATIONS.en[key] || key;
  }

  _brightnessModeOptions() {
    return [
      { value: "disabled", label: this._t("brightnessModeDisabled") },
      { value: "companion", label: this._t("brightnessModeCompanion") },
      { value: "fully", label: this._t("brightnessModeFully") },
    ];
  }

  _brightnessStrategyOptions() {
    return [
      { value: "percentage", label: this._t("brightnessPercentage") },
      { value: "logarithmic", label: this._t("brightnessLogarithmic") },
      { value: "fixed", label: this._t("brightnessFixed") },
    ];
  }

  _backgroundModeOptions() {
    return [
      { value: "inherit", label: this._t("inheritGlobal") },
      { value: "black", label: this._t("backgroundModeBlack") },
      { value: "images", label: this._t("selectImages") },
    ];
  }

  _getClientId() {
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
  }

  _defaultClientName() {
    const ua = navigator.userAgent || "Browser";
    if (/Fully/i.test(ua)) return "Fully Kiosk";
    if (/Home Assistant/i.test(ua)) return "Home Assistant Companion";
    if (/Chrome/i.test(ua)) return "Chrome";
    if (/Safari/i.test(ua)) return "Safari";
    if (/Firefox/i.test(ua)) return "Firefox";
    if (/Edge/i.test(ua)) return "Edge";
    return "Browser";
  }

  async _registerCurrentClient() {
    await this._sendMessage({
      type: "screensaver_overlay/register_client",
      client_id: this._getClientId(),
      name: this._defaultClientName(),
      path: window.location.pathname,
      user_agent: navigator.userAgent || "",
      platform: navigator.platform || "",
    });
  }

  async _load() {
    try {
      await this._registerCurrentClient();
      const result = await this._sendMessage({
        type: "screensaver_overlay/get_browser_config",
      });
      this._browserConfig = result?.browser_config || {
        settings: { restrict_to_enabled_clients: false },
        clients: {},
      };
      this._globalConfig = result?.config || null;
      await this._loadBackgroundImages();
      this._makeGlobalDraft();
      const clients = this._clients();
      this._activeClientId =
        this._activeClientId || this._getClientId() || clients[0]?.id || null;
      this._makeDraft();
      this._error = "";
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._render();
  }

  async _loadBackgroundImages() {
    try {
      const result = await this._sendMessage({
        type: "screensaver_overlay/list_background_images",
      });
      this._backgroundImages = result?.images || [];
    } catch (err) {
      this._error = err?.message || String(err);
      this._backgroundImages = [];
    }
  }

  _readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  async _uploadBackgroundFiles(files) {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;

    this._uploading = true;
    this._error = "";
    this._render();

    try {
      for (const file of fileList) {
        const extension = `.${String(file.name || "").split(".").pop() || ""}`.toLowerCase();
        if (
          !BACKGROUND_UPLOAD_TYPES.includes(file.type) &&
          !BACKGROUND_UPLOAD_EXTENSIONS.includes(extension)
        ) {
          throw new Error(`${this._t("invalidFormat")}: ${file.name}`);
        }
        if (file.size > BACKGROUND_UPLOAD_MAX_BYTES) {
          throw new Error(`${this._t("fileTooLarge")}: ${file.name}`);
        }
        const content = await this._readFileAsDataUrl(file);
        const result = await this._sendMessage({
          type: "screensaver_overlay/upload_background_image",
          filename: file.name,
          content,
        });
        this._backgroundImages = result?.images || this._backgroundImages;
      }
      await this._loadBackgroundImages();
    } catch (err) {
      this._error = err?.message || String(err);
    }

    this._uploading = false;
    this._render();
  }

  async _deleteBackgroundImage(url) {
    if (!url) return;
    if (!window.confirm(this._t("deleteBackgroundConfirm"))) {
      return;
    }

    this._saving = true;
    this._render();
    try {
      const result = await this._sendMessage({
        type: "screensaver_overlay/delete_background_image",
        url,
      });
      this._backgroundImages = result?.images || [];
      if (result?.config) {
        this._globalConfig = result.config;
        this._makeGlobalDraft();
      }
      if (result?.browser_config) {
        this._browserConfig = result.browser_config;
        this._makeDraft();
      }
      this._error = "";
      window.__screensaverOverlayComponentRefreshConfig?.();
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._saving = false;
    this._render();
  }

  _makeGlobalDraft() {
    if (!this._globalConfig) {
      this._globalDraft = null;
      return;
    }
    const config = this._globalConfig || {};
    this._globalDraft = {
      ...GLOBAL_DEFAULTS,
      ...config,
      weather_entity: config.weather_entity || config.entity || "",
      calendars: this._normalizeEntityValues(config.calendars),
      value_entities: this._normalizeEntityValues(
        config.value_entities || config.value_entity
      ),
      status_icon_entities: this._normalizeStatusIconValues(
        config.status_icon_entities || config.entity_icon
      ),
      allowed_dashboard_paths: Array.isArray(config.allowed_dashboard_paths)
        ? [...config.allowed_dashboard_paths]
        : [],
      background_images: this._normalizeStringValues(config.background_images),
      background_carousel_interval:
        config.background_carousel_interval ?? GLOBAL_DEFAULTS.background_carousel_interval,
    };
    for (const key of DEVICE_CONFIG_KEYS) {
      delete this._globalDraft[key];
    }
  }

  _clients() {
    return Object.values(this._browserConfig?.clients || {}).sort((a, b) =>
      (a.name || a.id).localeCompare(b.name || b.id)
    );
  }

  _activeClient() {
    return this._browserConfig?.clients?.[this._activeClientId] || null;
  }

  _makeDraft() {
    const client = this._activeClient();
    if (!client) {
      this._draft = null;
      return;
    }
    this._draft = {
      name: client.name || client.id,
      enabled: !!client.enabled,
      expose_binary_sensor: !!client.expose_binary_sensor,
      overrides: { ...(client.overrides || {}) },
    };
  }

  _selectClient(clientId) {
    this._activeClientId = clientId;
    this._makeDraft();
    this._render();
  }

  _setDraftValue(key, value) {
    if (!this._draft) return;
    this._draft[key] = value;
  }

  _setOverride(key, value) {
    if (!this._draft) return;
    this._draft.overrides[key] = value;
  }

  _setGlobalValue(key, value) {
    if (!this._globalDraft) return;
    this._globalDraft[key] = value;
  }

  _clientConfigForSave() {
    if (!this._draft) return null;
    const overrides = { ...this._draft.overrides };
    for (const key of VISIBILITY_KEYS) {
      overrides[key] = overrides[key] !== false;
    }
    overrides.background_images = this._normalizeStringValues(overrides.background_images);
    if (overrides.background_mode !== "images") {
      delete overrides.background_images;
      delete overrides.background_carousel_interval;
    }
    if (overrides.background_mode === "inherit") {
      delete overrides.background_mode;
    }
    overrides.status_icon_entities = this._normalizeStatusIconValues(
      overrides.status_icon_entities
    );
    return {
      ...this._draft,
      overrides,
    };
  }

  _globalConfigForSave() {
    if (!this._globalDraft) return null;
    const config = { ...this._globalDraft };
    for (const key of VISIBILITY_KEYS) {
      config[key] = config[key] !== false;
    }
    config.limit_to_dashboards = !!config.limit_to_dashboards;
    config.calendars = this._normalizeEntityValues(config.calendars);
    config.value_entities = this._normalizeEntityValues(config.value_entities);
    config.status_icon_entities = this._normalizeStatusIconValues(
      config.status_icon_entities
    );
    config.allowed_dashboard_paths = Array.isArray(config.allowed_dashboard_paths)
      ? config.allowed_dashboard_paths
      : [];
    config.background_images = this._normalizeStringValues(config.background_images);
    config.background_carousel_interval =
      this._numberOrEmpty(config.background_carousel_interval) ||
      GLOBAL_DEFAULTS.background_carousel_interval;
    for (const key of DEVICE_CONFIG_KEYS) {
      delete config[key];
    }
    return config;
  }

  _entityOptions(domain) {
    const states = this._hass?.states || {};
    return Object.keys(states)
      .filter((entityId) => entityId.startsWith(`${domain}.`))
      .sort()
      .map((entityId) => {
        const state = states[entityId];
        const name = state?.attributes?.friendly_name || entityId;
        return { value: entityId, label: `${name} (${entityId})` };
      });
  }

  _allEntityOptions() {
    const states = this._hass?.states || {};
    return Object.keys(states)
      .sort()
      .map((entityId) => {
        const state = states[entityId];
        const name = state?.attributes?.friendly_name || entityId;
        return { value: entityId, label: `${name} (${entityId})` };
      });
  }

  _notifyOptions() {
    return Object.keys(this._hass?.services?.notify || {})
      .filter((service) => service.startsWith("mobile_app_"))
      .sort()
      .map((service) => `notify.${service}`);
  }

  _dashboardPaths() {
    return Object.entries(this._hass?.panels || {})
      .filter(([, panel]) => panel?.component_name === "lovelace")
      .map(([path, panel]) => {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        const title = panel.title || panel.sidebar_title || normalized;
        return {
          path: normalized,
          title,
          label: `${title} (${normalized})`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  _normalizeDashboardPathValues(values = []) {
    if (Array.isArray(values)) {
      return values.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof values === "string") {
      return values
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  _normalizeStringValues(values = []) {
    if (Array.isArray(values)) {
      return values.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof values === "string") {
      return values
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  _setBackgroundImage(scope, url, enabled) {
    const config = scope === "global" ? this._globalDraft : this._draft?.overrides;
    if (!config || !url) return;

    const current = new Set(this._normalizeStringValues(config.background_images));
    if (enabled) {
      current.add(url);
    } else {
      current.delete(url);
    }
    config.background_images = [...current];

    if (scope !== "global" && enabled) {
      config.background_mode = "images";
    }
    this._render();
  }

  _setDashboardPath(scope, path, enabled) {
    const config = scope === "global" ? this._globalDraft : this._draft?.overrides;
    if (!config || !path) return;

    const values = this._normalizeDashboardPathValues(config.allowed_dashboard_paths);
    const current = new Set(values);

    if (enabled) {
      current.add(path);
    } else {
      current.delete(path);
    }

    config.allowed_dashboard_paths = [...current];
    this._render();
  }

  _renderDashboardButtons(scope, dashboards, selectedPaths = []) {
    const selected = new Set(this._normalizeDashboardPathValues(selectedPaths));

    if (!dashboards.length) {
      return `<div class="muted">${this._html(this._t("emptyDashboards"))}</div>`;
    }

    return `
      <div class="dashboard-buttons">
        ${dashboards
          .map((dashboard) => {
            const isSelected = selected.has(dashboard.path);
            return `
              <button
                class="dashboard-chip ${isSelected ? "active" : ""}"
                data-dashboard-path="${this._html(dashboard.path)}"
                data-dashboard-scope="${this._html(scope)}"
                data-dashboard-selected="${isSelected ? "true" : "false"}"
                title="${this._html(dashboard.label)}"
                type="button"
              >
                <span>${this._html(dashboard.title)}</span>
                ${isSelected ? `<span class="dashboard-chip-remove" title="${this._html(this._t("remove"))}">X</span>` : ""}
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  _renderBackgroundGallery(scope, selectedImages = []) {
    const selected = new Set(this._normalizeStringValues(selectedImages));
    const uploadId = `${scope}-background-upload`;

    return `
      <div class="background-gallery">
        <div class="background-gallery-toolbar">
          <label class="background-upload">
            <span>${this._uploading ? this._html(this._t("uploading")) : this._html(this._t("uploadImages"))}</span>
            <input
              id="${this._html(uploadId)}"
              data-background-upload="${this._html(scope)}"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              ${this._uploading ? "disabled" : ""}
            />
          </label>
          <span class="muted">${this._html(this._t("uploadLimits"))}</span>
        </div>
        ${
          this._backgroundImages.length
            ? `<div class="background-grid">
                ${this._backgroundImages
                  .map((image) => {
                    const checked = selected.has(image.url);
                    const builtin = image.builtin === true;
                    return `
                      <div
                        class="background-card ${checked ? "selected" : ""}"
                        data-background-card="${this._html(scope)}"
                        data-background-url="${this._html(image.url)}"
                        data-background-selected="${checked ? "true" : "false"}"
                      >
                        <img src="${this._html(image.url)}" alt="${this._html(image.filename)}" loading="lazy" />
                        ${builtin ? `<span class="background-badge">${this._html(this._t("defaultBadge"))}</span>` : ""}
                        <label class="checkbox background-select">
                          <input
                            type="checkbox"
                            data-background-toggle="${this._html(scope)}"
                            data-background-url="${this._html(image.url)}"
                            ${checked ? "checked" : ""}
                          />
                          ${this._html(this._t("use"))}
                        </label>
                        <div class="background-card-footer">
                          <span title="${this._html(image.filename)}">${this._html(image.filename)}</span>
                          ${
                            builtin
                              ? ""
                              : `<button
                                  class="secondary small"
                                  type="button"
                                  data-background-delete="${this._html(image.url)}"
                                >
                                  ${this._html(this._t("delete"))}
                                </button>`
                          }
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>`
            : `<div class="entity-empty">${this._html(this._t("emptyBackgrounds"))}</div>`
        }
      </div>
    `;
  }

  _renderEntityPicker(
    id,
    value = "",
    domain = "",
    placeholder = this._t("notSet"),
    attrs = {}
  ) {
    const attrString = Object.entries(attrs)
      .map(([key, attrValue]) => ` ${this._html(key)}="${this._html(attrValue)}"`)
      .join("");
    const domainAttr = domain
      ? ` data-domains="${this._html(Array.isArray(domain) ? domain.join(",") : domain)}"`
      : "";

    return `
      <ha-entity-picker
        id="${this._html(id)}"
        data-value="${this._html(value || "")}"
        data-placeholder="${this._html(placeholder)}"
        ${domainAttr}
        ${attrString}
      ></ha-entity-picker>
    `;
  }

  _renderHaSelect(id, options, value, placeholder = null) {
    const items = placeholder === null ? options : [{ value: "", label: placeholder }, ...options];
    const selectedValue = String(value ?? "");

    return `
      <select
        id="${this._html(id)}"
        class="ha-like-select"
      >
        ${items
          .map(
            (option) => `
              <option
                value="${this._html(option.value)}"
                ${String(option.value) === selectedValue ? "selected" : ""}
              >
                ${this._html(option.label)}
              </option>
            `
          )
          .join("")}
      </select>
    `;
  }

  _normalizeEntityValues(values = []) {
    if (typeof values === "string") {
      return values
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (!Array.isArray(values)) {
      return [];
    }
    return values
      .map((item) => (typeof item === "string" ? item : item?.entity))
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  _normalizeStatusIconValues(values = []) {
    if (typeof values === "string") {
      return values
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((entity) => ({ entity }));
    }
    if (!Array.isArray(values)) {
      return [];
    }
    return values
      .map((item) => {
        if (typeof item === "string") {
          return { entity: item.trim() };
        }
        return {
          entity: String(item?.entity || item?.value || "").trim(),
          icon: String(item?.icon || "").trim(),
        };
      })
      .filter((item) => item.entity)
      .map((item) => (item.icon ? item : { entity: item.entity }));
  }

  _listConfig(scope) {
    return scope === "global" ? this._globalDraft : this._draft?.overrides;
  }

  _addListValue(scope, key, value) {
    const config = this._listConfig(scope);
    if (!config || !value) return;
    if (key === "status_icon_entities") {
      const values = this._normalizeStatusIconValues(config[key]);
      if (!values.some((item) => item.entity === value)) {
        values.push({ entity: value });
      }
      config[key] = values;
      this._render();
      return;
    }
    const values = this._normalizeEntityValues(config[key]);
    if (!values.includes(value)) {
      values.push(value);
    }
    config[key] = values;
    this._render();
  }

  _removeListValue(scope, key, value) {
    const config = this._listConfig(scope);
    if (!config || !value) return;
    if (key === "status_icon_entities") {
      config[key] = this._normalizeStatusIconValues(config[key]).filter(
        (item) => item.entity !== value
      );
      this._render();
      return;
    }
    config[key] = this._normalizeEntityValues(config[key]).filter(
      (item) => item !== value
    );
    this._render();
  }

  _setStatusIconValue(scope, entityId, icon) {
    const config = this._listConfig(scope);
    if (!config || !entityId) return;
    config.status_icon_entities = this._normalizeStatusIconValues(
      config.status_icon_entities
    ).map((item) =>
      item.entity === entityId
        ? icon
          ? { entity: item.entity, icon }
          : { entity: item.entity }
        : item
    );
  }

  _entityIcon(entityId) {
    const state = this._hass?.states?.[entityId];
    if (state?.attributes?.icon) {
      return state.attributes.icon;
    }

    const domain = entityId.split(".", 1)[0];
    const icons = {
      alarm_control_panel: "mdi:shield-home-outline",
      automation: "mdi:robot",
      binary_sensor: "mdi:radiobox-marked",
      calendar: "mdi:calendar",
      camera: "mdi:video",
      climate: "mdi:thermostat",
      cover: "mdi:window-shutter",
      device_tracker: "mdi:account",
      fan: "mdi:fan",
      light: "mdi:lightbulb",
      lock: "mdi:lock",
      media_player: "mdi:speaker",
      number: "mdi:numeric",
      person: "mdi:account",
      scene: "mdi:palette",
      script: "mdi:file-document",
      sensor: "mdi:eye",
      switch: "mdi:toggle-switch",
      weather: "mdi:weather-partly-cloudy",
    };
    return icons[domain] || "mdi:eye";
  }

  _entityName(entityId) {
    return this._hass?.states?.[entityId]?.attributes?.friendly_name || entityId;
  }

  _renderEntityListEditor(
    id,
    key,
    label,
    options,
    values = [],
    scope = "client",
    emptyText = this._t("overridesEmpty"),
    domain = ""
  ) {
    const isStatusIconList = key === "status_icon_entities";
    const selectedValues = isStatusIconList
      ? this._normalizeStatusIconValues(values)
      : this._normalizeEntityValues(values);

    return `
      <div class="entity-list-field">
        <div class="entity-list-header">
          <div class="entity-list-title">${this._html(label)}</div>
          <div class="entity-list-count">${
            selectedValues.length ? `${selectedValues.length} ${this._t("selected")}` : this._t("global")
          }</div>
        </div>
        <div class="entity-list">
          ${
            selectedValues.length
              ? selectedValues
                  .map(
                    (item) => {
                      const entityId = isStatusIconList ? item.entity : item;
                      return `
                      <div class="entity-row">
                        <ha-icon icon="${this._html(item.icon || this._entityIcon(entityId))}"></ha-icon>
                        <div class="entity-text">
                          <div class="entity-name">${this._html(this._entityName(entityId))}</div>
                          <div class="entity-id">${this._html(entityId)}</div>
                          ${
                            isStatusIconList
                              ? `<div class="entity-icon-override">
                                  <div class="entity-icon-override-label">${this._html(this._t("customIcon"))}</div>
                                  <ha-icon-picker
                                    data-status-icon-entity="${this._html(entityId)}"
                                    data-status-icon-scope="${this._html(scope)}"
                                    data-value="${this._html(item.icon || "")}"
                                    label="${this._html(this._t("customIcon"))}"
                                  ></ha-icon-picker>
                                </div>`
                              : ""
                          }
                        </div>
                        <button
                          class="entity-remove"
                          data-remove-list="${this._html(key)}"
                          data-remove-list-scope="${this._html(scope)}"
                          data-remove-value="${this._html(entityId)}"
                          title="${this._html(this._t("removeEntity"))}"
                        >
                          <ha-icon icon="mdi:close"></ha-icon>
                        </button>
                      </div>
                    `;
                    }
                  )
                  .join("")
              : `<div class="entity-empty">${this._html(emptyText)}</div>`
          }
        </div>
        ${this._renderEntityPicker(id, "", domain, this._t("addEntity"), {
          class: "entity-add-picker",
          "data-add-list": key,
          "data-add-list-scope": scope,
        })}
      </div>
    `;
  }

  _booleanSelectValue(value) {
    if (value === true) return "true";
    if (value === false) return "false";
    return "";
  }

  _booleanOrEmpty(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    return "";
  }

  _html(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  _formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(this._language() === "it" ? "it-IT" : "en-US");
  }

  _renderGlobalSettings() {
    const config = this._globalDraft;
    if (!config) {
      return `
        <div class="section">
          <h2>${this._html(this._t("globalSettings"))}</h2>
          <div class="empty">${this._html(this._t("emptyGlobalConfig"))}</div>
        </div>
      `;
    }

    return `
      <div class="section">
        <div class="section-heading split">
          <div>
            <h2>${this._html(this._t("globalSettings"))}</h2>
            <div class="muted">${this._html(this._t("globalSettingsHelp"))}</div>
          </div>
          <button id="save-global-config" ${this._saving ? "disabled" : ""}>${this._html(this._t("saveGlobalSettings"))}</button>
        </div>
        <h3>${this._html(this._t("behavior"))}</h3>
        <div class="grid">
          <label>
            ${this._html(this._t("overlayTimeout"))}
            <input id="global-overlay-idle-timeout" type="number" min="1" step="1" value="${this._html(config.overlay_idle_timeout ?? 60)}" />
          </label>
          <label class="checkbox">
            <input id="global-limit-to-dashboards" type="checkbox" ${config.limit_to_dashboards ? "checked" : ""} />
            ${this._html(this._t("limitToDashboards"))}
          </label>
          <label>
            ${this._html(this._t("dashboardEnabled"))}
            <textarea id="global-allowed-dashboard-paths" placeholder="/lovelace">${this._html(
              Array.isArray(config.allowed_dashboard_paths)
                ? config.allowed_dashboard_paths.join("\n")
                : ""
            )}</textarea>
          </label>
        </div>
        <div class="dashboard-picker">
          <div class="dashboard-picker-title">${this._html(this._t("dashboardAvailable"))}</div>
          ${this._renderDashboardButtons(
            "global",
            this._dashboardPaths(),
            config.allowed_dashboard_paths
          )}
        </div>
        <p class="muted">
          ${this._html(this._t("deviceSettingsNote"))}
        </p>

        <h3>${this._html(this._t("backgroundScreensaver"))}</h3>
        <div class="grid">
          <label>
            ${this._html(this._t("backgroundCarouselInterval"))}
            <input id="global-background-carousel-interval" type="number" min="1" max="3600" step="1" value="${this._html(
              config.background_carousel_interval ?? GLOBAL_DEFAULTS.background_carousel_interval
            )}" />
          </label>
        </div>
        ${this._renderBackgroundGallery("global", config.background_images)}

        <h3>${this._html(this._t("contentsAndBlocks"))}</h3>
        <div class="grid">
          <label>
            ${this._html(this._t("entityWeather"))}
            ${this._renderEntityPicker(
              "global-weather-entity",
              config.weather_entity,
              "weather"
            )}
          </label>
          <label>
            ${this._html(this._t("mainWeatherIconSize"))}
            <input id="global-weather-icon-size" type="number" min="10" max="60" step="1" value="${this._html(config.weather_icon_size ?? 27)}" />
          </label>
          <label>
            ${this._html(this._t("weatherDescriptionSensor"))}
            ${this._renderEntityPicker(
              "global-weather-description-entity",
              config.weather_description_entity,
              "sensor"
            )}
          </label>
          <label>
            ${this._html(this._t("weatherDescriptionTextSize"))}
            <input id="global-weather-description-text-size" type="number" min="1" max="6" step="0.1" value="${this._html(config.weather_description_text_size ?? 1.8)}" />
          </label>
          <label>
            ${this._html(this._t("hourlyForecastBackgroundOpacity"))}
            <input id="global-hourly-forecast-background-opacity" type="number" min="0" max="100" step="1" value="${this._html(config.hourly_forecast_background_opacity ?? GLOBAL_DEFAULTS.hourly_forecast_background_opacity)}" />
          </label>
          <label>
            ${this._html(this._t("internalTemperature"))}
            ${this._renderEntityPicker(
              "global-internal-temperature",
              config.internal_temperature,
              "sensor"
            )}
          </label>
          <label>
            ${this._html(this._t("externalTemperature"))}
            ${this._renderEntityPicker(
              "global-external-temperature",
              config.external_temperature,
              "sensor"
            )}
          </label>
          <label>
            ${this._html(this._t("rainSensor"))}
            ${this._renderEntityPicker("global-rain-sensor", config.rain_sensor, "sensor")}
          </label>
          <label>
            ${this._html(this._t("eventsAndValuesTextSize"))}
            <input id="global-info-text-size" type="number" min="1" max="6" step="0.1" value="${this._html(config.info_text_size ?? 2)}" />
          </label>
          <label>
            ${this._html(this._t("eventsAndValuesLimit"))}
            <input id="global-info-items-limit" type="number" min="1" max="20" step="1" value="${this._html(config.info_items_limit ?? 5)}" />
          </label>
        </div>
        <div class="entity-list-grid">
          ${this._renderEntityListEditor(
            "global-calendars",
            "calendars",
            this._t("calendars"),
            this._entityOptions("calendar"),
            config.calendars,
            "global",
            this._t("emptyCalendars"),
            "calendar"
          )}
          ${this._renderEntityListEditor(
            "global-value-entities",
            "value_entities",
            this._t("valueEntities"),
            this._allEntityOptions(),
            config.value_entities,
            "global",
            this._t("emptyValueEntities")
          )}
          ${this._renderEntityListEditor(
            "global-status-icon-entities",
            "status_icon_entities",
            this._t("statusIconEntities"),
            this._allEntityOptions(),
            config.status_icon_entities,
            "global",
            this._t("emptyStatusIcons")
          )}
        </div>
        <div class="toggles">
          ${this._renderVisibilitySwitch("global-show-status-icons", "show_status_icons", this._t("showStatusIcons"), config)}
          ${this._renderVisibilitySwitch("global-show-weather-icon", "show_weather_icon", this._t("showWeatherIcon"), config)}
          ${this._renderVisibilitySwitch("global-show-clock", "show_clock", this._t("showClock"), config)}
          ${this._renderVisibilitySwitch("global-show-info", "show_info", this._t("showInfo"), config)}
          ${this._renderVisibilitySwitch("global-show-temperatures", "show_temperatures", this._t("showTemperatures"), config)}
          ${this._renderVisibilitySwitch("global-show-hourly-forecast", "show_hourly_forecast", this._t("showHourlyForecast"), config)}
        </div>

        <div class="actions section-actions">
          <button id="save-global-config-bottom" ${this._saving ? "disabled" : ""}>${this._html(this._t("saveGlobalSettings"))}</button>
        </div>
      </div>
    `;
  }

  async _saveSettings() {
    const restrict = !!this.shadowRoot.querySelector("#restrict-enabled")?.checked;
    this._saving = true;
    this._render();
    try {
      const result = await this._sendMessage({
        type: "screensaver_overlay/save_browser_settings",
        settings: { restrict_to_enabled_clients: restrict },
      });
      this._browserConfig = result.browser_config;
      this._error = "";
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._saving = false;
    this._render();
  }

  async _saveGlobalConfig() {
    const config = this._globalConfigForSave();
    if (!config) return;
    this._saving = true;
    this._render();
    try {
      const result = await this._sendMessage({
        type: "screensaver_overlay/save_global_config",
        config,
      });
      this._globalConfig = result.config;
      this._makeGlobalDraft();
      this._error = "";
      window.__screensaverOverlayComponentRefreshConfig?.();
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._saving = false;
    this._render();
  }

  async _saveClient() {
    if (!this._activeClientId || !this._draft) return;
    const clientConfig = this._clientConfigForSave();
    this._saving = true;
    this._render();
    try {
      const result = await this._sendMessage({
        type: "screensaver_overlay/save_browser_client",
        client_id: this._activeClientId,
        client_config: clientConfig,
      });
      this._browserConfig = result.browser_config;
      this._makeDraft();
      this._error = "";
      window.__screensaverOverlayComponentRefreshConfig?.();
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._saving = false;
    this._render();
  }

  async _deleteClient() {
    if (!this._activeClientId) return;
    const clientId = this._activeClientId;
    this._saving = true;
    this._render();
    try {
      const result = await this._sendMessage({
        type: "screensaver_overlay/delete_browser_client",
        client_id: clientId,
      });
      this._browserConfig = result.browser_config;
      this._activeClientId = this._clients()[0]?.id || null;
      this._makeDraft();
      this._error = "";
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._saving = false;
    this._render();
  }

  _resetOverrides() {
    if (!this._draft) return;
    this._draft.overrides = {};
    this._render();
  }

  _render() {
    if (!this.shadowRoot) return;
    const clients = this._clients();
    const activeClient = this._activeClient();
    const draft = this._draft;
    const overrides = draft?.overrides || {};
    const settings = this._browserConfig?.settings || {};
    const dashboards = this._dashboardPaths();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          min-height: 100vh;
          background: var(--primary-background-color);
          color: var(--primary-text-color);
          font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        }
        .page {
          padding: 24px;
          max-width: 1180px;
          margin: 0 auto;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }
        h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 500;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        button {
          border: 0;
          border-radius: 6px;
          padding: 9px 13px;
          background: var(--primary-color);
          color: var(--text-primary-color);
          cursor: pointer;
          font: inherit;
        }
        button.secondary {
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
        }
        button.danger {
          background: var(--error-color, #db4437);
          color: white;
        }
        button.tab {
          background: transparent;
          color: var(--primary-text-color);
          border-bottom: 2px solid transparent;
          border-radius: 0;
        }
        button.tab.active {
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        button.small {
          padding: 5px 9px;
          font-size: 12px;
        }
        .tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          border-bottom: 1px solid var(--divider-color);
          margin-bottom: 20px;
        }
        .client-scope {
          border: 1px solid var(--divider-color);
          border: 1px solid color-mix(in srgb, var(--primary-color) 38%, var(--divider-color));
          border-left: 4px solid var(--primary-color);
          border-radius: 10px;
          padding: 18px;
          margin-bottom: 20px;
          background: var(--card-background-color);
          background: color-mix(in srgb, var(--primary-color) 4%, transparent);
        }
        .client-scope-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 14px;
          margin-bottom: 18px;
          border-bottom: 1px solid var(--divider-color);
        }
        .client-scope-kicker {
          color: var(--primary-color);
          font-size: 13px;
          font-weight: 500;
        }
        .client-scope-title {
          margin-top: 3px;
          color: var(--primary-text-color);
          font-size: 20px;
          font-weight: 500;
        }
        .client-scope-help {
          margin-top: 4px;
          color: var(--secondary-text-color);
          font-size: 13px;
          line-height: 1.4;
        }
        .client-scope-id {
          color: var(--secondary-text-color);
          font-size: 12px;
          text-align: right;
          word-break: break-all;
        }
        @media (max-width: 720px) {
          .client-scope-header {
            flex-direction: column;
          }
          .client-scope-id {
            text-align: left;
          }
        }
        .section {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 18px;
          margin-bottom: 18px;
          background: var(--card-background-color);
        }
        .section h2 {
          margin: 0 0 16px;
          font-size: 17px;
          font-weight: 500;
        }
        .section-heading h2 {
          margin-bottom: 4px;
        }
        .section-heading.split {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }
        h3 {
          margin: 20px 0 12px;
          color: var(--primary-text-color);
          font-size: 15px;
          font-weight: 500;
        }
        h3:first-of-type {
          margin-top: 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(260px, 1fr));
          gap: 16px;
        }
        label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: var(--secondary-text-color);
          font-size: 13px;
        }
        label.checkbox {
          flex-direction: row;
          align-items: center;
          color: var(--primary-text-color);
        }
        input,
        select,
        textarea {
          box-sizing: border-box;
          width: 100%;
          min-height: 56px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          padding: 8px 10px;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          font: inherit;
        }
        select {
          appearance: auto;
          cursor: pointer;
        }
        ha-select,
        ha-entity-picker {
          width: 100%;
        }
        label.checkbox input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          position: relative;
          flex: 0 0 auto;
          width: 46px;
          height: 26px;
          min-height: 26px;
          padding: 0;
          border: 1px solid var(--divider-color);
          border-radius: 999px;
          background: var(--secondary-background-color);
          cursor: pointer;
          transition: background 0.16s ease, border-color 0.16s ease;
        }
        label.checkbox input[type="checkbox"]::before {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          left: 2px;
          top: 2px;
          border-radius: 50%;
          background: var(--primary-text-color);
          opacity: 0.72;
          transition: transform 0.16s ease, opacity 0.16s ease;
        }
        label.checkbox input[type="checkbox"]:checked {
          border-color: var(--primary-color);
          background: var(--primary-color);
        }
        label.checkbox input[type="checkbox"]:checked::before {
          transform: translateX(20px);
          background: var(--text-primary-color, #fff);
          opacity: 1;
        }
        textarea {
          min-height: 92px;
          resize: vertical;
        }
        .toggles {
          display: grid;
          grid-template-columns: repeat(2, minmax(240px, 1fr));
          gap: 10px 16px;
          margin-top: 16px;
        }
        .entity-list-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 20px;
          align-items: start;
        }
        .entity-list-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .entity-list-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 10px;
        }
        .entity-list-title {
          color: var(--primary-text-color);
          font-size: 14px;
          font-weight: 500;
        }
        .entity-list-count {
          color: var(--secondary-text-color);
          font-size: 12px;
          white-space: nowrap;
        }
        .entity-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .entity-row {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr) 34px;
          align-items: center;
          gap: 10px;
          min-height: 52px;
          border-bottom: 1px solid var(--divider-color);
          border-radius: 4px 4px 0 0;
          padding: 0 8px;
          background: var(--secondary-background-color);
        }
        .entity-row ha-icon {
          color: var(--secondary-text-color);
        }
        .entity-text {
          min-width: 0;
        }
        .entity-name {
          color: var(--primary-text-color);
          font-size: 14px;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .entity-id {
          color: var(--secondary-text-color);
          font-size: 12px;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .entity-icon-override {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
        }
        .entity-icon-override-label {
          color: var(--secondary-text-color);
          font-size: 12px;
        }
        .entity-icon-override ha-icon-picker {
          width: 100%;
        }
        .entity-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--primary-text-color);
        }
        .entity-remove ha-icon {
          color: currentColor;
        }
        .entity-empty {
          min-height: 38px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          border: 1px dashed var(--divider-color);
          border-radius: 4px;
          background: transparent;
          color: var(--secondary-text-color);
          font-size: 13px;
        }
        .entity-add-picker {
          min-height: 38px;
        }
        .dashboard-picker {
          margin-top: 14px;
        }
        .dashboard-picker-title {
          margin-bottom: 8px;
          color: var(--secondary-text-color);
          font-size: 13px;
        }
        .dashboard-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        button.dashboard-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
          max-width: 100%;
          padding: 6px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 999px;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          overflow: hidden;
        }
        button.dashboard-chip span:first-child {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        button.dashboard-chip.active {
          border-color: var(--primary-color);
          background: color-mix(in srgb, var(--primary-color) 16%, transparent);
          color: var(--primary-color);
        }
        .dashboard-chip-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          font-size: 12px;
          line-height: 1;
        }
        .background-gallery {
          margin-top: 12px;
        }
        .background-gallery-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 12px;
        }
        .background-upload {
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          width: auto;
          min-height: 36px;
          border-radius: 999px;
          padding: 0 12px;
          background: color-mix(in srgb, var(--primary-color) 14%, transparent);
          color: var(--primary-color);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }
        .background-upload input {
          display: none;
        }
        .background-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 12px;
        }
        .background-card {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--secondary-background-color);
        }
        .background-card.selected {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 1px var(--primary-color) inset;
        }
        .background-card img {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          background: #000;
        }
        .background-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          border-radius: 999px;
          padding: 3px 8px;
          background: rgba(0, 0, 0, 0.72);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
        }
        .background-select {
          padding: 8px 10px 0;
        }
        .background-card-footer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          padding: 8px 10px 10px;
        }
        .background-card-footer span {
          overflow: hidden;
          color: var(--secondary-text-color);
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .section-actions {
          margin-top: 18px;
        }
        .muted {
          color: var(--secondary-text-color);
          font-size: 13px;
        }
        .help {
          border-left: 3px solid var(--primary-color);
          padding: 12px 14px;
          background: var(--secondary-background-color);
          color: var(--secondary-text-color);
          line-height: 1.45;
          margin-bottom: 18px;
        }
        .help strong {
          color: var(--primary-text-color);
          font-weight: 500;
        }
        .status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--disabled-text-color, #777);
        }
        .dot.on {
          background: var(--success-color, #43a047);
        }
        .empty,
        .error {
          padding: 16px;
          border-radius: 8px;
          background: var(--secondary-background-color);
        }
        .error {
          color: var(--error-color, #db4437);
          margin-bottom: 16px;
        }
        @media (max-width: 760px) {
          .page {
            padding: 16px;
          }
          .grid {
            grid-template-columns: 1fr;
          }
          .toggles {
            grid-template-columns: 1fr;
          }
          .entity-list-grid {
            grid-template-columns: 1fr;
          }
          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }
          .section-heading.split {
            flex-direction: column;
          }
        }
        @media (min-width: 761px) and (max-width: 1180px) {
          .entity-list-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      </style>
      <div class="page">
        <div class="topbar">
          <div>
            <h1>Screensaver Overlay</h1>
            <div class="muted">${this._html(this._t("titleHelp"))}</div>
          </div>
          <div class="actions">
            <button class="secondary" id="reload" ${this._saving ? "disabled" : ""}>${this._html(this._t("reload"))}</button>
            <button id="save-client" ${!draft || this._saving ? "disabled" : ""}>${this._html(this._t("saveBrowser"))}</button>
          </div>
        </div>

        ${this._error ? `<div class="error">${this._html(this._error)}</div>` : ""}

        <div class="help">
          <strong>${this._html(this._t("globalOptions"))}:</strong> ${this._html(this._t("globalOptionsHelp"))}
        </div>

        ${this._renderGlobalSettings()}

        <div class="section">
          <h2>${this._html(this._t("globalBrowserRule"))}</h2>
          <label class="checkbox">
            <input id="restrict-enabled" type="checkbox" ${
              settings.restrict_to_enabled_clients ? "checked" : ""
            } />
            ${this._html(this._t("restrictEnabledClients"))}
          </label>
          <p class="muted">
            ${this._html(this._t("globalBrowserRuleHelp"))}
          </p>
          <button class="secondary" id="save-settings" ${
            this._saving ? "disabled" : ""
          }>${this._html(this._t("saveBrowserRule"))}</button>
        </div>

        ${
          clients.length
            ? `<div class="tabs">
                ${clients
                  .map(
                    (client) => `
                      <button class="tab ${
                        client.id === this._activeClientId ? "active" : ""
                      }" data-client-id="${this._html(client.id)}">
                        ${this._html(client.name || client.id)}
                        <span class="status">
                          <span class="dot ${client.enabled ? "on" : ""}"></span>
                        </span>
                      </button>
                    `
                  )
                  .join("")}
              </div>`
            : `<div class="empty">${this._html(this._t("emptyBrowsers"))}</div>`
        }

        ${
          activeClient && draft
            ? this._renderClientForm(activeClient, draft, overrides, dashboards)
            : ""
        }
      </div>
    `;

    this._setupHaControls();
    this._wireEvents();
  }

  _setupHaControls() {
    this.shadowRoot.querySelectorAll("ha-entity-picker").forEach((picker) => {
      picker.hass = this._hass;
      picker.value = picker.dataset.value || "";
      picker.placeholder = picker.dataset.placeholder || "";
      picker.allowCustomEntity = true;

      const domains = picker.dataset.domains
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (domains?.length) {
        picker.includeDomains = domains;
      }
    });

    this.shadowRoot.querySelectorAll("ha-icon-picker").forEach((picker) => {
      picker.hass = this._hass;
      picker.value = picker.dataset.value || "";
      picker.label = picker.getAttribute("label") || "";
    });

    this.shadowRoot.querySelectorAll("ha-select").forEach((select) => {
      const applyValue = () => {
        const value = select.dataset.value ?? "";
        select.value = value;
        select.querySelectorAll("mwc-list-item").forEach((item) => {
          item.selected = (item.getAttribute("value") ?? item.value ?? "") === value;
        });
      };
      applyValue();
      window.requestAnimationFrame(applyValue);
    });
  }

  _renderClientForm(client, draft, overrides, dashboards) {
    const backgroundMode = overrides.background_mode || "inherit";

    return `
      <div class="client-scope">
        <div class="client-scope-header">
          <div>
            <div class="client-scope-kicker">${this._html(this._t("clientConfiguration"))}</div>
            <div class="client-scope-title">${this._html(draft.name || client.name || client.id)}</div>
            <div class="client-scope-help">
              ${this._html(this._t("clientConfigurationHelp"))}
            </div>
          </div>
          <div class="client-scope-id">
            Client ID<br />${this._html(client.id)}
          </div>
        </div>

        <div class="section">
          <h2>Browser</h2>
          <div class="grid">
            <label>
              ${this._html(this._t("browserName"))}
              <input id="client-name" value="${this._html(draft.name)}" />
            </label>
            <label class="checkbox">
              <input id="client-enabled" type="checkbox" ${
                draft.enabled ? "checked" : ""
              } />
              ${this._html(this._t("screensaverEnabled"))}
            </label>
            <label class="checkbox">
              <input id="client-expose-binary-sensor" type="checkbox" ${
                draft.expose_binary_sensor ? "checked" : ""
              } />
              ${this._html(this._t("binarySensor"))}
            </label>
            <div>
              <div class="muted">Client ID</div>
              <div>${this._html(client.id)}</div>
            </div>
            <div>
              <div class="muted">${this._html(this._t("lastSeen"))}</div>
              <div>${this._html(this._formatDate(client.last_seen))}</div>
            </div>
            <div>
              <div class="muted">${this._html(this._t("lastPath"))}</div>
              <div>${this._html(client.last_path || "-")}</div>
            </div>
            <div>
              <div class="muted">${this._html(this._t("platform"))}</div>
              <div>${this._html(client.platform || "-")}</div>
            </div>
          </div>
        </div>

      <div class="section">
        <h2>${this._html(this._t("browserBehavior"))}</h2>
        <p class="muted">
          ${this._html(this._t("browserBehaviorHelp"))}
        </p>
        <div class="grid">
          <label>
            ${this._html(this._t("overlayTimeout"))}
            <input id="overlay-idle-timeout" type="number" min="1" step="1" value="${this._html(
              overrides.overlay_idle_timeout ?? ""
            )}" placeholder="${this._html(this._t("global"))}" />
          </label>
          <label>
            ${this._html(this._t("screenOffTimeout"))}
            <input id="screen-off-timeout" type="number" min="0" step="1" value="${this._html(
              overrides.screen_off_timeout ?? ""
            )}" placeholder="${this._html(this._t("notSet"))}" />
          </label>
          <label>
            ${this._html(this._t("motionSensor"))}
            ${this._renderEntityPicker(
              "motion-sensor",
              overrides.motion_sensor,
              "binary_sensor"
            )}
          </label>
          ${this._renderScreenSwitchField(overrides)}
          <label>
            ${this._html(this._t("limitToDashboards"))}
            ${this._renderHaSelect(
              "limit-to-dashboards",
              [
                { value: "true", label: this._t("yes") },
                { value: "false", label: this._t("no") },
              ],
              this._booleanSelectValue(overrides.limit_to_dashboards),
              this._t("useGlobalValue")
            )}
          </label>
          <label>
            ${this._html(this._t("dashboardEnabled"))}
            <textarea id="allowed-dashboard-paths" placeholder="/lovelace">${this._html(
              Array.isArray(overrides.allowed_dashboard_paths)
                ? overrides.allowed_dashboard_paths.join("\n")
                : ""
            )}</textarea>
          </label>
        </div>
        <div class="dashboard-picker">
          <div class="dashboard-picker-title">${this._html(this._t("dashboardAvailable"))}</div>
          ${this._renderDashboardButtons(
            "client",
            dashboards,
            overrides.allowed_dashboard_paths
          )}
        </div>
      </div>

      <div class="section">
        <h2>${this._html(this._t("brightnessDevice"))}</h2>
        <p class="muted">
          ${this._html(this._t("brightnessDeviceHelp"))}
        </p>
        ${this._renderBrightnessSettings(overrides)}
      </div>

      <div class="section">
        <h2>${this._html(this._t("backgroundScreensaver"))}</h2>
        <p class="muted">
          ${this._html(this._t("backgroundScreensaverHelp"))}
        </p>
        <div class="grid">
          <label>
            ${this._html(this._t("backgroundMode"))}
            ${this._renderHaSelect(
              "background-mode",
              this._backgroundModeOptions(),
              backgroundMode,
              null
            )}
          </label>
          ${
            backgroundMode === "images"
              ? `<label>
                  ${this._html(this._t("backgroundCarouselInterval"))}
                  <input id="background-carousel-interval" type="number" min="1" max="3600" step="1" value="${this._html(
                    overrides.background_carousel_interval ?? ""
                  )}" placeholder="${this._html(this._t("global"))}" />
                </label>`
              : ""
          }
        </div>
        ${
          backgroundMode === "images"
            ? this._renderBackgroundGallery("client", overrides.background_images)
            : `<p class="muted">${
                backgroundMode === "black"
                  ? this._html(this._t("backgroundAlwaysBlack"))
                  : this._html(this._t("backgroundInherited"))
              }</p>`
        }
      </div>

      <div class="section">
        <h2>${this._html(this._t("contentsAndBlocks"))}</h2>
        <div class="grid">
          <label>
            ${this._html(this._t("entityWeather"))}
            ${this._renderEntityPicker("weather-entity", overrides.weather_entity, "weather")}
          </label>
          <label>
            ${this._html(this._t("mainWeatherIconSize"))}
            <input id="weather-icon-size" type="number" min="10" max="60" step="1" value="${this._html(
              overrides.weather_icon_size ?? ""
            )}" placeholder="${this._html(this._t("global"))}" />
          </label>
          <label>
            ${this._html(this._t("weatherDescriptionSensor"))}
            ${this._renderEntityPicker(
              "weather-description-entity",
              overrides.weather_description_entity,
              "sensor",
              this._t("useGlobalValue")
            )}
          </label>
          <label>
            ${this._html(this._t("weatherDescriptionTextSize"))}
            <input id="weather-description-text-size" type="number" min="1" max="6" step="0.1" value="${this._html(
              overrides.weather_description_text_size ?? ""
            )}" placeholder="${this._html(this._t("global"))}" />
          </label>
          <label>
            ${this._html(this._t("hourlyForecastBackgroundOpacity"))}
            <input id="hourly-forecast-background-opacity" type="number" min="0" max="100" step="1" value="${this._html(
              overrides.hourly_forecast_background_opacity ?? ""
            )}" placeholder="${this._html(this._t("global"))}" />
          </label>
          <label>
            ${this._html(this._t("internalTemperature"))}
            ${this._renderEntityPicker(
              "internal-temperature",
              overrides.internal_temperature,
              "sensor",
              this._t("useGlobalValue")
            )}
          </label>
          <label>
            ${this._html(this._t("externalTemperature"))}
            ${this._renderEntityPicker(
              "external-temperature",
              overrides.external_temperature,
              "sensor",
              this._t("useGlobalValue")
            )}
          </label>
          <label>
            ${this._html(this._t("rainSensor"))}
            ${this._renderEntityPicker(
              "rain-sensor",
              overrides.rain_sensor,
              "sensor",
              this._t("useGlobalValue")
            )}
          </label>
          <label>
            ${this._html(this._t("eventsAndValuesTextSize"))}
            <input id="info-text-size" type="number" min="1" max="6" step="0.1" value="${this._html(
              overrides.info_text_size ?? ""
            )}" placeholder="${this._html(this._t("global"))}" />
          </label>
          <label>
            ${this._html(this._t("eventsAndValuesLimit"))}
            <input id="info-items-limit" type="number" min="1" max="20" step="1" value="${this._html(
              overrides.info_items_limit ?? ""
            )}" placeholder="${this._html(this._t("global"))}" />
          </label>
        </div>
        <div class="entity-list-grid">
          ${this._renderEntityListEditor(
            "calendars",
            "calendars",
            this._t("calendars"),
            this._entityOptions("calendar"),
            overrides.calendars,
            "client",
            this._t("overridesEmpty"),
            "calendar"
          )}
          ${this._renderEntityListEditor(
            "value-entities",
            "value_entities",
            this._t("valueEntities"),
            this._allEntityOptions(),
            overrides.value_entities
          )}
          ${this._renderEntityListEditor(
            "status-icon-entities",
            "status_icon_entities",
            this._t("statusIconEntities"),
            this._allEntityOptions(),
            overrides.status_icon_entities
          )}
        </div>
        <div class="toggles">
          ${this._renderVisibilitySwitch("show-status-icons", "show_status_icons", this._t("showStatusIcons"), overrides)}
          ${this._renderVisibilitySwitch("show-weather-icon", "show_weather_icon", this._t("showWeatherIcon"), overrides)}
          ${this._renderVisibilitySwitch("show-clock", "show_clock", this._t("showClock"), overrides)}
          ${this._renderVisibilitySwitch("show-info", "show_info", this._t("showInfo"), overrides)}
          ${this._renderVisibilitySwitch("show-temperatures", "show_temperatures", this._t("showTemperatures"), overrides)}
          ${this._renderVisibilitySwitch("show-hourly-forecast", "show_hourly_forecast", this._t("showHourlyForecast"), overrides)}
        </div>
        <p class="muted">
          ${this._html(this._t("overridesHint"))}
        </p>
      </div>

      <div class="actions">
        <button id="save-client-bottom" ${this._saving ? "disabled" : ""}>${this._html(this._t("saveBrowser"))}</button>
        <button class="secondary" id="reset-overrides" ${
          this._saving ? "disabled" : ""
        }>${this._html(this._t("resetOverrides"))}</button>
        <button class="danger" id="delete-client" ${
          this._saving ? "disabled" : ""
        }>${this._html(this._t("deleteBrowser"))}</button>
      </div>
      </div>
    `;
  }

  _renderVisibilitySwitch(id, key, label, overrides) {
    return `
      <label class="checkbox">
        <input id="${id}" type="checkbox" ${overrides[key] !== false ? "checked" : ""} />
        ${this._html(label)}
      </label>
    `;
  }

  _renderScreenSwitchField(overrides) {
    if ((overrides.brightness_mode || "disabled") === "fully") {
      return `
        <div class="muted">
          ${this._html(this._t("fullyScreenSwitchHelp"))}
        </div>
      `;
    }

    return `
      <label>
        ${this._html(this._t("screenSwitch"))}
        ${this._renderEntityPicker("screen-switch", overrides.screen_switch, "switch")}
      </label>
    `;
  }

  _renderBrightnessSettings(overrides) {
    const mode = overrides.brightness_mode || "disabled";
    const strategy = overrides.brightness_strategy || "percentage";
    const restoreAuto = overrides.restore_auto_brightness === true;
    const modeField = `
      <label>
        ${this._html(this._t("brightnessManagement"))}
        ${this._renderHaSelect("brightness-mode", this._brightnessModeOptions(), mode, null)}
      </label>
    `;

    if (mode === "disabled") {
      return `
        <div class="grid">${modeField}</div>
        <p class="muted">${this._html(this._t("brightnessScreenUnchanged"))}</p>
      `;
    }

    return `
      <div class="grid">
        ${modeField}
        <label>
          ${this._html(this._t("strategy"))}
          ${this._renderHaSelect(
            "brightness-strategy",
            this._brightnessStrategyOptions(),
            strategy,
            null
          )}
        </label>
        ${this._renderBrightnessStrategyFields(overrides, strategy)}
        ${mode === "companion" ? this._renderCompanionBrightnessFields(overrides) : ""}
        ${mode === "fully" ? this._renderFullyBrightnessFields(overrides) : ""}
        ${
          strategy === "fixed"
            ? ""
            : `<label class="checkbox">
                <input id="restore-auto-brightness" type="checkbox" ${
                  restoreAuto ? "checked" : ""
                } />
                ${this._html(this._t("restoreAutoBrightness"))}
              </label>`
        }
      </div>
      <p class="muted">
        ${
          mode === "companion"
            ? this._html(this._t("brightnessCompanionHelp"))
            : this._html(this._t("brightnessFullyHelp"))
        }
      </p>
    `;
  }

  _renderBrightnessStrategyFields(overrides, strategy) {
    if (strategy === "fixed") {
      return `
        <label>
          ${this._html(this._t("brightnessScreensaverValue"))}
          <input id="brightness-screensaver-value" type="number" min="0" max="255" step="1" value="${this._html(
            overrides.brightness_screensaver_value ?? ""
          )}" placeholder="Esempio: 20" />
          <span class="muted">${this._html(this._t("optionalDefault"))}</span>
        </label>
        <label>
          ${this._html(this._t("brightnessDashboardValue"))}
          <input id="brightness-screen-value" type="number" min="0" max="255" step="1" value="${this._html(
            overrides.brightness_screen_value ?? ""
          )}" placeholder="Esempio: 180" />
          <span class="muted">${this._html(this._t("optionalDefault"))}</span>
        </label>
      `;
    }

    return `
      <label>
        ${
          strategy === "logarithmic"
            ? this._html(this._t("brightnessLogarithmicIntensity"))
            : this._html(this._t("brightnessReduction"))
        }
        <input id="brightness-reduction" type="number" min="0" max="100" step="1" value="${this._html(
          overrides.brightness_reduction_percentage ?? ""
        )}" placeholder="Default se vuoto: 80" />
        <span class="muted">${
          strategy === "logarithmic"
            ? this._html(this._t("brightnessLogarithmicHelp"))
            : this._html(this._t("brightnessPercentageHelp"))
        }</span>
      </label>
      ${
        strategy === "logarithmic"
          ? `<label>
              ${this._html(this._t("brightnessLogarithmicMinimum"))}
              <input id="brightness-logarithmic-min-value" type="number" min="0" max="255" step="1" value="${this._html(
                overrides.brightness_logarithmic_min_value ?? ""
              )}" placeholder="Default se vuoto: 1" />
              <span class="muted">${this._html(this._t("brightnessLogarithmicMinimumHelp"))}</span>
            </label>`
          : ""
      }
    `;
  }

  _renderCompanionBrightnessFields(overrides) {
    const strategy = overrides.brightness_strategy || "percentage";
    return `
      <label>
        ${this._html(this._t("companionNotifyService"))}
        ${this._renderHaSelect(
          "companion-notify-service",
          this._notifyOptions().map((item) => ({ value: item, label: item })),
          overrides.companion_notify_service || "",
          this._t("notSet")
        )}
      </label>
      ${
        strategy === "percentage"
          ? `<label>
              ${this._html(this._t("companionBrightnessSensor"))}
              ${this._renderEntityPicker(
                "companion-brightness-sensor",
                overrides.companion_brightness_sensor,
                "sensor"
              )}
            </label>`
          : ""
      }
    `;
  }

  _renderFullyBrightnessFields(overrides) {
    const fullyPort = overrides.fully_port || 2323;

    return `
      <label>
        ${this._html(this._t("fullyHost"))}
        <input id="fully-host" value="${this._html(
          overrides.fully_host ?? ""
        )}" />
        <span class="muted">${this._html(this._t("fullyHostHelp"))}</span>
      </label>
      <label>
        ${this._html(this._t("fullyPort"))}
        <input id="fully-port" type="number" min="1" max="65535" step="1" value="${this._html(
          fullyPort
        )}" />
        <span class="muted">${this._html(this._t("fullyPortHelp"))}</span>
      </label>
      <label>
        ${this._html(this._t("fullyPassword"))}
        <input id="fully-password" type="password" value="${this._html(
          overrides.fully_password ?? ""
        )}" />
      </label>
      <label class="checkbox">
        <input id="fully-use-https" type="checkbox" ${
          overrides.fully_use_https === true ? "checked" : ""
        } />
        ${this._html(this._t("fullyHttps"))}
      </label>
    `;
  }

  _wireEvents() {
    this.shadowRoot.querySelector("#reload")?.addEventListener("click", () => this._load());
    this.shadowRoot
      .querySelector("#save-settings")
      ?.addEventListener("click", () => this._saveSettings());
    this.shadowRoot
      .querySelector("#save-global-config")
      ?.addEventListener("click", () => this._saveGlobalConfig());
    this.shadowRoot
      .querySelector("#save-global-config-bottom")
      ?.addEventListener("click", () => this._saveGlobalConfig());
    this.shadowRoot
      .querySelector("#save-client")
      ?.addEventListener("click", () => this._saveClient());
    this.shadowRoot
      .querySelector("#save-client-bottom")
      ?.addEventListener("click", () => this._saveClient());
    this.shadowRoot
      .querySelector("#reset-overrides")
      ?.addEventListener("click", () => this._resetOverrides());
    this.shadowRoot
      .querySelector("#delete-client")
      ?.addEventListener("click", () => this._deleteClient());

    this.shadowRoot.querySelectorAll("[data-client-id]").forEach((button) => {
      button.addEventListener("click", () =>
        this._selectClient(button.getAttribute("data-client-id"))
      );
    });
    this.shadowRoot.querySelectorAll("[data-dashboard-path]").forEach((button) => {
      button.addEventListener("click", (ev) => {
        const isSelected = button.dataset.dashboardSelected === "true";
        if (isSelected && !ev.target.closest(".dashboard-chip-remove")) {
          return;
        }
        this._setDashboardPath(
          button.dataset.dashboardScope || "client",
          button.dataset.dashboardPath,
          !isSelected
        );
      });
    });
    this.shadowRoot.querySelectorAll("[data-background-upload]").forEach((input) => {
      input.addEventListener("change", (ev) =>
        this._uploadBackgroundFiles(ev.target.files)
      );
    });
    this.shadowRoot.querySelectorAll("[data-background-toggle]").forEach((checkbox) => {
      checkbox.addEventListener("change", () =>
        this._setBackgroundImage(
          checkbox.dataset.backgroundToggle,
          checkbox.dataset.backgroundUrl,
          checkbox.checked
        )
      );
    });
    this.shadowRoot.querySelectorAll("[data-background-card]").forEach((card) => {
      card.addEventListener("click", (ev) => {
        if (ev.target.closest("button, input, label")) {
          return;
        }
        this._setBackgroundImage(
          card.dataset.backgroundCard,
          card.dataset.backgroundUrl,
          card.dataset.backgroundSelected !== "true"
        );
      });
    });
    this.shadowRoot.querySelectorAll("[data-background-delete]").forEach((button) => {
      button.addEventListener("click", () =>
        this._deleteBackgroundImage(button.dataset.backgroundDelete)
      );
    });

    const bindInput = (id, fn) => {
      this.shadowRoot.querySelector(id)?.addEventListener("input", fn);
    };
    const bindChange = (id, fn) => {
      this.shadowRoot.querySelector(id)?.addEventListener("change", fn);
    };
    const controlValue = (ev) => ev.detail?.value ?? ev.target?.value ?? "";
    const selectValue = (element, ev) => {
      if (ev?.detail?.value !== undefined) {
        return ev.detail.value;
      }

      const items = [...element.querySelectorAll("mwc-list-item")];
      const detailIndex = Number(ev?.detail?.index);
      const selectedIndex = Number.isInteger(detailIndex)
        ? detailIndex
        : Number.isInteger(element.selected)
          ? element.selected
          : -1;

      if (selectedIndex >= 0 && items[selectedIndex]) {
        return items[selectedIndex].getAttribute("value") ?? items[selectedIndex].value ?? "";
      }

      const selectedItem = items.find((item) => item.selected);
      if (selectedItem) {
        return selectedItem.getAttribute("value") ?? selectedItem.value ?? "";
      }

      return element.value ?? "";
    };
    const bindValueChanged = (id, fn) => {
      this.shadowRoot
        .querySelector(id)
        ?.addEventListener("value-changed", (ev) => fn(controlValue(ev)));
    };
    const bindSelectValue = (id, fn) => {
      const element = this.shadowRoot.querySelector(id);
      if (!element) return;
      const handler = (ev) => {
        window.setTimeout(() => fn(selectValue(element, ev)), 0);
      };
      element.addEventListener("change", handler);
      element.addEventListener("selected", handler);
      element.addEventListener("value-changed", handler);
    };

    bindInput("#client-name", (ev) => this._setDraftValue("name", ev.target.value));
    bindChange("#client-enabled", (ev) =>
      this._setDraftValue("enabled", ev.target.checked)
    );
    bindChange("#client-expose-binary-sensor", (ev) =>
      this._setDraftValue("expose_binary_sensor", ev.target.checked)
    );
    bindInput("#global-overlay-idle-timeout", (ev) =>
      this._setGlobalValue("overlay_idle_timeout", this._numberOrEmpty(ev.target.value))
    );
    bindChange("#global-limit-to-dashboards", (ev) =>
      this._setGlobalValue("limit_to_dashboards", ev.target.checked)
    );
    bindInput("#global-allowed-dashboard-paths", (ev) =>
      this._setGlobalValue(
        "allowed_dashboard_paths",
        this._normalizeDashboardPathValues(ev.target.value)
      )
    );
    bindInput("#global-background-carousel-interval", (ev) =>
      this._setGlobalValue(
        "background_carousel_interval",
        this._numberOrEmpty(ev.target.value)
      )
    );
    bindValueChanged("#global-weather-entity", (value) =>
      this._setGlobalValue("weather_entity", value)
    );
    bindInput("#global-weather-icon-size", (ev) =>
      this._setGlobalValue("weather_icon_size", this._numberOrEmpty(ev.target.value))
    );
    bindValueChanged("#global-weather-description-entity", (value) =>
      this._setGlobalValue("weather_description_entity", value)
    );
    bindInput("#global-weather-description-text-size", (ev) =>
      this._setGlobalValue(
        "weather_description_text_size",
        this._numberOrEmpty(ev.target.value)
      )
    );
    bindInput("#global-hourly-forecast-background-opacity", (ev) =>
      this._setGlobalValue(
        "hourly_forecast_background_opacity",
        this._numberOrEmpty(ev.target.value)
      )
    );
    bindValueChanged("#global-internal-temperature", (value) =>
      this._setGlobalValue("internal_temperature", value)
    );
    bindValueChanged("#global-external-temperature", (value) =>
      this._setGlobalValue("external_temperature", value)
    );
    bindValueChanged("#global-rain-sensor", (value) =>
      this._setGlobalValue("rain_sensor", value)
    );
    bindInput("#global-info-text-size", (ev) =>
      this._setGlobalValue("info_text_size", this._numberOrEmpty(ev.target.value))
    );
    bindInput("#global-info-items-limit", (ev) =>
      this._setGlobalValue("info_items_limit", this._numberOrEmpty(ev.target.value))
    );
    bindChange("#global-show-status-icons", (ev) =>
      this._setGlobalValue("show_status_icons", ev.target.checked)
    );
    bindChange("#global-show-weather-icon", (ev) =>
      this._setGlobalValue("show_weather_icon", ev.target.checked)
    );
    bindChange("#global-show-clock", (ev) =>
      this._setGlobalValue("show_clock", ev.target.checked)
    );
    bindChange("#global-show-info", (ev) =>
      this._setGlobalValue("show_info", ev.target.checked)
    );
    bindChange("#global-show-temperatures", (ev) =>
      this._setGlobalValue("show_temperatures", ev.target.checked)
    );
    bindChange("#global-show-hourly-forecast", (ev) =>
      this._setGlobalValue("show_hourly_forecast", ev.target.checked)
    );
    bindInput("#overlay-idle-timeout", (ev) =>
      this._setOverride("overlay_idle_timeout", this._numberOrEmpty(ev.target.value))
    );
    bindInput("#screen-off-timeout", (ev) =>
      this._setOverride("screen_off_timeout", this._numberOrEmpty(ev.target.value))
    );
    bindValueChanged("#motion-sensor", (value) => this._setOverride("motion_sensor", value));
    bindValueChanged("#screen-switch", (value) => this._setOverride("screen_switch", value));
    bindSelectValue("#limit-to-dashboards", (value) =>
      this._setOverride("limit_to_dashboards", this._booleanOrEmpty(value))
    );
    bindInput("#allowed-dashboard-paths", (ev) =>
      this._setOverride(
        "allowed_dashboard_paths",
        this._normalizeDashboardPathValues(ev.target.value)
      )
    );
    bindSelectValue("#background-mode", (value) => {
      this._setOverride("background_mode", value || "inherit");
      this._render();
    });
    bindInput("#background-carousel-interval", (ev) =>
      this._setOverride(
        "background_carousel_interval",
        this._numberOrEmpty(ev.target.value)
      )
    );
    bindValueChanged("#weather-entity", (value) =>
      this._setOverride("weather_entity", value)
    );
    bindInput("#weather-icon-size", (ev) =>
      this._setOverride("weather_icon_size", this._numberOrEmpty(ev.target.value))
    );
    bindValueChanged("#weather-description-entity", (value) =>
      this._setOverride("weather_description_entity", value)
    );
    bindInput("#weather-description-text-size", (ev) =>
      this._setOverride(
        "weather_description_text_size",
        this._numberOrEmpty(ev.target.value)
      )
    );
    bindInput("#hourly-forecast-background-opacity", (ev) =>
      this._setOverride(
        "hourly_forecast_background_opacity",
        this._numberOrEmpty(ev.target.value)
      )
    );
    bindValueChanged("#internal-temperature", (value) =>
      this._setOverride("internal_temperature", value)
    );
    bindValueChanged("#external-temperature", (value) =>
      this._setOverride("external_temperature", value)
    );
    bindValueChanged("#rain-sensor", (value) => this._setOverride("rain_sensor", value));
    bindInput("#info-text-size", (ev) =>
      this._setOverride("info_text_size", this._numberOrEmpty(ev.target.value))
    );
    bindInput("#info-items-limit", (ev) =>
      this._setOverride("info_items_limit", this._numberOrEmpty(ev.target.value))
    );
    this.shadowRoot.querySelectorAll("[data-add-list]").forEach((picker) => {
      picker.addEventListener("value-changed", (ev) =>
        this._addListValue(
          picker.dataset.addListScope || "client",
          picker.dataset.addList,
          controlValue(ev)
        )
      );
    });
    this.shadowRoot.querySelectorAll("[data-remove-list][data-remove-value]").forEach((button) => {
      button.addEventListener("click", () =>
        this._removeListValue(
          button.dataset.removeListScope || "client",
          button.dataset.removeList,
          button.dataset.removeValue
        )
      );
    });
    this.shadowRoot.querySelectorAll("[data-status-icon-entity]").forEach((picker) => {
      picker.addEventListener("value-changed", (ev) =>
        this._setStatusIconValue(
          picker.dataset.statusIconScope || "client",
          picker.dataset.statusIconEntity,
          String(ev.detail?.value || "").trim()
        )
      );
    });
    bindChange("#show-status-icons", (ev) =>
      this._setOverride("show_status_icons", ev.target.checked)
    );
    bindChange("#show-weather-icon", (ev) =>
      this._setOverride("show_weather_icon", ev.target.checked)
    );
    bindChange("#show-clock", (ev) =>
      this._setOverride("show_clock", ev.target.checked)
    );
    bindChange("#show-info", (ev) =>
      this._setOverride("show_info", ev.target.checked)
    );
    bindChange("#show-temperatures", (ev) =>
      this._setOverride("show_temperatures", ev.target.checked)
    );
    bindChange("#show-hourly-forecast", (ev) =>
      this._setOverride("show_hourly_forecast", ev.target.checked)
    );
    bindSelectValue("#brightness-mode", (value) => {
      this._setOverride("brightness_mode", value);
      this._render();
    });
    bindSelectValue("#brightness-strategy", (value) => {
      this._setOverride("brightness_strategy", value);
      this._render();
    });
    bindSelectValue("#companion-notify-service", (value) =>
      this._setOverride("companion_notify_service", value)
    );
    bindValueChanged("#companion-brightness-sensor", (value) =>
      this._setOverride("companion_brightness_sensor", value)
    );
    bindInput("#brightness-reduction", (ev) =>
      this._setOverride(
        "brightness_reduction_percentage",
        this._numberOrEmpty(ev.target.value)
      )
    );
    bindInput("#brightness-logarithmic-min-value", (ev) =>
      this._setOverride(
        "brightness_logarithmic_min_value",
        this._numberOrEmpty(ev.target.value)
      )
    );
    bindInput("#brightness-screen-value", (ev) =>
      this._setOverride("brightness_screen_value", this._numberOrEmpty(ev.target.value))
    );
    bindInput("#brightness-screensaver-value", (ev) =>
      this._setOverride(
        "brightness_screensaver_value",
        this._numberOrEmpty(ev.target.value)
      )
    );
    bindInput("#fully-host", (ev) =>
      this._setOverride("fully_host", ev.target.value.trim())
    );
    bindInput("#fully-port", (ev) =>
      this._setOverride("fully_port", this._numberOrEmpty(ev.target.value))
    );
    bindInput("#fully-password", (ev) =>
      this._setOverride("fully_password", ev.target.value)
    );
    bindChange("#restore-auto-brightness", (ev) => {
      this._setOverride("restore_auto_brightness", ev.target.checked);
      this._render();
    });
    bindChange("#fully-use-https", (ev) =>
      this._setOverride("fully_use_https", ev.target.checked)
    );
  }

  _numberOrEmpty(value) {
    if (value === "") {
      return "";
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : "";
  }

}

customElements.define("screensaver-overlay-panel", ScreensaverOverlayPanel);
