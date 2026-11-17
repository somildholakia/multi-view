import test from "node:test";
import assert from "node:assert/strict";
import { validateAuthorizedMediaUrl } from "./policy.js";

process.env.ALLOWED_MEDIA_HOSTS = "media.example.com,cdn.example.net";

test("accepts HTTPS media on an explicitly configured host", () => {
  assert.equal(
    validateAuthorizedMediaUrl("https://media.example.com/demo.mp4?token=abc"),
    "https://media.example.com/demo.mp4?token=abc"
  );
});

test("accepts another host when it is explicitly allowlisted", () => {
  assert.equal(
    validateAuthorizedMediaUrl("https://cdn.example.net/demo.webm"),
    "https://cdn.example.net/demo.webm"
  );
});

test("rejects unlisted subdomains", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("https://sub.media.example.com/demo.mp4"),
    /exact host is not allowlisted/
  );
});

test("rejects YouTube hosts", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("https://www.youtube.com/watch?v=example"),
    /YouTube URLs are not supported/
  );
});

test("rejects Google video delivery hosts", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("https://r1---sn.googlevideo.com/demo.mp4"),
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
    /exact host is not allowlisted/
  );
});

test("rejects embedded URL credentials", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("https://user:password@media.example.com/demo.mp4"),
    /Credentials must not be embedded/
  );
});

test("rejects local and IP-literal destinations", () => {
  for (const host of ["localhost", "service.local", "127.0.0.1", "[::1]"]) {
    assert.throws(
      () => validateAuthorizedMediaUrl(`https://${host}/demo.mp4`),
      /Private, local and IP-literal/
    );
  }
});

test("rejects malformed URLs", () => {
  assert.throws(
    () => validateAuthorizedMediaUrl("not-a-url"),
    /valid direct media URL/
  );
});
