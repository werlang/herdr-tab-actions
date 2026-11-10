/**
 * Pure helpers for the VS Code-style preview tabs published by file-editor.
 *
 * file-editor records `preview: true` in `shared("file-editor.openTabs")`. This
 * module keeps the matching/promotion rules free of `herdr` imports so the
 * cross-mod contract can be tested with plain `node:test`.
 */

/**
 * Finds the openTabs entry for a tab when it is a file-editor preview.
 *
 * A recorded tab id is authoritative: when it is present but stale, the entry
 * is never matched by name (another tab could own that name now). The name
 * fallback exists only for the first frames of a freshly created tab, before
 * its view has registered the id.
 *
 * `editorTabIds` makes the match require a live file-editor pane: uninstalling
 * the editor or closing its pane must not leave stale italics or promote a
 * terminal tab. Pass `null`/`undefined` to skip that check in pure tests.
 *
 * @param {Record<string, any>} openTabs
 * @param {{ id: string, name: string }} tab
 * @param {Set<string> | string[] | null} [editorTabIds=null]
 * @returns {{ key: string, entry: Record<string, any> } | null}
 */
export function findPreviewEntry(openTabs, tab, editorTabIds = null) {
  if (!openTabs || typeof openTabs !== "object" || !tab) return null;
  const hasEditorFilter = editorTabIds !== null && editorTabIds !== undefined;
  const editorIds =
    editorTabIds instanceof Set ? editorTabIds : new Set(Array.isArray(editorTabIds) ? editorTabIds : []);

  for (const [key, entry] of Object.entries(openTabs)) {
    if (!entry || typeof entry !== "object" || entry.preview !== true) continue;
    if (typeof entry.tabId === "string" && entry.tabId.length > 0) {
      if (entry.tabId === tab.id && (!hasEditorFilter || editorIds.has(tab.id))) {
        return { key, entry };
      }
      continue;
    }
    if (entry.tabName && entry.tabName === tab.name && (!hasEditorFilter || editorIds.has(tab.id))) {
      return { key, entry };
    }
  }
  return null;
}

/**
 * Returns a copy of the openTabs map with one preview promoted to permanent.
 * The recorded tab id is kept (or filled in from the live tab when the entry
 * was still waiting for it).
 *
 * @param {Record<string, any>} openTabs
 * @param {string} key
 * @param {string} tabId
 * @returns {{ next: Record<string, any>, promoted: boolean }}
 */
export function promoteOpenTab(openTabs, key, tabId) {
  const map = openTabs && typeof openTabs === "object" ? openTabs : {};
  const entry = map[key];
  if (!entry || typeof entry !== "object" || entry.preview !== true) {
    return { next: { ...map }, promoted: false };
  }
  const { preview: _preview, ...rest } = entry;
  return {
    next: { ...map, [key]: { ...rest, tabId: entry.tabId || tabId } },
    promoted: true,
  };
}
