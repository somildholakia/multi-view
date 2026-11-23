import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, getDomain } from "../src/core/url.js";

test("adds HTTPS when a scheme is omitted",()=>{
  assert.equal(normalizeUrl("example.com"),"https://example.com/");
});
test("preserves an explicit HTTPS URL",()=>{
  assert.equal(normalizeUrl("https://example.com/path"),"https://example.com/path");
});
test("rejects non-web protocols",()=>{
  assert.throws(()=>normalizeUrl("ftp://example.com"),/Only HTTP and HTTPS/);
});
test("rejects empty and malformed addresses",()=>{
  assert.throws(()=>normalizeUrl(" "),/Enter a website address/);
  assert.throws(()=>normalizeUrl("https://"),/valid website address/);
});
test("extracts a readable hostname",()=>{
  assert.equal(getDomain("https://www.example.com/path"),"example.com");
});