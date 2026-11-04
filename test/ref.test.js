import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addressOf,
  appOf,
  stateOf,
  terminalsOfTab,
  locateTab,
  reference,
} from "../mods/ref-menu/ref.js";

describe("addressOf", () => {
  it("qualifies address with space.machine when unqualified", () => {
    const term = { address: "t9" };
    const space = { machine: "remote-box" };
    assert.equal(addressOf(term, space), "remote-box/t9");
  });

  it("does not re-qualify an address that is already qualified", () => {
    const term = { address: "other-box/t9" };
    const space = { machine: "remote-box" };
    assert.equal(addressOf(term, space), "other-box/t9");
  });

  it("returns plain address when space has no machine", () => {
    const term = { address: "t9" };
    assert.equal(addressOf(term, null), "t9");
    assert.equal(addressOf(term, {}), "t9");
    assert.equal(addressOf(term, { machine: "" }), "t9");
  });

  it("returns empty string when address is missing or empty", () => {
    assert.equal(addressOf(null, { machine: "box" }), "");
    assert.equal(addressOf({}, { machine: "box" }), "");
    assert.equal(addressOf({ address: "" }, { machine: "box" }), "");
  });
});

describe("appOf", () => {
  it("uses term.report.app first", () => {
    const term = {
      report: { app: "opencode" },
      status: { app: "other-app" },
      template: "bash",
      name: "custom",
    };
    assert.equal(appOf(term), "opencode");
  });

  it("falls back to term.status.app when status is an object", () => {
    const term = {
      status: { app: "claude" },
      template: "bash",
      name: "custom",
    };
    assert.equal(appOf(term), "claude");
  });

  it("ignores string status and falls back to template", () => {
    const term = {
      status: "working",
      template: "python",
      foreground: { name: "vim" },
    };
    assert.equal(appOf(term), "python");
  });

  it("falls back to term.foreground.name", () => {
    const term = {
      foreground: { name: "neovim" },
      name: "terminal-pane",
    };
    assert.equal(appOf(term), "neovim");
  });

  it("falls back to term.name", () => {
    const term = {
      name: "my-shell",
    };
    assert.equal(appOf(term), "my-shell");
  });

  it("falls back to 'terminal' when no metadata exists", () => {
    assert.equal(appOf({}), "terminal");
    assert.equal(appOf(null), "terminal");
    assert.equal(appOf(undefined), "terminal");
  });
});

describe("stateOf", () => {
  it("returns string status directly", () => {
    assert.equal(stateOf({ status: "working" }), "working");
    assert.equal(stateOf({ status: "blocked" }), "blocked");
  });

  it("returns status.state when status is an object", () => {
    assert.equal(stateOf({ status: { state: "done" } }), "done");
  });

  it("returns empty string when status is missing or has no state", () => {
    assert.equal(stateOf({ status: {} }), "");
    assert.equal(stateOf({}), "");
    assert.equal(stateOf(null), "");
    assert.equal(stateOf(undefined), "");
  });
});

