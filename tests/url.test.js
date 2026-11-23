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
import { getMediaDescriptor } from "../src/core/url.js";

test("converts standard YouTube watch links into privacy-enhanced embeds",()=>{
  const media=getMediaDescriptor("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s");
  assert.equal(media.type,"youtube");
  assert.equal(media.src,"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?playsinline=1&rel=0&start=90");
});

test("supports short YouTube links",()=>{
  const media=getMediaDescriptor("https://youtu.be/dQw4w9WgXcQ");
  assert.equal(media.type,"youtube");
  assert.match(media.src,/youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
});

test("supports YouTube Shorts and live links",()=>{
  assert.equal(getMediaDescriptor("https://youtube.com/shorts/dQw4w9WgXcQ").type,"youtube");
  assert.equal(getMediaDescriptor("https://youtube.com/live/dQw4w9WgXcQ").type,"youtube");
});

test("converts YouTube playlist links into playlist embeds",()=>{
  const media=getMediaDescriptor("https://www.youtube.com/playlist?list=PL123456789");
  assert.equal(media.type,"youtube-playlist");
  assert.match(media.src,/embed\/videoseries\?list=PL123456789/);
});

test("detects direct video files even when they have query parameters",()=>{
  const media=getMediaDescriptor("https://cdn.example.com/watch/sample.mp4?token=abc");
  assert.equal(media.type,"video");
  assert.equal(media.src,"https://cdn.example.com/watch/sample.mp4?token=abc");
});

test("converts Vimeo and Dailymotion links to their player URLs",()=>{
  assert.equal(getMediaDescriptor("https://vimeo.com/123456789").src,"https://player.vimeo.com/video/123456789");
  assert.equal(getMediaDescriptor("https://www.dailymotion.com/video/x8abcde").src,"https://www.dailymotion.com/embed/video/x8abcde");
});

test("leaves ordinary website URLs as website embeds",()=>{
  assert.equal(getMediaDescriptor("https://example.com/video-page").type,"website");
});


test("YouTube videos use muted autoplay when enabled",()=>{
  const media=getMediaDescriptor("https://www.youtube.com/watch?v=dQw4w9WgXcQ",{autoPlay:true});
  assert.equal(media.type,"youtube");
  assert.equal(new URL(media.src).searchParams.get("autoplay"),"1");
  assert.equal(new URL(media.src).searchParams.get("mute"),"1");
});

test("YouTube autoplay remains disabled when the preference is off",()=>{
  const media=getMediaDescriptor("https://youtu.be/dQw4w9WgXcQ",{autoPlay:false});
  assert.equal(new URL(media.src).searchParams.has("autoplay"),false);
});

test("Vimeo and Dailymotion embeds receive muted autoplay settings",()=>{
  const vimeo=getMediaDescriptor("https://vimeo.com/123456789",{autoPlay:true});
  const dailymotion=getMediaDescriptor("https://dailymotion.com/video/x8abcde",{autoPlay:true});
  assert.equal(new URL(vimeo.src).searchParams.get("autoplay"),"1");
  assert.equal(new URL(vimeo.src).searchParams.get("muted"),"1");
  assert.equal(new URL(dailymotion.src).searchParams.get("autoplay"),"1");
  assert.equal(new URL(dailymotion.src).searchParams.get("mute"),"1");
});

test("YouTube playlist embeds request muted autoplay when enabled",()=>{
  const media=getMediaDescriptor("https://youtube.com/playlist?list=PL123456789",{autoPlay:true});
  assert.equal(new URL(media.src).searchParams.get("autoplay"),"1");
  assert.equal(new URL(media.src).searchParams.get("mute"),"1");
});
