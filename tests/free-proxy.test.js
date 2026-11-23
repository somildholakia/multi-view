import test from "node:test";
import assert from "node:assert/strict";
import {
  FREE_PROXY_COUNTRIES,
  getFreeProxyLaunchUrl,
  getProxyCountry,
  normalizeProxySettings,
  formatProxyTimeLeft
} from "../src/features/proxy/free-proxy.js";

test("free proxy countries are unique and use the Shifter proxy host", () => {
  const codes = FREE_PROXY_COUNTRIES.map(country => country.code);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(FREE_PROXY_COUNTRIES.length >= 25);
  for (const country of FREE_PROXY_COUNTRIES) {
    assert.match(getFreeProxyLaunchUrl(country.code), /^https:\/\/shifter\.io\/web-proxy\/[a-z-]+$/);
  }
});

test("known countries map to their country-specific proxy pages", () => {
  assert.equal(getFreeProxyLaunchUrl("de"), "https://shifter.io/web-proxy/germany");
  assert.equal(getFreeProxyLaunchUrl("in"), "https://shifter.io/web-proxy/india");
  assert.equal(getFreeProxyLaunchUrl("us"), "https://shifter.io/web-proxy/usa");
});

test("unknown country falls back to the United States", () => {
  assert.equal(getProxyCountry("not-a-country").code, "us");
});

test("proxy settings accept only supported auto-close durations", () => {
  assert.deepEqual(normalizeProxySettings({ country: "de", durationMinutes: 15 }), {
    country: "de",
    durationMinutes: 15
  });
  assert.deepEqual(normalizeProxySettings({ country: "xx", durationMinutes: 999 }), {
    country: "us",
    durationMinutes: 30
  });
  assert.deepEqual(normalizeProxySettings({ country: "jp", durationMinutes: 0 }), {
    country: "jp",
    durationMinutes: 0
  });
});

test("proxy countdown is formatted as minutes and seconds", () => {
  assert.equal(formatProxyTimeLeft(61_000), "01:01");
  assert.equal(formatProxyTimeLeft(0), "00:00");
  assert.equal(formatProxyTimeLeft(-1000), "00:00");
});
