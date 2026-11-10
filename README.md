# Herdr Tab Actions

Pinned tabs with close protection, plus copy reference for terminal panes and tabs in Herdr:

- **Pin tab / Unpin tab** — right-click any tab to pin it. Pinned tabs show a pin icon and stay first in the tab bar.
- **Preview tabs** — tabs opened as temporary previews by `file-editor` show their name in italic; double-click the tab (or pin it) to keep it permanently.
- **Close protection** — bind `cmd+w` to `tabs-ref.closeTab` so pressing close on a pinned tab navigates to the nearest tab instead of closing it.
- **Copy reference** — right-click a tab or terminal pane to copy its `hc` address and context to the clipboard for another agent to control.

![Herdr Tab Actions](preview.png)

## Tab pinning & protection

Right-click a tab to pin it:

- Pinned tabs show a pin icon and always sit before regular unpinned tabs.
- Pin state lives in `shared("tabs.pinned")` and persists across closing and reopening Herdr. Closed tab ids remain harmless because Herdr never reuses tab ids.
- The tab bar reorders the model using `tab.move`, so keyboard navigation (`cmd+1..9`, `tab.next`, `tab.prev`) stays consistent.
- **`cmd+1..9` follows the tab bar:** bind `cmd-1`..`cmd-9` to `tabs-ref.select1`..`tabs-ref.select9`. Only visible tabs count, the hidden New tab placeholder is never selected, and a number past the last tab is ignored without an error (built-in `tab.select:N` errors there and counts hidden tabs).
- **`cmd+w` never closes a pinned tab:** bind `cmd-w` to `tabs-ref.closeTab`. On a pinned tab, it selects the closest available tab instead of closing. Unpinned tabs close normally. Explicit **Close** in the right-click menu or clicking the close button still closes a pinned tab.
- **New tab placeholder:** the hidden placeholder is `space-pin` from [`herdr-space-actions`](https://github.com/werlang/herdr-space-actions). It is optional; without it, the tab bar still works but has no placeholder to hide or restore. The icon used for it is bundled here. Bind `cmd-t` to `tabs-ref.newTab` to open or select it; without `tabs-ref`, use `spaces-plus.newTerminal` or `tab.new`.
- **Preview tabs:** when [`file-editor`](https://github.com/werlang/herdr-file-editor) is installed, a file opened with a single click is published as a preview in `shared("file-editor.openTabs")`. Its tab name is italic, double-clicking promotes it to permanent instead of renaming, and pinning also promotes it. Opening another preview replaces the previous temporary tab from the editor side.
- **New tab button at the end of the strip:** the `+` sits after the last visible tab and scrolls with the tabs. It opens `new-menu-plus` in one click when that mod is installed; otherwise it opens a terminal tab directly.

## Each mod works alone

`tabs-ref` and `ref-menu` are designed together, but you can install either one by itself, and neither needs a mod from another repo:

| Installed | What you get |
|---|---|
| `tabs-ref` only | Pinned tabs, `cmd+w` protection, `cmd+1..9`. Tab right-click opens Herdr's own menu. |
| `ref-menu` only | Copy reference on tabs and panes. **Pin tab** appears only while `tabs-ref` is in your layout. |
| `space-pin` missing | `cmd+t` opens a terminal tab; closing the last tab closes the space, as in Herdr. |
| `new-menu-plus` / `agent-chat` missing | `+` opens a terminal tab; the Original / Chat toggle is hidden. |

Optional mods are detected from `~/.config/herdr-app/mods/` every few seconds, so installing or turning one off applies live.

## Copy reference

Right-click a tab or terminal pane → **Copy reference · <program>**.

The clipboard receives a line formatted for agent interoperability:

```text
t9 — herdr · opencode working · "OC | Terminal tab IDs for agent sync" · tab "OpenCode" (tb…) · space "~" (sp…) · /Users/pablowerlang · hc: get/read/send/wait t9
```

Another agent or script can immediately act on it using Herdr Core:

```sh
hc get t9
hc read t9 --lines 80
hc send t9 "npm test"
hc wait t9
```

On remote machines, the address automatically includes the machine target (`machine/t9`).

## Requirements

- Herdr app.
- Clipboard utility: macOS built-in (`osascript`), Linux (`wl-copy` or `xclip`), Windows (PowerShell).

## Install

1. Sync the mods into `~/.config/herdr-app/mods/`:

   ```sh
   ./sync.sh
   ```

2. Point your **personal layout** at `tabs-ref` and `ref-menu`:

   ```json
   {
     "terminal_menu": "ref-menu",
     "children": [
       {
         "id": "tabs",
         "type": "block",
         "content": { "mod": "tabs-ref" }
       }
     ]
   }
   ```

   If using a shipped layout, clone it first:

   ```sh
   herdr-app do layout.clone --name main --as my-layout
   ```

3. Bind `cmd-w` in `~/.config/herdr-app/keys.json` to enable pinned tab protection:

   ```json
   {
     "keys": {
       "global": {
         "cmd-w": "tabs-ref.closeTab"
       }
     }
   }
   ```

4. Verify:

   ```sh
   herdr-app check ~/.config/herdr-app/mods/tabs-ref
   herdr-app check ~/.config/herdr-app/mods/ref-menu
   ```

## Repository

Source of truth for both mods. After edits:

```sh
./sync.sh
```

## Publish

This repo is an app-mod repo. To share it on `herdr.dev/mods`:

- keep `mods/tabs-ref` and `mods/ref-menu` at the root;
- keep `RECIPE.md` and `preview.png`;
- add the topic `herdr-mod`;
- make the repository public.
