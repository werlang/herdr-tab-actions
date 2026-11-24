// The space-pin New tab placeholder, as pure helpers.
//
// A tab is a placeholder while one of its panes is the `space-pin` mod. The
// tab bar hides it whenever the space has regular tabs, but the model still
// holds it (and its copy keeps running), so every last-tab close must reuse
// the one already there instead of adding another.

/**
 * Whether any of `tabs` is the `space-pin` New tab placeholder.
 * @param {Array<{id: string}> | undefined} tabs
 * @param {Array<{tab: string, mod?: string}> | undefined} allPanes `panes()`
 * @returns {boolean}
 */
export function hasPlaceholder(tabs, allPanes) {
  const ids = new Set((tabs ?? []).map((tab) => tab.id));
  return (allPanes ?? []).some((pane) => pane.mod === "space-pin" && ids.has(pane.tab));
}
