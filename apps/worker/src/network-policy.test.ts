import test from "node:test";
import assert from "node:assert/strict";
import { isPublicAddress } from "./network-policy.js";

test("accepts ordinary globally routable IPv4 addresses", () => {
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("1.1.1.1"), true);
});

test("rejects private, loopback, link-local and reserved IPv4 ranges", () => {
  for (const address of [
    "10.0.0.1", "172.16.0.2", "192.168.1.2", "127.0.0.1",
    "169.254.169.254", "100.64.0.1", "198.18.0.1", "224.0.0.1"
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

test("accepts global unicast IPv6 and rejects local or special ranges", () => {
  assert.equal(isPublicAddress("2001:4860:4860::8888"), true);
  for (const address of [
    "::1", "::", "fc00::1", "fd00::1", "fe80::1",
    "2001:db8::1", "ff02::1", "2002::1", "::ffff:192.168.1.1"
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

test("rejects non-IP strings", () => {
  assert.equal(isPublicAddress("media.example.com"), false);
});
