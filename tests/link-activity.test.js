import test from "node:test";
import assert from "node:assert/strict";
import { readLinkActivity, recordLinkAction, clearLinkActivity } from "../src/features/views/link-activity.js";
function memory() {
  const data=new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
}
test("manual actions persist independently without URL history",()=>{
  const storage=memory();
  assert.deepEqual(readLinkActivity(storage),{panelActions:0,tabActions:0});
  assert.equal(recordLinkAction("panel",storage),true);
  assert.equal(recordLinkAction("tab",storage),true);
  assert.equal(recordLinkAction("panel",storage),true);
  assert.deepEqual(readLinkActivity(storage),{panelActions:2,tabActions:1});
  assert.equal(recordLinkAction("refresh",storage),false);
  assert.deepEqual(readLinkActivity(storage),{panelActions:2,tabActions:1});
  assert.equal(clearLinkActivity(storage),true);
  assert.deepEqual(readLinkActivity(storage),{panelActions:0,tabActions:0});
});
test("corrupt storage is normalized and unavailable storage is not reported as success",()=>{
  const storage=memory();
  storage.setItem("multi-view.link-activity.v1",JSON.stringify({panelActions:-2,tabActions:"5"}));
  assert.deepEqual(readLinkActivity(storage),{panelActions:0,tabActions:0});
  const blocked={getItem(){throw Error("blocked")},setItem(){throw Error("blocked")},removeItem(){throw Error("blocked")}};
  assert.deepEqual(readLinkActivity(blocked),{panelActions:0,tabActions:0});
  assert.equal(recordLinkAction("panel",blocked),false);
  assert.equal(clearLinkActivity(blocked),false);
});
