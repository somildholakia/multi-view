import test from "node:test";
import assert from "node:assert/strict";
import { RefreshController } from "../src/features/refresh/refresh-controller.js";

function withBrowserGlobals(run) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const timers = new Map();
  let nextTimerId = 1;
  globalThis.window = {
    setInterval(callback, delay) {
      const id = nextTimerId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearInterval(id) { timers.delete(id); }
  };
  globalThis.document = { visibilityState: "hidden" };
  try {
    return run(timers);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
}

test("an overdue refresh runs once when a hidden page becomes visible", () => {
  withBrowserGlobals(timers => {
    let refreshes = 0;
    const controller = new RefreshController(() => refreshes++);
    controller.configure(15, false);

    const timer = [...timers.values()][0];
    assert.equal(timer.delay, 15_000);
    controller.nextTickAt = Date.now() - 1000;

    assert.equal(controller.resume(), false);
    assert.equal(refreshes, 0);

    document.visibilityState = "visible";
    assert.equal(controller.resume(), true);
    assert.equal(refreshes, 1);

    // Missed intervals are not replayed in a burst.
    assert.equal(controller.resume(), false);
    assert.equal(refreshes, 1);
    controller.stop();
    assert.equal(timers.size, 0);
  });
});

test("paused or disabled auto-refresh never catches up", () => {
  withBrowserGlobals(() => {
    let refreshes = 0;
    const controller = new RefreshController(() => refreshes++);
    document.visibilityState = "visible";

    controller.configure(15, true);
    assert.equal(controller.resume(), false);
    assert.equal(refreshes, 0);

    controller.configure(0, false);
    assert.equal(controller.resume(), false);
    assert.equal(refreshes, 0);
    controller.stop();
  });
});

test("refresh does not run until its scheduled time is due", () => {
  withBrowserGlobals(() => {
    let refreshes = 0;
    const controller = new RefreshController(() => refreshes++);
    document.visibilityState = "visible";
    controller.configure(60, false);

    assert.equal(controller.resume(), false);
    assert.equal(refreshes, 0);
    controller.nextTickAt = Date.now() - 1;
    assert.equal(controller.resume(), true);
    assert.equal(refreshes, 1);
    controller.stop();
  });
});
