import test from "node:test";
import assert from "node:assert/strict";
import { describePlayback } from "../src/features/media/playback-status.js";

const media = {error:null,ended:false,seeking:false,readyState:4,paused:false,currentTime:0};
test("loading and play requests are not confirmed playback", () => {
  assert.equal(describePlayback({...media,readyState:0}).label,"Loading video");
  assert.equal(describePlayback(media,"play").label,"Starting playback");
});
test("native playing events confirm local playback only", () => {
  const status=describePlayback(media,"playing");
  assert.equal(status.label,"Playing locally");
  assert.match(status.hint,/not a platform view count/);
});
test("pause, waiting, seeking, error and ended override playback", () => {
  assert.equal(describePlayback({...media,paused:true},"playing").label,"Paused");
  assert.equal(describePlayback(media,"waiting").label,"Buffering");
  assert.equal(describePlayback({...media,seeking:true},"playing").label,"Seeking");
  assert.equal(describePlayback({...media,error:{code:4}},"playing").label,"Playback error");
  assert.equal(describePlayback({...media,ended:true},"playing").label,"Playback ended");
});
