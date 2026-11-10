import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { splitDirection, splitRequest, menuRows, actions } from "../mods/pane-plus/pane.js";

describe("splitDirection", () => {
  it("keeps Herdr's right/down directions", () => {
    assert.equal(splitDirection("right"), "right");
    assert.equal(splitDirection("down"), "down");
  });

  it("falls back to right for anything else", () => {
    assert.equal(splitDirection(undefined), "right");
    assert.equal(splitDirection("up"), "right");
  });
});

describe("splitRequest", () => {
  it("opens a terminal split when the chooser is missing", () => {
    assert.deepEqual(splitRequest("down", "p1", "s1", "/repo", false), {
      direction: "down",
      pane: "p1",
    });
  });

  it("opens the chooser and carries its starting context", () => {
    assert.deepEqual(splitRequest("right", "p1", "s1", "/repo", true), {
      direction: "right",
      pane: "p1",
      mod: "new-pane",
      props: { direction: "right", space: "s1", folder: "/repo" },
    });
  });

  it("omits a missing space and folder", () => {
    assert.deepEqual(splitRequest("right", "p1", undefined, undefined, true), {
      direction: "right",
      pane: "p1",
      mod: "new-pane",
      props: { direction: "right" },
    });
  });
});

describe("menuRows/actions", () => {
  it("groups split, move and pane actions with rules between them", () => {
    const rows = menuRows();
    assert.deepEqual(rows.filter((row) => row.sep).length, 2);
    assert.deepEqual(actions(rows).map((row) => row[1]), [
      "split-right",
      "split-down",
      "left",
      "right",
      "up",
      "down",
      "zoom",
      "close",
    ]);
  });
});
