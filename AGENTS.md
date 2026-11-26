# herdr-tab-actions

Source of truth for the Herdr **tabs, panes, and terminal references** mods:

- `mods/tabs-ref` — clone of the tab bar that opens `ref-menu` on right-click, shows the pin icon, keeps pinned tabs ahead of regular tabs, hides the New tab (`space-pin`) placeholder when normal tabs exist (unless selected), places the `+` button at the end of the bar (after the last visible tab), shows a **Docker** button to the left of **Files** when the layout mounts a `docker` block in `panel-body` (with the same per-space toggle as Files/Changes), and handles `tabs-ref.closeTab`, `tabs-ref.newTab`, `tabs-ref.viewScope`, and `tabs-ref.select1`..`select9`.
- `mods/ref-menu` — clone of the pane and tab context menu with **Pin tab / Unpin tab** and **Copy reference** (copies the terminal's `hc` address + context to the clipboard via `ref.js`). With `new-pane` installed, **Split right** / **Split down** open the chooser in the new pane; without it, they open a terminal directly.
- `mods/pane-plus` — clone of the shipped `pane` header: shows program, folder, and status and, on hover, **Split right**, **Split down**, **Move**, **Zoom**, and **Close** buttons. Splits open `new-pane` when installed; otherwise they open a terminal directly. The Move button opens its own popup (props `{ menu: pane }`) with Split right/down, Move left/right/up/down, Zoom, and Close.
- `mods/new-pane` — the **New pane** chooser (same visual style as `space-pin`'s New tab): Terminal (`T`/Enter) and installed agents (`1`–`9`). On selection, opens the terminal/agent in the split and closes the chooser pane so the selection takes its place.
- `mods/toast-plus` — uniquely named clone of the shipped `toast` mod: clicking any notification opens a centered modal dialog showing the full title, full message with preserved line breaks and scrolling, a button to copy the message to the clipboard (`cx.write_to_clipboard`), a button to run the original action (if any), and a Close/Esc button. The name cannot be `toast` because Herdr restores the shipped mod on every start (custom goes to `toast-edited*`), so the layout selects the clone at root with `"toast": "toast-plus"`. Formatting logic lives in `toast-logic.js` and is tested in pure Node.

## Pane header

`pane-plus` is mounted in the pane frame header:

```json
"pane": {
  "lone": true,
  "header": {
    "content": { "mod": "pane-plus" },
    "height": 30,
    "position": "top",
    "reveal": "hover"
  }
}
```

`lone: true` is required: without it, a tab's single pane (where the first split starts) has no frame and the header does not appear. `reveal: "hover"` shows the header only when hovering the pane; `"always"` keeps it fixed.

Buttons:

- **Split right** / **Split down** → `pane.split` with that instance's `pane`.
- **Move** → popup with `pane.swap` in all four directions.
- **Zoom** → `pane.zoom`; **Close** → `pane.close`.
- The Move button only appears when `panes()[i].movable` is true (not on a lone or zoomed pane).

When `terminal.open` creates a pane, the header can receive for one frame the previous `props().pane` alongside the new `props().terminal`. Both ids are valid, so `me()` cannot trust the pane first: `resolveHeaderPane` in `pane.js` uses the exact terminal when it resolves (even if the old pane is in another space), preserves mod panes without a terminal, and falls back to the pane id only when the terminal does not resolve. That resolved pane drives split, zoom, close, and focus.

With `new-pane` installed, splitting becomes `pane.split { direction, pane, mod: "new-pane", props: { space, direction, folder } }`. Without it, `pane.split { direction, pane }` opens a terminal.

Optional keyboard commands: `pane-plus.splitRight`, `pane-plus.splitDown`, and `pane-plus.menu`. Every header instance receives the command; only the instance whose `props().pane` is the focused pane acts. Since a mod command only resolves when the mod is mounted, keep `pane.split:right`/`:down` in layouts without `pane-plus`.

## New pane

`new-pane` is a mod pane created by `pane.split`, not a tab: it has no slot in the layout. Props: `{ space, direction, folder }`.

- Lists Terminal and installed agents (alphabetical order, `knownAgents`, cached in `shared("new-menu.agents")`).
- `T`/Enter opens a terminal; `1`–`9` opens the corresponding agent.
- On selection: `pane.focus` on the chooser itself, `terminal.open { place: direction, folder, argv?, name? }`, and `pane.close` on the chooser pane. The terminal/agent takes the split's place.
- `focusable: true`: `pane.go` can enter the instance and sends `focus` via `nextCommand()`. A short 500 ms window tries to grab keyboard focus when the split was just created; hidden instances and two choosers in the same tab do not fight for focus (see `ownPane` in `chooser.js`).
- The chooser shares the visual style of `space-pin`; the title is **New pane**. `folder` comes from the split pane (`p.pane.cwd` via `pane-plus`, or `place(space)` in `ref-menu`), falling back to the space's location (including a pinned space's fixed location).

## Pinned tabs

Tab state is stored in `shared("tabs.pinned")` (tab ids). Right-clicking a tab shows **Pin tab / Unpin tab**; a pinned tab gets the pin icon and moves to the start of regular tabs. `tabs-ref` reorders the model via `tab.move` (pinned, then unpinned, then any placeholders), so `cmd+1..9`, `tab.next`, and dragging stay consistent. The list survives restarting Herdr; closed tab ids remain harmlessly because tab ids are never reused.

Bind `cmd+1..9` to `tabs-ref.select1`..`tabs-ref.select9` (a mod command takes no arguments, hence one per number):

```json
"cmd-1": "tabs-ref.select1",
"cmd-9": "tabs-ref.select9"
```

`tabs-ref` counts only tabs shown in the bar (`visibleTabs`): a hidden `space-pin` placeholder is never reached, and a number higher than the visible tab count is ignored without error (built-in `tab.select:N` errors and counts hidden tabs). Without `tabs-ref` mounted, keep `tab.select:N`.

Bind `cmd+w` to `tabs-ref.closeTab`:

```json
"cmd-w": "tabs-ref.closeTab"
```

On a pinned tab it does not close: it selects the nearest tab (ties go right). On a normal tab it calls `tab.close` as before. The tab's X button and the menu's **Close** item still close explicitly, including pinned tabs. `<mod>.<command>` requires the mod to be mounted in the layout; without `tabs-ref`, keep `cmd-w` bound to `tab.close`.

Bind `cmd+t` to `tabs-ref.newTab` when `tabs-ref` is mounted:

```json
"cmd-t": "tabs-ref.newTab"
```

It opens or selects the active space's **New tab** (`space-pin`) placeholder instead of creating a terminal directly. Without `tabs-ref`, use `spaces-plus.newTerminal` (or `tab.new`) — see the `herdr-space-actions` repo.

## Reordering panes

- The header has **Move** → `pane.swap` left/right/up/down.
- The app already supports drag-reordering via the pane's top grip; `cmd-alt-shift-arrows` are already bound to `pane.swap` in the user's `keys.json`.
- `pane.swap` swaps with the neighbor in that direction; with no neighbor, it does nothing.

## Copy reference

Right-clicking a terminal pane or a tab offers **Copy reference · <app>**:

1. Copies to the clipboard a structured line starting with the `hc` address (`t9` or `machine/t9`) followed by context (program, title, tab, space, directory).
2. Other agents or scripts can interact with the terminal immediately via `hc get/read/send/wait <address>`.
3. Works on macOS (`osascript`), Linux (`wl-copy` or `xclip`), and Windows (PowerShell).

## Rule: always update Herdr's live folder

Herdr loads mods from `~/.config/herdr-app/mods/<name>`. After **any** change here:

```sh
./sync.sh
```

The script copies `tabs-ref`, `ref-menu`, `pane-plus`, `new-pane`, and `toast-plus` to the live folder and runs `herdr-app check` on them. Do not edit the live folder directly.

## Layout wiring

The layout points the `tabs` block to `tabs-ref`, root `terminal_menu` to `ref-menu`, root `toast` to `toast-plus`, and the pane frame header to `pane-plus`:

```json
{
  "id": "tabs",
  "type": "block",
  "content": { "mod": "tabs-ref" }
}
```

```json
"terminal_menu": "ref-menu"
```

```json
"toast": "toast-plus"
```

```json
"pane": {
  "lone": true,
  "header": {
    "content": { "mod": "pane-plus" },
    "height": 30,
    "position": "top",
    "reveal": "hover"
  }
}
```

`new-pane` is not wired in the layout: it is created by `pane.split` inside a tab. Herdr's original `tabs`, `menu`, and `toast` remain untouched. If the layout is reset, restore these five slots.

## Optional integrations

No mod in this repo depends on any other mod (neither in this repo nor in others): each is installable standalone. `tabs-ref`, `pane-plus`, and `ref-menu` check for optional mods in the live folder (`mods/<name>/mod.json`); `tabs-ref` re-checks every 5 s, `pane-plus` every 15 s, and `ref-menu` on every menu open, so installing or disabling one takes effect immediately. Icons always live in the mod's own folder or in a shipped Herdr mod (`pane`, `workspace-chrome`, `files`, `changes`); never use assets from another custom mod.

- `ref-menu` (this repo): when installed, serves as the right-click menu on a tab. Without it, opens Herdr's `menu` (without Copy reference or Pin tab). Conversely, `ref-menu` only shows **Pin tab** while `tabs-ref` is mounted in the layout, and only creates the placeholder when closing the last tab if `space-pin` is installed.
- `new-pane` (this repo): when installed, `pane-plus` and `ref-menu` splits open the chooser; without it, they open a terminal directly.
- `new-menu-plus` (from `herdr-space-actions`): when installed, the `+` button opens the quick tab-creation overlay. Without it, the `+` button runs the default `tab.new` action in the active space. The old `cmd+opt+t` shortcut (`tabs-ref.newMenu`) was removed: `cmd+t` already opens the New tab.
- `agent-chat` (from `herdr-agent-chat`): when installed, displays the Original / Chat toggle in the tab bar to switch or create the chat split. Without it, the chat toggle bar is not rendered. Toggle icons are local copies (`mods/tabs-ref/terminal.svg`, `chat.svg`). A chevron on the right opens the scope menu: **All agents** (global) or **<harness> only** (per harness, e.g. OpenCode, Claude Code). Scope is stored in `shared("tabs.viewScope")` (`"global"` or `"harness"`, default `"harness"`) and chosen modes in `shared("tabs.viewModes")` (`{ global, harness: { <app>: "chat" | "original" } }`), both persisted. When opening a tab (even before showing it, to avoid terminal flicker) and on every visit, `syncViewMode`/`applySavedMode` apply the remembered mode for the scope; the "already applied" guard is per-visit, so returning to a tab reapplies chat (or terminal) instead of staying on the CLI. Clicking the toggle saves the current mode. Pure logic lives in `view-mode.js` and is tested in `test/view-mode.test.js`.
- `space-pin` (from `herdr-space-actions`): the **New tab** placeholder tab that `tabs-ref` hides, restores, and selects. `tabs-ref` reuses an existing placeholder when closing the last tab (never stacks hidden placeholders) and creates a new one unfocused so the closing tab stays on screen if `tab.close` does not take. The icon used in the bar is a local copy at `mods/tabs-ref/new-tab.svg` so the repo stays publishable standalone. Without `space-pin`, the tab bar still works, but there is no pinned-space placeholder: `cmd+t` opens a terminal tab and closing the last tab closes the space, as in stock Herdr.
- `file-editor` (from `herdr-file-editor`): when installed, publishes `preview: true` in `shared("file-editor.openTabs")` for single-clicked tabs. `tabs-ref` draws the name italic and muted with a hollow dot, promotes the tab to permanent on double-click (instead of opening rename), and also promotes on pin. Without `file-editor`, there are no preview tabs and double-click keeps renaming.

## File previews

Preview (temporary) tabs come from `file-editor` and are identified by `entry.preview === true` in the `shared("file-editor.openTabs")` map. `tabs-ref` matches by `tabId` first and, while a newly created tab has not registered its id yet, by exact `tabName`; in both cases the tab must currently host a `file-editor` pane so italics or promotion do not linger when the editor is uninstalled or the pane is closed. Opening another file in preview replaces the previous temporary tab; editing or pinning the tab makes it permanent (pinning from `ref-menu` arrives via `tabs-ref.reorder`, which promotes pinned previews before reordering). Double-clicking a permanent tab keeps the existing rename behavior.

## Tests

To run the unit tests for `ref.js`, `preview.js`, `pane.js`, `chooser.js`, `view-mode.js`, and `toast-logic.js` (no `npm test` needed):

```sh
node --test test/
```

## Skill

The `herdr-publish` skill is in `.agents/skills/herdr-publish/SKILL.md`. It covers validation, sync, `RECIPE.md`/`preview.png`, and publishing to `herdr.dev/mods` with the `herdr-mod` topic.
