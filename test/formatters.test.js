import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CT_HUB_2,
  formatForecast,
  formatBusArrivals,
  formatPlaces,
  haversineMetres,
} from "../src/tools.js";

test("formatForecast picks the requested area", () => {
  const payload = {
    data: {
      items: [
        {
          valid_period: { text: "12 pm to 2 pm" },
          forecasts: [
            { area: "Geylang", forecast: "Fair" },
            { area: "Kallang", forecast: "Light Rain" },
          ],
        },
      ],
    },
  };

  assert.deepEqual(formatForecast(payload, "Kallang"), {
    area: "Kallang",
    forecast: "Light Rain",
    valid_period: "12 pm to 2 pm",
  });
});

test("formatBusArrivals converts durations to whole minutes", () => {
  const payload = {
    services: [
      {
        no: "13",
        next: { duration_ms: 100_798 },
        subsequent: { duration_ms: 1_210_000 },
      },
      { no: "107M", next: { duration_ms: 30_000 }, subsequent: null },
    ],
  };

  assert.deepEqual(formatBusArrivals(payload, "07371"), {
    stop_code: "07371",
    services: [
      { service: "13", next_min: 2, subsequent_min: 20 },
      { service: "107M", next_min: 1, subsequent_min: null },
    ],
  });
});

test("haversineMetres measures CT Hub 2 to Lavender MRT at under 600 m", () => {
  const ctHub2 = { latitude: 1.3115, longitude: 103.8615 };
  const lavenderMrt = { latitude: 1.3073, longitude: 103.8631 };
  const distance = haversineMetres(ctHub2, lavenderMrt);
  assert.ok(distance > 400 && distance < 550, `got ${distance}`);
});

test("formatPlaces measures distance from CT Hub 2, not another region", () => {
  const places = [
    {
      displayName: { text: "Swee Choon Tim Sum" },
      rating: 4.3,
      location: { latitude: 1.3078, longitude: 103.8567 },
    },
    {
      displayName: { text: "Bedok 85 Fengshan" },
      location: { latitude: 1.3236, longitude: 103.9273 },
    },
  ];

  const [nearby, bedok] = formatPlaces(places, CT_HUB_2);

  assert.equal(nearby.name, "Swee Choon Tim Sum");
  assert.equal(nearby.rating, 4.3);
  assert.ok(nearby.distance_m < 800, `got ${nearby.distance_m}`);

  // A Bedok hawker centre is roughly 7 km away and must not read as walkable.
  assert.equal(bedok.rating, null);
  assert.ok(bedok.distance_m > 6000, `got ${bedok.distance_m}`);
});
