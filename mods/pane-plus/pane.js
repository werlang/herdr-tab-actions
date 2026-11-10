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
