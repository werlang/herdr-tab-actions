import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { splitDirection, splitRequest, menuRows, actions, isModPane, MOD_HOVER_DELAY_MS } from "../mods/pane-plus/pane.js";
import { ownPane, openArgs, chooserAgents } from "../mods/new-pane/chooser.js";

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

describe("isModPane", () => {
  it("detects mod panes like git-graph and file-editor", () => {
    assert.equal(isModPane({ pane: "p1", mod: "git-graph" }), true);
    assert.equal(isModPane({ pane: "p2", mod: "file-editor" }), true);
  });

  it("returns false for terminal panes and choosers", () => {
    assert.equal(isModPane({ pane: "p1", terminal: "t1" }), false);
    assert.equal(isModPane({ pane: "p2", mod: "new-pane" }), false);
    assert.equal(isModPane({ pane: "p3", mod: "space-pin" }), false);
    assert.equal(isModPane(null), false);
    assert.equal(isModPane(undefined), false);
  });

  it("defines a deliberate dwell delay between 300ms and 600ms", () => {
    assert.ok(MOD_HOVER_DELAY_MS >= 300 && MOD_HOVER_DELAY_MS <= 600);
  });
});

describe("ownPane", () => {
  const chooser = (pane) => ({ pane, mod: "new-pane" });

  it("uses the focused chooser when a tab has more than one", () => {
    assert.equal(ownPane([chooser("p1"), chooser("p2")], "p2"), "p2");
  });

  it("accepts the only chooser in the tab", () => {
    assert.equal(ownPane([{ pane: "p0", mod: "file-editor" }, chooser("p1")], "p0"), "p1");
  });

  it("refuses to guess between two choosers when neither is focused", () => {
    assert.equal(ownPane([chooser("p1"), chooser("p2")], "p0"), null);
    assert.equal(ownPane([chooser("p1"), chooser("p2")], null), null);
  });

  it("returns null when the tab has no chooser", () => {
    assert.equal(ownPane([{ pane: "p0", mod: "file-editor" }], "p0"), null);
    assert.equal(ownPane([], null), null);
    assert.equal(ownPane(null, null), null);
  });
});

describe("openArgs", () => {
  it("opens on the same side as the split, with the folder", () => {
    assert.deepEqual(openArgs("right", "/repo", null), { place: "right", folder: "/repo" });
    assert.deepEqual(openArgs("down", "/repo", null), { place: "down", folder: "/repo" });
  });

  it("adds the agent argv and name when a choice is given", () => {
    assert.deepEqual(openArgs("right", "/repo", { argv: ["claude"], name: "Claude" }), {
      place: "right",
      folder: "/repo",
      argv: ["claude"],
      name: "Claude",
    });
  });

  it("accepts the knownAgents run array as argv", () => {
    assert.deepEqual(openArgs("right", "/repo", { run: ["codex", "--no-daemon"], name: "Codex" }), {
      place: "right",
      folder: "/repo",
      argv: ["codex", "--no-daemon"],
      name: "Codex",
    });
  });

  it("omits empty values", () => {
    assert.deepEqual(openArgs("right", undefined, {}), { place: "right" });
  });
});

describe("chooserAgents", () => {
  it("keeps installed agents, sorted by name", () => {
    const agents = [
      { name: "Zed", installed: true },
      { name: "Claude", installed: true },
      { name: "Codex", installed: false },
    ];
    assert.deepEqual(chooserAgents(agents).map((a) => a.name), ["Claude", "Zed"]);
  });

  it("handles missing lists", () => {
    assert.deepEqual(chooserAgents(null), []);
    assert.deepEqual(chooserAgents(undefined), []);
    assert.deepEqual(chooserAgents("nope"), []);
  });
});