describe("terminalsOfTab", () => {
  it("returns pane order first, followed by labelled sub-agents", () => {
    const tabId = "tab-1";
    const t1 = { address: "t1", state: "live", labels: { "herdr.tab": tabId } };
    const t2 = { address: "t2", state: "live", labels: { "herdr.tab": tabId } };
    const t3 = { address: "t3", state: "live", labels: { "herdr.tab": tabId } }; // no pane, labelled sub-agent

    const terminals = [t1, t2, t3];
    const panes = [
      { tab: tabId, terminal: "t2" },
      { tab: tabId, terminal: "t1" },
    ];

    const result = terminalsOfTab(tabId, terminals, panes);
    assert.deepEqual(result, [t2, t1, t3]);
  });

  it("does not duplicate terminals that appear in both panes and labels", () => {
    const tabId = "tab-1";
    const t1 = { address: "t1", state: "live", labels: { "herdr.tab": tabId } };
    const terminals = [t1];
    const panes = [
      { tab: tabId, terminal: "t1" },
      { tab: tabId, terminal: "t1" },
    ];

    const result = terminalsOfTab(tabId, terminals, panes);
    assert.equal(result.length, 1);
    assert.deepEqual(result, [t1]);
  });

  it("drops dead terminals even if referenced in panes or labels", () => {
    const tabId = "tab-1";
    const liveTerm = { address: "t1", state: "live", labels: { "herdr.tab": tabId } };
    const deadTerm = { address: "t2", state: "exited", labels: { "herdr.tab": tabId } };
    const otherTerm = { address: "t3", state: "stopped" };

    const terminals = [liveTerm, deadTerm, otherTerm];
    const panes = [
      { tab: tabId, terminal: "t2" },
      { tab: tabId, terminal: "t1" },
      { tab: tabId, terminal: "t3" },
    ];

    const result = terminalsOfTab(tabId, terminals, panes);
    assert.deepEqual(result, [liveTerm]);
  });

  it("matches a machine/tN pane terminal address to a local terminal address", () => {
    const tabId = "tab-1";
    const term = { address: "t5", state: "live", labels: { "herdr.tab": tabId } };
    const terminals = [term];
    const panes = [{ tab: tabId, terminal: "remote-server/t5" }];

    const result = terminalsOfTab(tabId, terminals, panes);
    assert.deepEqual(result, [term]);
  });
});

describe("locateTab", () => {
  it("finds the tab and its owning space", () => {
    const targetTab = { id: "tab-42", name: "My Tab" };
    const spaces = [
      { id: "s1", name: "Space 1", tabs: [{ id: "tab-1", name: "Other" }] },
      { id: "s2", name: "Space 2", tabs: [targetTab] },
    ];

    const result = locateTab("tab-42", spaces);
    assert.deepEqual(result, { space: spaces[1], tab: targetTab });
  });

  it("returns null space and tab when tabId is not found", () => {
    const spaces = [
      { id: "s1", name: "Space 1", tabs: [{ id: "tab-1", name: "Other" }] },
    ];
    assert.deepEqual(locateTab("tab-999", spaces), { space: null, tab: null });
    assert.deepEqual(locateTab("tab-1", []), { space: null, tab: null });
    assert.deepEqual(locateTab("tab-1", null), { space: null, tab: null });
  });
});

describe("reference", () => {
  it("omits title when title equals app", () => {
    const term = {
      address: "t3",
      name: "terminal",
      title: "terminal",
      cwd: "/projects/repo",
    };
    const space = { id: "sp-1", name: "Main" };
    const tab = { id: "tb-1", name: "Shell" };

    const ref = reference(term, space, tab);
    assert.equal(
      ref,
      't3 — herdr · terminal · tab "Shell" (tb-1) · space "Main" (sp-1) · /projects/repo · hc: get/read/send/wait t3'
    );
  });

  it("includes title in quotes when title differs from app", () => {
    const term = {
      address: "t4",
      report: { app: "opencode" },
      status: { state: "working", title: "fixing tests" },
      cwd: "/work/herdr",
    };
    const space = { id: "sp-2", name: "Dev" };
    const tab = { id: "tb-2", name: "Agent" };

    const ref = reference(term, space, tab);
    assert.equal(
      ref,
      't4 — herdr · opencode working · "fixing tests" · tab "Agent" (tb-2) · space "Dev" (sp-2) · /work/herdr · hc: get/read/send/wait t4'
    );
  });

  it("qualifies address when space has a machine", () => {
    const term = {
      address: "t7",
      name: "terminal",
      cwd: "/remote/dir",
    };
    const space = { id: "sp-3", name: "Cloud", machine: "aws-box" };
    const tab = { id: "tb-3", name: "Remote Tab" };

    const ref = reference(term, space, tab);
    assert.equal(
      ref,
      'aws-box/t7 — herdr · terminal · tab "Remote Tab" (tb-3) · space "Cloud" (sp-3) · /remote/dir · hc: get/read/send/wait aws-box/t7'
    );
  });
});
