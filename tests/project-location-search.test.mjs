import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/locations/search/route.ts", import.meta.url), "utf8");

test("project location is chosen from a type-ahead result", () => {
  assert.match(page, /role="combobox"/);
  assert.match(page, /\/api\/locations\/search\?q=/);
  assert.match(page, /Choose a suggestion to assign its country and timezone/);
  assert.match(page, /city: location\.city/);
  assert.match(page, /country: location\.country/);
  assert.match(page, /timezone: location\.timezone/);
});

test("location search returns canonical country and IANA timezone data", () => {
  assert.match(route, /geocoding-api\.open-meteo\.com\/v1\/search/);
  assert.match(route, /country_code/);
  assert.match(route, /timezone/);
  assert.match(route, /requireMember\(\)/);
  assert.match(route, /enforceRateLimit/);
});
