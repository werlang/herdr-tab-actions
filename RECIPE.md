# Tab & Pane Actions

Right-click a **tab** for **Pin tab** and **Copy reference**, right-click a
**terminal pane** for **Copy reference** and split/zoom/close, and use the
**pane header** to split, move/reorder, zoom and close a pane. A split opens the
**New pane** chooser with Terminal and the installed agents.

![Tab & Pane Actions](preview.png)

## What you see

Right-clicking a tab opens a context menu with:

- One **Copy reference · <app>** row per live terminal in the tab.
- **Pin tab** / **Unpin tab** — pinned tabs show a pin icon and stay first among regular tabs.
- **Preview tabs** — file-editor preview tabs are italic in the tab bar; double-click or **Pin tab** promotes them to permanent.
- **Rename**
- **New tab**
- separator
- **Close**

Right-clicking a terminal pane opens the same menu rooted on that pane's
terminal and pane actions (split, zoom, park, close).

Hovering a pane shows the **pane header**: program and folder, then Split right,
Split down, Move, Zoom and Close. Move opens a menu with left/right/up/down.

A split opens the **New pane** chooser instead of a bare terminal when that mod
is installed. It mirrors the New tab screen: **Terminal** (`T` or Enter) and the
installed agents (`1`–`9`). The choice opens in the split and takes the
chooser's place.

## How it behaves

- **Pin tab** stores the tab id in `shared("tabs.pinned")` and moves the tab to the front of regular tabs.
- `tabs-ref` reorders the model using `tab.move`, so pinned tabs stay first after dragging, opening new tabs, or restarting.
- `cmd-1`..`cmd-9` bound to `tabs-ref.select1`..`select9`: selects the Nth tab the bar shows; the hidden placeholder is skipped and out-of-range numbers do nothing (no error).
- `cmd-t` bound to `tabs-ref.newTab`: opens or selects the **New tab** (`space-pin`) placeholder instead of starting a terminal directly.
- `cmd+w` bound to `tabs-ref.closeTab`: on a pinned tab it does not close; it selects the closest available tab (ties break to the right). On unpinned tabs it calls `tab.close`.
- **Copy reference** writes the terminal's `hc` address and full tab/space/folder metadata to the system clipboard.
- **Split right/down** calls `pane.split`; with `new-pane` installed it creates the chooser pane with the split direction and starting folder.
- **Move** calls `pane.swap` with the chosen direction. Dragging the app's top-center grip and `cmd-alt-shift-arrows` do the same without the menu.
- Supports macOS, Linux (`wl-copy`/`xclip`), and Windows.
- On a TUI application that captures the mouse, **Shift+right-click** opens the pane menu.
- While a space has other tabs, `tabs-ref` hides placeholder tabs (such as `space-pin`); it reveals them when selected or when all other tabs close.
- The `+` sits after the last visible tab and opens `new-menu-plus` in one click; without that mod it opens a terminal tab directly.

## Built from

- `mods/tabs-ref/` — clone of the shipped `tabs`; opens `ref-menu` on right-click, renders the pin icon, reorders pinned tabs, and answers `tabs-ref.closeTab` / `tabs-ref.pin`.
- `mods/ref-menu/` — clone of the shipped `menu`; adds the `ref.copy` item (clipboard writer per platform) and the Pin/Unpin tab item. With `new-pane` installed, its split items open the chooser. `ref.js` builds the reference line without importing `herdr`, keeping it testable in plain Node.
- `mods/pane-plus/` — clone of the shipped `pane` header; adds split, move/reorder, zoom and close, and opens `new-pane` when it is installed. `pane.js` holds the split/menu rules and is testable in plain Node.
- `mods/new-pane/` — the **New pane** chooser (Terminal + installed agents); `chooser.js` holds the pane matching and launch arguments and is testable in plain Node.
- `shared("tabs.pinned")` — app-wide pinned tab ids.
- `shared("new-menu.agents")` — the last agents each machine reported, shared with `space-pin` / `new-menu-plus`.
- Layout wiring points `tabs` at `tabs-ref`, root `terminal_menu` at `ref-menu`, and the pane frame header at `pane-plus` (with `"lone": true`).

## Watch out

- **Each mod works alone.** They are meant to be used together, but none needs another:
  - `tabs-ref` without `ref-menu`: tab right-click opens Herdr's own `menu` (no Copy reference, no Pin tab; pins already set stay in front and keep their `cmd+w` protection).
  - `ref-menu` without `tabs-ref`: Copy reference still works from tabs and panes; **Pin tab** is shown only while `tabs-ref` is in the layout.
  - `pane-plus` without `new-pane`: split buttons start terminals directly.
  - `new-pane` without `pane-plus`: it only appears when something opens it with `pane.split {mod: "new-pane"}`.
- Optional mods from other repos are looked for in the live `mods/` folder every few seconds, so installing or turning one off applies live:
  - `space-pin` (`herdr-space-actions`): the hidden New tab placeholder. Without it, `cmd+t` opens a terminal tab and closing the last tab closes the space, as in Herdr.
  - `new-menu-plus` (`herdr-space-actions`): the `+` menu. Without it, `+` opens a terminal tab.
  - `agent-chat` (`herdr-agent-chat`): the Original / Chat toggle. Without it, the toggle is hidden.
- Every icon a mod draws comes from its own folder (`new-tab.svg`, `pin.svg`, `terminal.svg`, `chat.svg`, `split-right.svg`, `split-down.svg`, `move.svg`, `zoom.svg`, `close.svg`, `new-pane.svg`) or a shipped Herdr mod; it reads no other custom mod's files.
- `cmd+w` must point at `tabs-ref.closeTab` (not `tab.close`) for pinned tabs to protect themselves.
- `pane-plus` needs `"lone": true` in the pane frame, otherwise a tab's only pane (the first split target) has no header.
- Linux **Copy reference** needs `wl-copy` or `xclip`.
- Do not rename `tabs-ref`, `ref-menu`, `pane-plus` or `new-pane`: asset paths, `openOverlay` calls and the `new-pane` split request use those folder names.

## Done when

- `herdr-app check` passes for `tabs-ref`, `ref-menu`, `pane-plus` and `new-pane`.
- Right-clicking a tab shows Pin/Unpin and Copy reference.
- Pinned tabs show a pin icon and move to the front.
- `cmd+w` on a pinned tab selects the closest tab instead of closing.
- Copy reference places the correct `hc` address on the clipboard.
- The pane header shows split/move/zoom/close on hover.
- A split opens the **New pane** chooser; Terminal and agents open in that split.
- Move reorders a pane with its neighbor.
- `herdr-app status` reports no errors.
