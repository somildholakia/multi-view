import test from "node:test";
import assert from "node:assert/strict";
import { addUrls, changeLayout } from "../src/features/views/view-manager.js";
import {
  createWorkspace,
  normalizeAppState
} from "../src/features/workspaces/workspace-model.js";

test("adding five sites expands a four-panel workspace to six", () => {
  const workspace = createWorkspace();
  const urls = [
    "one.example", "two.example", "three.example",
    "four.example", "five.example"
  ];

  assert.equal(addUrls(workspace, urls), 5);
  assert.equal(workspace.layout, 6);
  assert.equal(workspace.views.filter(view => view.url).length, 5);
});

test("a workspace cannot contain more than eight websites", () => {
  const workspace = createWorkspace();
  const urls = Array.from({ length: 9 }, (_, index) => `site${index + 1}.example`);

  assert.throws(() => addUrls(workspace, urls), /up to 8 websites/i);
});

test("changing layouts preserves websites in panels that become hidden", () => {
  const workspace = createWorkspace();
  addUrls(workspace, ["first.example", "second.example"]);

  changeLayout(workspace, 1);
  assert.equal(workspace.layout, 1);
  assert.equal(workspace.views[1].url, "https://second.example/");

  changeLayout(workspace, 4);
  assert.equal(workspace.views[1].url, "https://second.example/");
});

test("invalid saved settings are normalized to safe defaults", () => {
  const state = normalizeAppState({
    activeWorkspaceId: "missing",
    workspaces: [{ id: "workspace-1", layout: 99, refreshInterval: 999, views: [] }]
  });

  assert.equal(state.activeWorkspaceId, "workspace-1");
  assert.equal(state.workspaces[0].layout, 4);
  assert.equal(state.workspaces[0].refreshInterval, 0);
  assert.equal(state.workspaces[0].views.length, 4);
});
