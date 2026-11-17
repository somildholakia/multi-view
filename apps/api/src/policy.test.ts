import test from "node:test";
import assert from "node:assert/strict";
import { validateAuthorizedMediaUrl } from "./policy.js";

process.env.ALLOWED_MEDIA_HOSTS = "media.example.com";

test("accepts HTTPS media on the configured host", () => {
  assert.equal(
    validateAuthorizedMediaUrl("https://media.example.com/demo.mp4?token=abc"),
    "https://media.example.com/demo.mp4?token=abc"
  );
});

test("accepts a subdomain of the configured host", () => {
  assert.equal(
    validateAuthorizedMediaUrl("https://cdn.media.example.com/demo.webm"),
    "https://cdn.media.example.com/demo.webm"
  );
});

test("rejects YouTube hosts", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("https://www.youtube.com/watch?v=example"),
    /YouTube URLs are not supported/
  );
});

test("rejects non-HTTPS media", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("http://media.example.com/demo.mp4"),
    /must use HTTPS/
  );
});

test("rejects hosts outside the allowlist", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("https://untrusted.example.net/demo.mp4"),
    /not allowlisted/
  );
});

test("rejects embedded URL credentials", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("https://user:password@media.example.com/demo.mp4"),
    /Credentials must not be embedded/
  );
});

test("rejects malformed URLs", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("not-a-url"),
    /valid direct media URL/
  );
});
