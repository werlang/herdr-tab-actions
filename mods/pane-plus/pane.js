/**
 * Pure helpers for pane-plus. Kept free of `herdr` imports so the split and
 * menu rules can be tested with plain Node.
 */

/**
 * Herdr names a split by the side the new pane takes: "right" is side by side
 * and "down" is stacked. Anything else falls back to "right".
 *
 * @param {string} direction
 * @returns {"right" | "down"}
 */
export function splitDirection(direction) {
  return direction === "down" ? "down" : "right";
}

/**
 * The pane a header copy belongs to.
 *
 * `terminal.open` can hand a freshly created header the previous pane id while
 * `props().terminal` is already the new terminal. Both ids are valid at that
 * moment, so a bare pane lookup returns the wrong pane and the header's split,
 * zoom, close and focus actions target it. The terminal is the exact identity
 * and wins whenever it resolves, even across spaces.
 *
 * Without a terminal (a mod pane) or when the terminal no longer resolves, the
 * pane id is the fallback so the header still renders.
 *
 * @param {{ pane?: string | null, terminal?: string | null, panes?: any[] }} input
 * @returns {any | null}
 */
export function resolveHeaderPane({ pane, terminal, panes = [] } = {}) {
  const list = Array.isArray(panes) ? panes : [];
  const byPane = pane ? list.find((candidate) => candidate.pane === pane) ?? null : null;
  if (!terminal) return byPane;
  return list.find((candidate) => candidate.terminal === terminal) ?? byPane;
}

/**
 * The `pane.split` request for a header split button.
 *
 * With `new-pane` installed the new split is a chooser pane carrying the
 * direction and starting folder; without it the split opens a terminal
 * directly, like Herdr's shipped pane header.
 *
 * @param {string} direction
 * @param {string} pane
 * @param {string | undefined} spaceId
 * @param {string | undefined} folder
 * @param {boolean} withChooser
 * @returns {Record<string, unknown>}
 */
export function splitRequest(direction, pane, spaceId, folder, withChooser) {
  const dir = splitDirection(direction);
  if (!withChooser) return { direction: dir, pane };
  const props = { direction: dir };
  if (spaceId) props.space = spaceId;
  if (folder) props.folder = folder;
  return { direction: dir, pane, mod: "new-pane", props };
}

/**
 * The pane actions popup rows. `{ sep: true }` draws a rule between groups;
 * `actions()` returns just the clickable rows for keyboard navigation.
 *
 * @returns {Array<[string, string] | { sep: true }>}
 */
export function menuRows() {
  return [
    ["Split right", "split-right"],
    ["Split down", "split-down"],
    { sep: true },
    ["Move left", "left"],
    ["Move right", "right"],
    ["Move up", "up"],
    ["Move down", "down"],
    { sep: true },
    ["Zoom / unzoom", "zoom"],
    ["Close pane", "close"],
  ];
}

/**
 * The menu rows that run an action (no separators).
 *
 * @param {ReturnType<typeof menuRows>} rows
 * @returns {Array<[string, string]>}
 */
export function actions(rows = menuRows()) {
  return rows.filter((row) => !row.sep);
}

/**
 * Whether a pane hosts a full mod (like git-graph or file-editor) rather than
 * a terminal or the new-pane chooser.
 *
 * Full mod panes render their own headers and toolbars, so pane-plus renders
 * as a compact floating action pill instead of an occluding full-width bar.
 *
 * @param {{ mod?: string } | null | undefined} pane
 * @returns {boolean}
 */
export function isModPane(pane) {
  return Boolean(pane?.mod && pane.mod !== "new-pane" && pane.mod !== "space-pin");
}

/**
 * Delay in milliseconds before revealing the action pill on a mod pane.
 *
 * A deliberate dwell delay gives quick clicks a clear path to underlying
 * controls (like a mod's top-right refresh/search buttons) while still
 * revealing pane actions when the user pauses in the corner.
 */
export const MOD_HOVER_DELAY_MS = 400;
