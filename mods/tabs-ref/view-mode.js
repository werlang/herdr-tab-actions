// View-mode (Original / Chat) scope and memory.
//
// The toggle picks the mode; the little chevron beside it picks what the
// choice applies to: every agent (global) or only the agent program in the
// tab (a harness, e.g. OpenCode or Claude Code). The modes are kept in
// shared("tabs.viewModes") so the choice survives restarts, and are applied
// when a tab is shown.

/** Where the choice is stored when the person never picked a scope. */
export const DEFAULT_SCOPE = "harness";

/**
 * The two scopes, normalized: anything else reads as the per-harness default.
 * @param {unknown} value `shared("tabs.viewScope")`
 * @returns {"global" | "harness"}
 */
export function scopeOf(value) {
  return value === "global" ? "global" : DEFAULT_SCOPE;
}

/**
 * The stored modes object, tolerant of a missing or malformed value.
 * @param {unknown} value `shared("tabs.viewModes")`
 * @returns {{ global?: "chat" | "original", harness?: Record<string, "chat" | "original"> }}
 */
export function modesOf(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

/**
 * The agent program a tab runs, as the scope's key and a readable label.
 * A tab with several terminals prefers the agent over a plain shell.
 * @param {string} tabId
 * @param {Array<{tab: string, terminal: string | null, app?: string | null, program?: { key?: string, name?: string, agent?: boolean } | null}>} panes `panes()`
 * @returns {{ key: string, label: string } | null}
 */
export function harnessOf(tabId, panes = []) {
  const mine = (panes || []).filter((p) => p.tab === tabId && p.terminal);
  const term = mine.find((p) => p.program?.agent) ?? mine[0];
  if (!term) return null;
  const key = term.app || term.program?.key;
  if (!key) return null;
  return { key: String(key), label: term.program?.name || String(key) };
}

/**
 * Which view a tab currently shows. A chat pane alone is the chat view; a
 * chat beside a terminal only is when the chat pane has the zoom.
 * @param {string} tabId
 * @param {Array<{tab: string, terminal: string | null, mod?: string, zoomed?: boolean}>} panes `panes()`
 * @returns {"chat" | "original"}
 */
export function viewOf(tabId, panes = []) {
  const mine = (panes || []).filter((p) => p.tab === tabId);
  const chat = mine.find((p) => p.mod === "agent-chat");
  const term = mine.find((p) => p.terminal);
  return chat && (chat.zoomed || !term) ? "chat" : "original";
}

/**
 * The remembered mode for one scope key, or null when never chosen.
 * @param {"global" | "harness"} scope
 * @param {{ global?: string, harness?: Record<string, string> }} modes
 * @param {{ key: string } | null} harness
 * @returns {"chat" | "original" | null}
 */
export function savedMode(scope, modes, harness) {
  const value = scope === "global" ? modes.global : harness ? modes.harness?.[harness.key] : null;
  return value === "chat" || value === "original" ? value : null;
}

/**
 * Records a mode choice for the scope, without mutating the input.
 * A per-harness choice without a harness keeps the modes as they were.
 * @param {"global" | "harness"} scope
 * @param {{ global?: string, harness?: Record<string, string> }} modes
 * @param {{ key: string } | null} harness
 * @param {"chat" | "original"} mode
 * @returns {{ global?: "chat" | "original", harness?: Record<string, "chat" | "original"> }}
 */
export function withMode(scope, modes, harness, mode) {
  const next = { ...modes, harness: { ...(modes.harness ?? {}) } };
  if (scope === "global") next.global = mode;
  else if (harness) next.harness[harness.key] = mode;
  return next;
}
