import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DOT,
  copyableText,
  levelLabel,
  buildModalOverlay,
  splitLines,
} from "../mods/toast/toast-logic.js";

describe("DOT level colors", () => {
  it("maps semantic levels to theme token keys", () => {
    assert.equal(DOT.error, "blocked");
    assert.equal(DOT.warning, "working");
    assert.equal(DOT.success, "done");
    assert.equal(DOT.info, "accent");
  });

  it("handles fallback cleanly", () => {
    assert.equal(DOT["custom"] ?? "accent", "accent");
    assert.equal(DOT[undefined] ?? "accent", "accent");
  });
});

describe("levelLabel", () => {
  it("returns human-readable labels", () => {
    assert.equal(levelLabel("error"), "Error");
    assert.equal(levelLabel("warning"), "Warning");
    assert.equal(levelLabel("success"), "Success");
    assert.equal(levelLabel("info"), "Info");
    assert.equal(levelLabel("other"), "Notification");
    assert.equal(levelLabel(undefined), "Notification");
  });
});

describe("copyableText", () => {
  it("combines title and body when both are distinct", () => {
    const text = copyableText("Command failed", "Exit code 127: file not found");
    assert.equal(text, "Command failed\n\nExit code 127: file not found");
  });

  it("uses body when title is empty or null", () => {
    assert.equal(copyableText("", "Detailed body message"), "Detailed body message");
    assert.equal(copyableText(null, "Detailed body message"), "Detailed body message");
  });

  it("uses title when body is empty or null", () => {
    assert.equal(copyableText("Task completed", ""), "Task completed");
    assert.equal(copyableText("Task completed", null), "Task completed");
  });

  it("avoids repeating identical title and body", () => {
    assert.equal(copyableText("Everything is OK", "Everything is OK"), "Everything is OK");
  });

  it("handles empty or missing inputs", () => {
    assert.equal(copyableText(null, null), "");
    assert.equal(copyableText("", ""), "");
    assert.equal(copyableText("   ", "   "), "");
  });
});

describe("buildModalOverlay", () => {
  it("creates a dialog overlay spec targeting mod toast", () => {
    const overlay = buildModalOverlay({
      title: "Agent finished",
      body: "Completed 3 tasks successfully.",
      level: "success",
      icon: "mods/agent-chat/icon.svg",
      action: { name: "terminal.focus", args: { terminal: "t1" } },
    });

    assert.equal(overlay.mod, "toast");
    assert.equal(overlay.kind, "dialog");
    assert.equal(overlay.width, 520);
    assert.deepEqual(overlay.props, {
      modal: true,
      title: "Agent finished",
      body: "Completed 3 tasks successfully.",
      level: "success",
      icon: "mods/agent-chat/icon.svg",
      action: { name: "terminal.focus", args: { terminal: "t1" } },
    });
  });

  it("defaults omitted fields gracefully", () => {
    const overlay = buildModalOverlay();

    assert.equal(overlay.mod, "toast");
    assert.equal(overlay.kind, "dialog");
    assert.equal(overlay.width, 520);
    assert.deepEqual(overlay.props, {
      modal: true,
      title: "",
      body: "",
      level: "info",
      icon: null,
      action: null,
    });
  });
});

describe("splitLines", () => {
  it("splits LF newlines", () => {
    assert.deepEqual(splitLines("line 1\nline 2\nline 3"), ["line 1", "line 2", "line 3"]);
  });

  it("splits CRLF newlines", () => {
    assert.deepEqual(splitLines("line 1\r\nline 2"), ["line 1", "line 2"]);
  });

  it("returns empty array for empty or non-string input", () => {
    assert.deepEqual(splitLines(""), []);
    assert.deepEqual(splitLines(null), []);
    assert.deepEqual(splitLines(undefined), []);
  });
});
