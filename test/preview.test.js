import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findPreviewEntry, promoteOpenTab } from "../mods/tabs-ref/preview.js";

describe("findPreviewEntry", () => {
  const tab = { id: "tab-1", name: "a.js" };

  it("matches a preview by its recorded tab id", () => {
    const openTabs = {
      "/r/a.js": { root: "/r", file: "a.js", tabName: "a.js", tabId: "tab-1", preview: true },
    };
    const found = findPreviewEntry(openTabs, tab);
    assert.equal(found?.key, "/r/a.js");
    assert.equal(found?.entry.tabId, "tab-1");
  });

  it("falls back to the exact tab name only while the id is unknown", () => {
    const openTabs = {
      "/r/a.js": { root: "/r", file: "a.js", tabName: "a.js", preview: true },
    };
    assert.equal(findPreviewEntry(openTabs, tab)?.key, "/r/a.js");
  });

  it("never lets a stale id fall through to a colliding name", () => {
    const openTabs = {
      "/r/a.js": { root: "/r", file: "a.js", tabName: "a.js", tabId: "closed-id", preview: true },
    };
    assert.equal(findPreviewEntry(openTabs, tab), null);
  });

  it("requires a live file-editor pane when editorTabIds is supplied", () => {
    const openTabs = {
      "/r/a.js": { root: "/r", file: "a.js", tabName: "a.js", preview: true },
    };
    assert.equal(findPreviewEntry(openTabs, tab, ["tab-term"]), null);
    assert.equal(findPreviewEntry(openTabs, tab, []), null);
    assert.equal(findPreviewEntry(openTabs, tab, ["tab-1"])?.key, "/r/a.js");
    assert.equal(findPreviewEntry(openTabs, { id: "tab-term", name: "a.js" }, ["tab-1"]), null);
  });

  it("ignores non-preview, malformed and missing maps", () => {
    assert.equal(findPreviewEntry(null, tab), null);
    assert.equal(findPreviewEntry({ "/r/a.js": { preview: false } }, tab), null);
    assert.equal(findPreviewEntry({ "/r/a.js": null }, tab), null);
    assert.equal(findPreviewEntry({ "/r/a.js": { preview: true, tabId: "tab-1" } }, null), null);
  });
});

describe("promoteOpenTab", () => {
  it("removes the preview flag and keeps the recorded id", () => {
    const openTabs = {
      "/r/a.js": { root: "/r", file: "a.js", tabName: "a.js", tabId: "tab-1", preview: true },
      "/r/b.js": { root: "/r", file: "b.js", tabName: "b.js", preview: true },
    };
    const { next, promoted } = promoteOpenTab(openTabs, "/r/a.js", "tab-1");
    assert.equal(promoted, true);
    assert.equal("preview" in next["/r/a.js"], false);
    assert.equal(next["/r/a.js"].tabId, "tab-1");
    // The source map and sibling entries are untouched.
    assert.equal(openTabs["/r/a.js"].preview, true);
    assert.equal(next["/r/b.js"].preview, true);
  });

  it("fills in the live tab id when the entry was still waiting for it", () => {
    const openTabs = {
      "/r/a.js": { root: "/r", file: "a.js", tabName: "a.js", preview: true },
    };
    const { next } = promoteOpenTab(openTabs, "/r/a.js", "tab-new");
    assert.equal(next["/r/a.js"].tabId, "tab-new");
    assert.equal("preview" in next["/r/a.js"], false);
  });

  it("returns promoted=false for a missing or already permanent entry", () => {
    assert.deepEqual(promoteOpenTab({}, "/r/a.js", "tab-1"), { next: {}, promoted: false });
    const permanent = { "/r/a.js": { root: "/r", file: "a.js", tabName: "a.js", tabId: "tab-1" } };
    const result = promoteOpenTab(permanent, "/r/a.js", "tab-1");
    assert.equal(result.promoted, false);
    assert.equal(result.next["/r/a.js"].tabId, "tab-1");
    assert.notEqual(result.next, permanent);
  });
});
