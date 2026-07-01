"""Constants for the Screensaver Overlay integration."""

DOMAIN = "screensaver_overlay"

CONF_WEATHER_ENTITY = "weather_entity"
CONF_WEATHER_ICON_SIZE = "weather_icon_size"
CONF_WEATHER_DESCRIPTION_ENTITY = "weather_description_entity"
CONF_WEATHER_DESCRIPTION_TEXT_SIZE = "weather_description_text_size"
CONF_INTERNAL_TEMPERATURE = "internal_temperature"
CONF_EXTERNAL_TEMPERATURE = "external_temperature"
CONF_RAIN_SENSOR = "rain_sensor"
CONF_CALENDARS = "calendars"
CONF_VALUE_ENTITIES = "value_entities"
CONF_STATUS_ICON_ENTITIES = "status_icon_entities"
CONF_OVERLAY_IDLE_TIMEOUT = "overlay_idle_timeout"
CONF_SCREEN_OFF_TIMEOUT = "screen_off_timeout"
CONF_MOTION_SENSOR = "motion_sensor"
CONF_SCREEN_SWITCH = "screen_switch"
CONF_INFO_TEXT_SIZE = "info_text_size"
CONF_INFO_ITEMS_LIMIT = "info_items_limit"
CONF_SHOW_STATUS_ICONS = "show_status_icons"
CONF_SHOW_WEATHER_ICON = "show_weather_icon"
CONF_SHOW_CLOCK = "show_clock"
CONF_SHOW_INFO = "show_info"
CONF_SHOW_TEMPERATURES = "show_temperatures"
CONF_SHOW_HOURLY_FORECAST = "show_hourly_forecast"
CONF_LIMIT_TO_DASHBOARDS = "limit_to_dashboards"
CONF_ALLOWED_DASHBOARD_PATHS = "allowed_dashboard_paths"

DEFAULT_OVERLAY_IDLE_TIMEOUT = 60
DEFAULT_SCREEN_OFF_TIMEOUT = 0
DEFAULT_INFO_TEXT_SIZE = 2.0
DEFAULT_INFO_ITEMS_LIMIT = 5
DEFAULT_WEATHER_ICON_SIZE = 27
DEFAULT_WEATHER_DESCRIPTION_TEXT_SIZE = 1.8
DEFAULT_SHOW_BLOCK = True
DEFAULT_LIMIT_TO_DASHBOARDS = False

FRONTEND_URL = "/screensaver_overlay/screensaver-overlay.js"
STATIC_URL_PATH = "/screensaver_overlay"
