/**
 * Pure helpers for the new-pane chooser. Kept free of `herdr` imports so the
 * pane matching and launch arguments can be tested with plain Node.
 */

/**
 * The pane id of this chooser copy.
 *
 * A mod pane created with `pane.split {mod, props}` receives only its props,
 * not its own pane id. When none was supplied, match the focused pane if it is
 * a chooser; otherwise accept the only chooser in the tab. Two choosers in one
 * tab cannot be told apart, so neither is claimed: the user clicks the one
 * they mean, which focuses it and makes the first rule apply.
 *
 * @param {Array<{pane: string, mod?: string}>} panesInTab
 * @param {string | null | undefined} focusedPane
 * @returns {string | null}
 */
export function ownPane(panesInTab, focusedPane) {
  const mine = (panesInTab ?? []).filter((p) => p?.mod === "new-pane");
  const focused = mine.find((p) => p.pane === focusedPane);
  if (focused) return focused.pane;
  return mine.length === 1 ? mine[0].pane : null;
}

/**
 * `terminal.open` arguments for a chooser pick. `direction` is the split the
 * chooser was created in, so the terminal lands on the same side and keeps the
 * chooser's slot when the chooser closes.
 *
 * @param {string} direction
 * @param {string | undefined} folder
 * @param {{argv?: unknown, name?: string} | null | undefined} choice
 * @returns {Record<string, unknown>}
 */
export function openArgs(direction, folder, choice) {
  const args = { place: direction === "down" ? "down" : "right" };
  if (folder) args.folder = folder;
  if (choice?.argv) args.argv = choice.argv;
  if (choice?.name) args.name = choice.name;
  return args;
}

/**
 * Installed agents in the order the chooser lists them: alphabetical, with
 * non-installed agents hidden.
 *
 * @param {Array<{name?: string, installed?: boolean}> | null | undefined} agents
 * @returns {Array}
 */
export function chooserAgents(agents) {
  return (Array.isArray(agents) ? agents : [])
    .filter((a) => a?.installed)
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
}
