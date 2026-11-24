import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCOPE,
  harnessOf,
  modesOf,
  savedMode,
  scopeOf,
  viewOf,
  withMode,
} from "../mods/tabs-ref/view-mode.js";

const pane = (tab, terminal, extra = {}) => ({ tab, terminal: terminal ?? null, ...extra });

describe("scopeOf", () => {
  it("accepts global and defaults everything else to the harness scope", () => {
    assert.equal(scopeOf("global"), "global");
    assert.equal(scopeOf("harness"), "harness");
    assert.equal(scopeOf(undefined), DEFAULT_SCOPE);
    assert.equal(scopeOf("nonsense"), DEFAULT_SCOPE);
  });
});

describe("modesOf", () => {
  it("tolerates missing and malformed values", () => {
    assert.deepEqual(modesOf(null), {});
    assert.deepEqual(modesOf("x"), {});
    assert.deepEqual(modesOf([]), {});
    assert.deepEqual(modesOf({ global: "chat" }), { global: "chat" });
  });
});

describe("harnessOf", () => {
  it("names the agent program of the tab's terminal", () => {
    assert.deepEqual(
      harnessOf("t1", [
        pane("t2", "tt9", { app: "claude-code", program: { key: "claude", name: "Claude Code", agent: true } }),
        pane("t1", "tt1", { app: "opencode", program: { key: "opencode", name: "OpenCode", agent: true } }),
      ]),
      { key: "opencode", label: "OpenCode" },
    );
  });

  it("prefers an agent over a shell sharing the tab", () => {
    assert.deepEqual(
      harnessOf("t1", [
        pane("t1", "tt2", { program: { key: "shell", name: "zsh" } }),
        pane("t1", "tt1", { app: "codex", program: { key: "codex", name: "Codex", agent: true } }),
      ]),
      { key: "codex", label: "Codex" },
    );
  });

  it("falls back to the program key and ignores tabs without terminals", () => {
    assert.deepEqual(
      harnessOf("t1", [pane("t1", "tt1", { program: { key: "shell", name: "zsh" } })]),
      { key: "shell", label: "zsh" },
    );
    assert.equal(harnessOf("t1", [pane("t2", "tt1")]), null);
    assert.equal(harnessOf("t1", []), null);
  });
});

describe("viewOf", () => {
  it("reads a zoomed chat or a chat-only tab as the chat view", () => {
    assert.equal(viewOf("t1", [pane("t1", "tt1"), pane("t1", null, { mod: "agent-chat", zoomed: true })]), "chat");
    assert.equal(viewOf("t1", [pane("t1", null, { mod: "agent-chat" })]), "chat");
  });

  it("reads a zoomed terminal, or no chat at all, as the original view", () => {
    assert.equal(
      viewOf("t1", [
        pane("t1", "tt1", { zoomed: true }),
        pane("t1", null, { mod: "agent-chat" }),
      ]),
      "original",
    );
    assert.equal(viewOf("t1", [pane("t1", "tt1")]), "original");
  });
});

describe("savedMode", () => {
  it("reads the global slot or the harness slot, ignoring invalid values", () => {
    const modes = { global: "chat", harness: { opencode: "original", codex: "chat", bad: "x" } };
    assert.equal(savedMode("global", modes, { key: "opencode" }), "chat");
    assert.equal(savedMode("harness", modes, { key: "opencode" }), "original");
    assert.equal(savedMode("harness", modes, { key: "codex" }), "chat");
    assert.equal(savedMode("harness", modes, { key: "bad" }), null);
    assert.equal(savedMode("harness", modes, null), null);
    assert.equal(savedMode("harness", {}, { key: "opencode" }), null);
  });
});

describe("withMode", () => {
  it("writes one scope and preserves the others", () => {
    const modes = { global: "chat", harness: { opencode: "chat" } };
    assert.deepEqual(withMode("harness", modes, { key: "codex" }, "original"), {
      global: "chat",
      harness: { opencode: "chat", codex: "original" },
    });
    assert.deepEqual(withMode("global", modes, { key: "codex" }, "original"), {
      global: "original",
      harness: { opencode: "chat" },
    });
    assert.deepEqual(modes, { global: "chat", harness: { opencode: "chat" } });
  });

  it("keeps the modes unchanged without a harness in the harness scope", () => {
    assert.deepEqual(withMode("harness", { global: "chat" }, null, "original"), {
      global: "chat",
      harness: {},
    });
  });
});
