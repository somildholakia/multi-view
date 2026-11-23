import test from "node:test";
import assert from "node:assert/strict";
import { addBookmark, removeBookmark } from "../src/features/bookmarks/bookmark-manager.js";
import { addUrls, changeLayout, clearAllViews, reorderViews, setAllViewsUrl } from "../src/features/views/view-manager.js";
import {
  createWorkspace,
  duplicateWorkspace,
  normalizeAppState
} from "../src/features/workspaces/workspace-model.js";

test("adding five sites expands a four-panel workspace to five", () => {
  const workspace = createWorkspace();
  const urls = [
    "one.example", "two.example", "three.example",
    "four.example", "five.example"
  ];

  assert.equal(addUrls(workspace, urls), 5);
  assert.equal(workspace.layout, 5);
  assert.equal(workspace.views.filter(view => view.url).length, 5);
});

test("a workspace supports up to 20 websites but rejects 21", () => {
  const workspace = createWorkspace();
  const urls = Array.from({ length: 20 }, (_, index) => "site" + (index + 1) + ".example");

  assert.equal(addUrls(workspace, urls), 20);
  assert.equal(workspace.layout, 20);
  assert.equal(workspace.views.filter(view => view.url).length, 20);
  assert.throws(() => addUrls(workspace, ["extra.example"]), /up to 20 windows/i);
});

test("one pasted URL is applied to every visible window", () => {
  const workspace = createWorkspace();
  changeLayout(workspace, 20);

  assert.equal(setAllViewsUrl(workspace, "example.com/watch"), 20);
  assert.equal(workspace.views.slice(0, 20).every(view => view.url === "https://example.com/watch"), true);
});

test("adding another website after reducing the visible count expands to show it", () => {
  const workspace = createWorkspace();
  addUrls(workspace, ["first.example", "second.example", "third.example"]);
  changeLayout(workspace, 1);

  addUrls(workspace, ["fourth.example"]);

  assert.equal(workspace.layout, 4);
  assert.equal(workspace.views[3].url, "https://fourth.example/");
});

test("close all windows removes panel URLs and resets to one blank panel", () => {
  const workspace = createWorkspace();
  changeLayout(workspace, 20);
  addUrls(workspace, Array.from({ length: 20 }, (_, index) => "site" + (index + 1) + ".example"));

  assert.equal(clearAllViews(workspace), 20);
  assert.equal(workspace.layout, 1);
  assert.equal(workspace.views.length, 1);
  assert.equal(workspace.views[0].url, "");
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

test("panel reordering moves the selected website without losing it", () => {
  const workspace = createWorkspace();
  addUrls(workspace, ["first.example", "second.example", "third.example"]);
  const first = workspace.views[0].id;
  const third = workspace.views[2].id;

  assert.equal(reorderViews(workspace, third, first), true);
  assert.equal(workspace.views[0].url, "https://third.example/");
  assert.equal(workspace.views[2].url, "https://second.example/");
});

test("autoplay is enabled for new workspaces and survives duplication", () => {
  const workspace = createWorkspace("Videos");
  assert.equal(workspace.autoPlayVideos, true);
  workspace.autoPlayVideos = false;
  const copy = duplicateWorkspace(workspace);
  assert.equal(copy.autoPlayVideos, false);
});

test("workspace duplication copies URLs but generates independent panel IDs", () => {
  const workspace = createWorkspace("Research");
  addUrls(workspace, ["example.com", "openai.com"]);
  const copy = duplicateWorkspace(workspace);

  assert.equal(copy.name, "Research copy");
  assert.equal(copy.layout, workspace.layout);
  assert.equal(copy.views[0].url, workspace.views[0].url);
  assert.notEqual(copy.views[0].id, workspace.views[0].id);
});

test("bookmarks can be saved, deduplicated, and removed", () => {
  const state = { bookmarks: [] };
  const view = { url: "https://www.example.com/path" };

  const created = addBookmark(state, view);
  const duplicate = addBookmark(state, view);

  assert.equal(created.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(state.bookmarks.length, 1);
  assert.equal(removeBookmark(state, created.bookmark.id), true);
  assert.equal(state.bookmarks.length, 0);
});

test("invalid imported bookmarks are discarded", () => {
  const state = normalizeAppState({
    workspaces: [{ id: "workspace-1", views: [] }],
    bookmarks: [{ id: "broken", title: "Invalid", url: "javascript:alert(1)" }]
  });

  assert.equal(state.bookmarks.length, 0);
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
