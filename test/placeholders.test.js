import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasPlaceholder } from "../mods/tabs-ref/placeholders.js";

const tab = (id) => ({ id });
const pane = (tabId, mod = null) => ({ tab: tabId, mod });

describe("hasPlaceholder", () => {
  it("is false for an empty or missing tab list", () => {
    assert.equal(hasPlaceholder([], []), false);
    assert.equal(hasPlaceholder(undefined, undefined), false);
    assert.equal(hasPlaceholder([tab("t1")], []), false);
  });

  it("finds a placeholder tab among regular tabs", () => {
    assert.equal(
      hasPlaceholder([tab("t1"), tab("t2")], [pane("t1", "file-editor"), pane("t2", "space-pin")]),
      true
    );
  });

  it("ignores a space-pin pane in a tab outside the list", () => {
    assert.equal(hasPlaceholder([tab("t1")], [pane("t1", "file-editor"), pane("t9", "space-pin")]), false);
  });

  it("ignores non-placeholder mod panes", () => {
    assert.equal(hasPlaceholder([tab("t1")], [pane("t1", "agent-chat")]), false);
  });
});
