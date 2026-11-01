"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "www", "screensaver-overlay.js"), "utf8");

function declaration(name) {
  const marker = `  const ${name} =`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Missing declaration: ${name}`);
  assert.equal(source.indexOf(marker, start + marker.length), -1, `Duplicate declaration: ${name}`);
  const end = source.indexOf("\n  };", start);
  assert.notEqual(end, -1, `Missing declaration end: ${name}`);
  return source.slice(start, end + "\n  };".length);
}

const context = {
  config: {},
  hourlyForecast: [],
  ASSET_BASE: "/screensaver_overlay",
  html: (value) => String(value ?? ""),
  isBlockVisible: () => true,
  getWeatherEntity: () => "weather.test",
  getHourlyForecastBackgroundOpacity: () => 0.7,
  formatForecastTime: (value) => new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value)),
};
vm.createContext(context);
vm.runInContext(
  declaration("getWeatherIcon") + "\n" +
  declaration("weatherIconsDay") + "\n" +
  declaration("getForecastWeatherIcon") + "\n" +
  declaration("renderForecastTimeline"),
  context
);
const resolveCurrentIcon = vm.runInContext("getWeatherIcon", context);
const resolveIcon = vm.runInContext("getForecastWeatherIcon", context);
const renderTimeline = vm.runInContext("renderForecastTimeline", context);

function render(samples, sunState = "above_horizon") {
  context.hourlyForecast = samples;
  return renderTimeline({
    states: {
      "weather.test": { attributes: { temperature_unit: "°C" } },
      "sun.sun": { state: sunState },
    },
  });
}

function sample(condition, isDaytime, datetime = "2026-10-28T00:00:00Z") {
  const result = { condition, datetime, temperature: 12 };
  if (isDaytime !== undefined) result.is_daytime = isDaytime;
  return Object.freeze(result);
}

function icons(html) {
  return Array.from(html.matchAll(/<img src="[^"]*\/([^/"]+)\.svg"/g), (match) => match[1]);
}

test("the complete browser script parses", () => {
  assert.doesNotThrow(() => new vm.Script(source));
});

test("01:00 partly cloudy uses the moon-and-cloud SVG", () => {
  const forecast = sample("partlycloudy", false);
  const html = render([forecast]);
  assert.deepEqual(icons(html), ["partlycloudy-night"]);
  assert.match(html, /01:00/);
  assert.match(html, /alt="partlycloudy"/);
  assert.equal(forecast.condition, "partlycloudy");
  const asset = path.join(root, "www", "weather_icons", "partlycloudy-night.svg");
  assert.ok(fs.existsSync(asset));
  assert.deepEqual(fs.readFileSync(asset), fs.readFileSync(path.join(
    root, "www", "weather_icons", "now_icon", "partlycloudy-night.svg"
  )));
});

test("daytime partly cloudy keeps the existing daylight icon", () => {
  assert.equal(resolveIcon(sample("partlycloudy", true)), "partlycloudy");
});

test("explicit provider clear-night conditions retain their moon icon", () => {
  for (const flag of [undefined, false, true]) {
    const forecast = sample("clear-night", flag);
    assert.equal(resolveIcon(forecast), "night");
    assert.equal(forecast.condition, "clear-night");
  }
});

test("explicit provider partlycloudy-night forecasts preserve the native night condition", () => {
  for (const flag of [undefined, false, true]) {
    const forecast = sample("partlycloudy-night", flag);
    assert.equal(resolveIcon(forecast), "partlycloudy-night");
    assert.equal(forecast.condition, "partlycloudy-night");
    for (const sunState of ["above_horizon", "below_horizon", "unavailable"]) {
      assert.deepEqual(icons(render([forecast], sunState)), ["partlycloudy-night"]);
    }
  }
});

test("native night states also remain unchanged for the current large icon", () => {
  for (const condition of ["clear-night", "partlycloudy-night"]) {
    for (const sunState of ["above_horizon", "below_horizon", "unavailable"]) {
      assert.equal(resolveCurrentIcon({
        states: { "sun.sun": { state: sunState } },
      }, condition), condition);
    }
    assert.ok(fs.existsSync(path.join(root, "www", "weather_icons", "now_icon", condition + ".svg")));
  }
});

test("a generic clear/sunny forecast with an explicit night flag uses the moon", () => {
  for (const condition of ["sunny", "clear"]) {
    assert.equal(resolveIcon(sample(condition, false)), "night");
    assert.equal(resolveIcon(sample(condition, true)), "day");
  }
});

test("providers without day/night flags preserve the previous condition mapping", () => {
  assert.equal(resolveIcon(sample("partlycloudy")), "partlycloudy");
  assert.equal(resolveIcon(sample("sunny")), "day");
  assert.equal(resolveIcon(sample("clear-night")), "night");
});

test("the current sun entity does not determine the night of a future forecast", () => {
  for (const sunState of ["above_horizon", "below_horizon", "unavailable"]) {
    assert.deepEqual(icons(render([sample("partlycloudy", false)], sunState)), ["partlycloudy-night"]);
    assert.deepEqual(icons(render([sample("partlycloudy", true)], sunState)), ["partlycloudy"]);
  }
});

test("the timeline draws a new icon at sunset even when partlycloudy is unchanged", () => {
  const forecasts = [
    sample("partlycloudy", true, "2026-10-27T16:00:00Z"),
    sample("partlycloudy", false, "2026-10-27T17:00:00Z"),
    sample("partlycloudy", false, "2026-10-27T18:00:00Z"),
  ];
  assert.deepEqual(icons(render(forecasts)), ["partlycloudy", "partlycloudy-night"]);
});

test("the timeline draws a new icon at dawn without requiring a condition change", () => {
  const forecasts = [
    sample("partlycloudy", false, "2026-10-28T05:00:00Z"),
    sample("partlycloudy", true, "2026-10-28T06:00:00Z"),
    sample("partlycloudy", true, "2026-10-28T07:00:00Z"),
  ];
  assert.deepEqual(icons(render(forecasts)), ["partlycloudy-night", "partlycloudy"]);
});

test("unchanged condition and icon remain grouped as before", () => {
  assert.deepEqual(icons(render([
    sample("partlycloudy", false), sample("partlycloudy", false),
    sample("clear-night", false), sample("clear-night", false),
  ])), ["partlycloudy-night", "night"]);
});

test("other standard conditions keep their existing icons and available files", () => {
  for (const condition of [
    "cloudy", "fog", "hail", "lightning", "lightning-rainy", "pouring",
    "rainy", "snowy", "snowy-rainy", "windy", "windy-variant",
  ]) {
    assert.equal(resolveIcon(sample(condition, false)), condition);
    assert.ok(fs.existsSync(path.join(root, "www", "weather_icons", condition + ".svg")));
  }
});
