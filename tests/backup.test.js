import test from "node:test";
import assert from "node:assert/strict";
import { createWorkspace } from "../src/features/workspaces/workspace-model.js";
import { mergeBackup, readBackup } from "../src/features/import-export/backup.js";
test("reimported workspaces get fresh workspace and panel IDs",()=>{
  const original=createWorkspace("Original");
  original.views[0].url="https://example.com/";
  const bookmark={id:"original",url:"https://example.com/",title:"Example"};
  const current={workspaces:[original],bookmarks:[bookmark],activeWorkspaceId:original.id};
  const next=mergeBackup(current,{workspaces:[original],bookmarks:[bookmark,{id:"original",url:"https://example.org/",title:"Other"}]});
  assert.equal(next.workspaces.length,2);
  assert.notEqual(next.workspaces[1].id,original.id);
  assert.notEqual(next.workspaces[1].views[0].id,original.views[0].id);
  assert.equal(next.workspaces[1].views[0].url,original.views[0].url);
  assert.equal(next.activeWorkspaceId,next.workspaces[1].id);
  assert.equal(next.bookmarks.length,2);
  assert.notEqual(next.bookmarks[1].id,bookmark.id);
  assert.equal(current.workspaces.length,1);
});
test("oversized and empty backups are rejected",async()=>{
  await assert.rejects(readBackup({size:3000000,text:async()=>""}),/2 MB/);
  await assert.rejects(readBackup({size:20,text:async()=> '{"workspaces":[]}'}),/not a MultiView/);
});
