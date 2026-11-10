# Herdr Tab & Pane Actions

Five independent mods for Herdr's tab bar, panes, and toast notifications, shipped together because
they cover the same workspace interaction surface:

- **Pin tab / Unpin tab** — right-click any tab to pin it. Pinned tabs show a pin icon and stay first in the tab bar.
- **Preview tabs** — tabs opened as temporary previews by `file-editor` are dimmed and show a hollow dot; double-click the tab (or pin it) to keep it permanently.
- **Close protection** — bind `cmd+w` to `tabs-ref.closeTab`; on a pinned tab it selects the nearest tab instead of closing.
- **Copy reference** — right-click a tab or terminal pane to copy its `hc` address and context for another agent.
- **Pane header** — a compact header on each pane with split right/down, move/reorder, zoom and close.
- **New pane chooser** — a split opens the same Terminal/agent screen as the New tab placeholder; picking an option starts it in the split.
- **Toast modal dialogs** — clicking any notification toast expands it into a centered modal dialog with the full message, clipboard copy, and optional action run.

![Herdr Tab & Pane Actions](preview.png)

## What's inside

| Mod | What it does | Where it mounts |
|---|---|---|
| `tabs-ref` | Tab bar: pinned tabs, `cmd+w` protection, preview tabs, the `+` menu | `tabs` block |
| `ref-menu` | Tab and pane right-click menu: Copy reference, Pin tab, split, zoom, close | root `terminal_menu` |
| `pane-plus` | Pane header: split right/down, move/reorder, zoom, close | `pane.header` |
| `new-pane` | Terminal/agent chooser for a new split | created by `pane-plus` or `ref-menu`; no layout slot |
| `toast` | Toast notification: click expands into full-message modal dialog with copy | `toast` (replaceable) |

Each mod works alone. The repo is only the shipping unit: install all five for
the full feature, or only the ones you want.

## Splitting and reordering panes

`pane-plus` draws the header on every pane; the layout's `reveal` decides when
it shows. Hover a pane and use:

- **Split right** — side by side; the new pane goes to the right.
- **Split down** — stacked; the new pane goes below.
- **Move** — opens a menu with Move left / right / up / down (`pane.swap`).
- **Zoom / close** — the same actions as Herdr's shipped pane header.

When `new-pane` is installed, a split opens that chooser first. It lists
**Terminal** (`T` or Enter) and the installed agents (`1`–`9`). Choosing one
starts it in the split and closes the chooser, so the terminal or agent takes
the split's place. Without `new-pane`, splits start a terminal directly.

You can also reorder panes without the menu: drag a pane by the app's top-center
grip, or use `cmd-alt-shift-arrows` (`pane.swap`). Both are built into Herdr.

The header needs `"lone": true` in the pane frame. Without it, a tab's only pane
— the one where the first split starts — has no frame to draw the header on.

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

`tabs-ref` and `ref-menu` are designed together, `pane-plus` and `new-pane` are
designed together, but every mod is installable on its own:

| Installed | What you get |
|---|---|
| `tabs-ref` only | Pinned tabs, `cmd+w` protection, `cmd+1..9`. Tab right-click opens Herdr's own menu. |
| `ref-menu` only | Copy reference on tabs and panes. **Pin tab** appears only while `tabs-ref` is mounted. Splits open the chooser when `new-pane` is installed. |
| `pane-plus` only | Pane header with split (terminal), move/reorder, zoom and close. |
| `new-pane` only | No visible UI until something opens it with `pane.split {mod: "new-pane"}`. It is the chooser body. |
| `new-pane` missing | Splits from `pane-plus` and `ref-menu` start terminals directly. |
| `space-pin` missing | `cmd+t` opens a terminal tab; closing the last tab closes the space, as in Herdr. |
| `new-menu-plus` / `agent-chat` missing | `+` opens a terminal tab; the Original / Chat toggle is hidden. |

Optional mods are detected from `~/.config/herdr-app/mods/` live — when a menu opens or on a short periodic check — so installing or turning one off applies without reopening Herdr.

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

2. Point your **personal layout** at the mods. The tab bar, the right-click menu
   and the pane header are three separate slots:

   ```json
   {
     "terminal_menu": "ref-menu",
     "children": [
       {
         "id": "tabs",
         "type": "block",
         "content": { "mod": "tabs-ref" }
       },
       {
         "id": "main",
         "type": "block",
         "content": {
           "tab": "active",
           "pane": {
             "lone": true,
             "header": {
               "content": { "mod": "pane-plus" },
               "height": 30,
               "position": "top",
               "reveal": "hover"
             }
           }
         }
       }
     ]
   }
   ```

   `new-pane` needs no layout slot: `pane-plus` and `ref-menu` create it inside a
   split. Use `"reveal": "always"` instead of `"hover"` if you want the header
   permanently visible.

   If using a shipped layout, clone it first:

   ```sh
   herdr-app do layout.clone --name main --as my-layout
   ```

3. Bind the tab keys in `~/.config/herdr-app/keys.json`:

   ```json
   {
     "global": {
       "cmd-t": "tabs-ref.newTab",
       "cmd-w": "tabs-ref.closeTab",
       "cmd-1": "tabs-ref.select1",
       "cmd-2": "tabs-ref.select2",
       "cmd-3": "tabs-ref.select3",
       "cmd-4": "tabs-ref.select4",
       "cmd-5": "tabs-ref.select5",
       "cmd-6": "tabs-ref.select6",
       "cmd-7": "tabs-ref.select7",
       "cmd-8": "tabs-ref.select8",
       "cmd-9": "tabs-ref.select9"
     }
   }
   ```

   `cmd-d` / `cmd-shift-d` already split directly to a terminal with Herdr's
   built-in `pane.split`. In a layout that mounts `pane-plus`, you can bind them
   to `pane-plus.splitRight` / `pane-plus.splitDown` to open the chooser from
   the keyboard instead, and bind `pane-plus.menu` to open the pane actions
   menu (move/reorder, split, zoom, close). Mod commands only resolve while the
   mod is mounted, so keep the built-in commands for layouts without
   `pane-plus`.

4. Verify:

   ```sh
   herdr-app check ~/.config/herdr-app/mods/tabs-ref
   herdr-app check ~/.config/herdr-app/mods/ref-menu
   herdr-app check ~/.config/herdr-app/mods/pane-plus
   herdr-app check ~/.config/herdr-app/mods/new-pane
   ```

## What's not here

- Spaces, pinning, sorting, the New tab placeholder and the space-side panels belong to [`herdr-space-actions`](https://github.com/werlang/herdr-space-actions).
- Usage/status gauges belong to [`herdr-usage-status`](https://github.com/werlang/herdr-usage-status).

## Repository

Source of truth for all four mods. After edits:

```sh
./sync.sh
```

## Publish

This repo is an app-mod repo. To share it on `herdr.dev/mods`:

- keep `mods/tabs-ref`, `mods/ref-menu`, `mods/pane-plus` and `mods/new-pane` at the root;
- keep `RECIPE.md` and `preview.png`;
- add the topic `herdr-mod`;
- make the repository public.
