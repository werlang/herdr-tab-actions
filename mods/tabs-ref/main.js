import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, terminals, run, openOverlay, closeOverlay, theme, window, shared, setShared, layout, settings, focused, nextCommand, appHome, readTextFile } from "herdr";
import { findPreviewEntry, promoteOpenTab } from "./preview.js";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// One Copy reference row per live terminal, then Rename / New tab / Close,
// plus the rules between them (the popup is fixed-size, not content-sized).
function refCount(tabId) {
  const live = terminals().filter((t) => t.state === "live");
  const seen = new Set();
  for (const t of live) if (t.labels?.["herdr.tab"] === tabId) seen.add(t.address);
  for (const p of panes()) {
    if (p.tab !== tabId || !p.terminal) continue;
    const t = live.find((x) => x.address === p.terminal || String(p.terminal).endsWith(`/${x.address}`));
    if (t) seen.add(t.address);
  }
  return seen.size;
}

/**
 * Optional mods this tab bar works with. None is required: each one only adds
 * to the tab bar, and without it the bar falls back to Herdr's own pieces.
 * - space-pin: the New tab placeholder that keeps a pinned space alive.
 * - ref-menu: the tab right-click menu with Copy reference and Pin tab
 *   (otherwise Herdr's `menu`, without pinning).
 * - new-menu-plus: the + menu (otherwise a plain new terminal tab).
 * - agent-chat: the Original / Chat toggle.
 */
const OPTIONAL_MODS = ["space-pin", "ref-menu", "new-menu-plus", "agent-chat"];
/** How often optional mods are looked for again, so installing or turning one off applies live. */
const PROBE_MS = 5000;

/**
 * Whether a mod is installed in the live mods folder. Herdr has no API for
 * that, so this reads the mod's manifest; a missing file resolves to false.
 * @param {string} name mod folder name
 * @returns {Promise<boolean>}
 */
function installed(name) {
  return readTextFile(`${appHome()}/mods/${name}/mod.json`).then((text) => typeof text === "string").catch(() => false);
}

function menuHeight(tabId) {
  const refs = refCount(tabId);
  // Rename, New tab, Close, plus Pin/Unpin for a regular tab. A placeholder tab only has New tab.
  const actions = panes().some((p) => p.tab === tabId && p.mod === "space-pin") ? 1 : 4;
  return 10 + (refs + actions) * 31 + 9 + (refs ? 9 : 0);
}

/**
 * Safely parse the stored panel state from localStorage.
 * Falls back to an empty object if missing, corrupt, or not a plain object.
 * @returns {Record<string, unknown>}
 */
function loadPanels() {
  try {
    const raw = localStorage.getItem("panels");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {}
  return {};
}

export default class Tabs extends View {
  /**
   * Initialize tab state, command listeners, optional mod probes, and periodic reordering.
   */
  init(_props, cx) {
    this.pressed = null;
    this.pressedAt = 0;
    this.panels = loadPanels();
    this.pendingZoomChat = null;
    /** @type {Record<string, boolean>} which OPTIONAL_MODS are installed */
    this.mods = {};

    // Look for the optional mods now and again later (see OPTIONAL_MODS).
    this.probeMods(cx);
    cx.timer.every(PROBE_MS, (cx) => this.probeMods(cx));

    // cmd-w is bound to tabs-ref.closeTab: a pinned tab is not closed, the
    // closest other tab is shown instead. `reorder` comes from the tab menu
    // after it toggles shared("tabs.pinned").
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "closeTab") this.closeActive();
        else if (command === "pin") this.togglePin();
        else if (command === "reorder") this.reorder();
        else if (command === "newTab" || command === "newTerminal") this.openNewTab();
        else if (/^select[1-9]$/.test(command)) this.selectNth(Number(command.slice(6)));
        cx.notify();
      }
    });
    // Tabs are created, closed and dragged outside this mod's own clicks;
    // enforce "pinned first" cheaply (a no-op when the order is already right).
    // Treat pressed state as stale if a drag ended outside the window (> 5 s).
    cx.timer.every(1000, () => {
      if (this.pressed === null || Date.now() - this.pressedAt > 5000) {
        this.pressed = null;
        this.reorder();
      }
    });
    cx.timer.after(100, () => this.reorder());
  }

  /**
   * Reads which OPTIONAL_MODS are installed and redraws when that changed.
   * @param {object} cx
   */
  probeMods(cx) {
    cx.spawn(async (cx) => {
      const found = await Promise.all(OPTIONAL_MODS.map(installed));
      const next = Object.fromEntries(OPTIONAL_MODS.map((name, i) => [name, found[i]]));
      if (OPTIONAL_MODS.some((name) => next[name] !== this.mods[name])) {
        this.mods = next;
        cx.notify();
      }
    });
  }

  /** True while the space-pin placeholder mod is installed. */
  get hasPlaceholder() { return Boolean(this.mods["space-pin"]); }
  get hasNewMenu() { return Boolean(this.mods["new-menu-plus"]); }
  get hasChat() { return Boolean(this.mods["agent-chat"]); }

  /**
   * Opens the right-click menu for one tab: ref-menu when installed, else
   * Herdr's own `menu` (same props, without Copy reference or Pin tab).
   * @param {{id: string}} tab
   * @param {{id: string}} space
   */
  openTabMenu(tab, space) {
    const props = { tab: "tab", target: { id: tab.id, space: space.id } };
    if (this.mods["ref-menu"]) openOverlay({ mod: "ref-menu", kind: "popup", width: 250, height: menuHeight(tab.id), props });
    else openOverlay({ mod: "menu", kind: "popup", width: 200, props });
  }

  /**
   * Creates the space-pin placeholder tab in a space. A no-op returning false
   * when space-pin is not installed: Herdr would open a tab that cannot render.
   * @param {{id?: string, folder?: string} | undefined} space
   * @returns {boolean} whether a placeholder was requested
   */
  newPlaceholder(space) {
    if (!this.hasPlaceholder || !space) return false;
    const loc = (shared("spaces.pinned_locations") ?? {})[space.id] || space.folder;
    run("tab.new", { space: space.id, mod: "space-pin", name: "New tab", props: { space: space.id, folder: loc } });
    return true;
  }

  /**
   * Open the new tab menu overlay if the optional new-menu-plus mod is installed.
   *
   * A popup closes itself on Esc or a click beside it, and this mod never hears
   * about that, so `shared("new-menu.open")` outlives the menu. Toggling on it
   * made the next click only clear the stale id, which is why opening the menu
   * took two clicks. Close the remembered overlay (a no-op when it is already
   * gone) and always open a fresh one, so one click is always enough.
   */
  openNewMenu() {
    if (!this.hasNewMenu) return;
    const openOverlayId = shared("new-menu.open");
    if (openOverlayId) closeOverlay(openOverlayId);
    const id = openOverlay({
      mod: "new-menu-plus",
      kind: "popup",
      width: 250,
      height: 512,
      at: this.plusPos ?? "pointer",
    });
    setShared("new-menu.open", id);
  }

  // Pinned tab ids as stored. A closed tab's id is kept: tab ids are unique and
  // never reused, so a stale id is harmless, while pruning it against a partial
  // spaces() during app startup (or an unreachable machine) would erase real
  // pins. Only unpinning removes an id.
  pinnedSet() {
    return new Set(shared("tabs.pinned") ?? []);
  }

  isPlaceholder(tabId, allPanes = panes()) {
    return allPanes.some((p) => p.tab === tabId && p.mod === "space-pin");
  }

  /**
   * The file-editor openTabs entry for a tab when it is a preview (temporary)
   * tab. The pure matching rules live in preview.js so the cross-mod contract
   * stays testable; this wrapper supplies the live pane list.
   *
   * @param {{ id: string, name: string }} tab
   * @returns {{ key: string, entry: Record<string, any> } | null}
   */
  previewEntry(tab) {
    const editorTabs = new Set(
      panes().filter((pane) => pane.mod === "file-editor").map((pane) => pane.tab)
    );
    return findPreviewEntry(shared("file-editor.openTabs"), tab, editorTabs);
  }

  /**
   * Promotes a preview tab to permanent, so opening another file no longer
   * replaces it. Returns false when the tab is not a file-editor preview.
   *
   * @param {{ id: string, name: string }} tab
   * @returns {boolean}
   */
  promotePreview(tab) {
    const found = this.previewEntry(tab);
    if (!found) return false;
    const { next, promoted } = promoteOpenTab(shared("file-editor.openTabs"), found.key, tab.id);
    if (!promoted) return false;
    setShared("file-editor.openTabs", next);
    return true;
  }

  /**
   * Pinning keeps a tab, so a pinned preview is promoted even when the pin
   * came from ref-menu (which writes shared("tabs.pinned") directly and does
   * not go through togglePin).
   *
   * @returns {boolean} whether any preview was promoted
   */
  promotePinnedPreviews() {
    const pinned = this.pinnedSet();
    if (!pinned.size) return false;
    let promoted = false;
    for (const space of spaces()) {
      for (const tab of space.tabs ?? []) {
        if (pinned.has(tab.id) && this.promotePreview(tab)) promoted = true;
      }
    }
    return promoted;
  }

  /**
   * cmd+t: select (or create) the space's New tab placeholder.
   *
   * The keyboard itself is taken by `space-pin`, which owns the focus handle:
   * it retries for a short window after it comes on screen, and again when the
   * `shared("space-pin.focus")` stamp changes (bumped here, so cmd+t on an
   * already selected placeholder that lost the keyboard gets it back). Nothing
   * here re-focuses on a loop, so modal inputs keep their focus.
   */
  openNewTab() {
    const space = spaces().find((s) => s.active);
    if (!space) return;
    const allPanes = panes();
    const holder = (space.tabs ?? []).find((t) => this.isPlaceholder(t.id, allPanes));
    if (holder) {
      run("tab.select", { id: holder.id });
      const pane = allPanes.find((p) => p.tab === holder.id);
      if (pane) run("pane.focus", { pane: pane.pane });
    } else if (!this.newPlaceholder(space)) {
      // Without space-pin there is no New tab screen: open a terminal tab, like Herdr's cmd+t.
      run("tab.new", { space: space.id });
      return;
    }
    setShared("space-pin.focus", Date.now());
  }

  /**
   * The tabs the tab bar actually shows, left to right.
   * A placeholder tab (`space-pin`) keeps a space alive or serves as the New tab
   * screen, so it is hidden while the space has other tabs, unless it is the
   * active one. Pinned regular tabs come first, matching `reorder`.
   * @param {{tabs?: Array<{id: string, active?: boolean}>}} space
   * @param {Array} allPanes panes() snapshot
   * @returns {Array} visible tabs, in display order
   */
  visibleTabs(space, allPanes = panes()) {
    const tabs = space?.tabs ?? [];
    const pinned = this.pinnedSet();
    const isHolder = (tab) => this.isPlaceholder(tab.id, allPanes);
    const shown = tabs.filter((tab) => tabs.length <= 1 || tab.active || !isHolder(tab));
    return [
      ...shown.filter((tab) => pinned.has(tab.id) && !isHolder(tab)),
      ...shown.filter((tab) => !pinned.has(tab.id) || isHolder(tab)),
    ];
  }

  /**
   * cmd+1..9 (bound to `tabs-ref.select1`..`select9`): select the Nth tab of
   * the tab bar. A number past the last visible tab is ignored (the built-in
   * `tab.select` errors there), and the hidden placeholder never counts.
   * @param {number} n 1-based position in the tab bar
   */
  selectNth(n) {
    const space = spaces().find((s) => s.active);
    const allPanes = panes();
    const tab = this.visibleTabs(space, allPanes)[n - 1];
    if (!tab || tab.active) return;
    run("tab.select", { id: tab.id });
    const pane = allPanes.find((p) => p.tab === tab.id);
    if (pane) run("pane.focus", { pane: pane.pane });
  }

  // Pinned regular tabs first, then unpinned regular tabs, then the pinned-
  // space placeholder (hidden whenever regular tabs exist). Only moved tabs
  // are touched, so dragging inside the pinned or unpinned block keeps order.
  reorder() {
    // Pin is a "keep" action: promote a preview pinned from ref-menu before
    // sorting, so the next preview open cannot replace it.
    this.promotePinnedPreviews();
    const space = spaces().find((s) => s.active);
    const tabs = space?.tabs ?? [];
    if (!tabs.length) return;
    const allPanes = panes(), pinned = this.pinnedSet();
    const isHolder = (t) => this.isPlaceholder(t.id, allPanes);
    const holders = tabs.filter(isHolder);
    const regular = tabs.filter((t) => !isHolder(t));
    const isPinnedSpace = space && (shared("spaces.pinned") ?? []).includes(space.id);
    if (isPinnedSpace && !regular.length && !holders.length && !this.pendingPin) {
      this.pendingPin = this.newPlaceholder(space);
    }
    if (holders.length) this.pendingPin = false;
    const desired = [
      ...regular.filter((t) => pinned.has(t.id)),
      ...regular.filter((t) => !pinned.has(t.id)),
      ...holders,
    ];
    if (desired.every((t, i) => tabs[i]?.id === t.id)) return;
    // Move each tab to its final 1-based position; already-settled positions
    // stay put, so repeated runs converge instead of shuffling.
    desired.forEach((tab, i) => { if (tabs[i]?.id !== tab.id) run("tab.move", { id: tab.id, index: i + 1 }); });
  }

  // Toggle the active tab's pin state (also usable from a key or `herdr-app do`).
  // The right-click menu toggles the tab it was opened on instead.
  togglePin() {
    const space = spaces().find((s) => s.active);
    const tab = (space?.tabs ?? []).find((t) => t.active);
    if (!tab || this.isPlaceholder(tab.id)) return;
    const pinned = this.pinnedSet();
    if (pinned.has(tab.id)) {
      pinned.delete(tab.id);
    } else {
      // Pinning means "keep": a preview tab must not be replaced later.
      this.promotePreview(tab);
      pinned.add(tab.id);
    }
    setShared("tabs.pinned", [...pinned]);
    this.reorder();
  }

  /**
   * Close a tab safely: placeholder tabs are never closed, and if closing
   * the last regular tab in a pinned space, the placeholder tab is ensured first.
   */
  closeTab(tabId, space = spaces().find((s) => s.active), allPanes = panes()) {
    const tabs = space?.tabs ?? [];
    const isHolder = this.isPlaceholder(tabId, allPanes);
    const regular = tabs.filter((t) => !this.isPlaceholder(t.id, allPanes));

    if (isHolder) {
      if (regular.length) {
        run("tab.close", { id: tabId });
      }
      return;
    }

    // Closing the last regular tab leaves the placeholder behind (when space-pin
    // is installed); without it the space closes with its last tab, as in Herdr.
    if (regular.length <= 1) this.newPlaceholder(space);
    run("tab.close", { id: tabId });
  }

  // cmd-w on a pinned tab: show the closest other tab instead of closing it.
  // The pinned-space placeholder is never closed.
  closeActive() {
    const space = spaces().find((s) => s.active);
    const tab = (space?.tabs ?? []).find((t) => t.active);
    if (!tab) return;
    const allPanes = panes();
    if (this.isPlaceholder(tab.id, allPanes)) { this.closeTab(tab.id, space, allPanes); return; }
    if (!this.pinnedSet().has(tab.id)) { this.closeTab(tab.id, space, allPanes); return; }
    const tabs = space.tabs ?? [];
    const index = tabs.findIndex((t) => t.id === tab.id);
    let others = tabs.filter((t) => t.id !== tab.id && !this.isPlaceholder(t.id, allPanes));
    if (!others.length) others = tabs.filter((t) => t.id !== tab.id);
    if (!others.length) return;
    // Nearest by position; a tie goes to the tab on the right.
    const nearest = others
      .map((t) => ({ tab: t, at: tabs.indexOf(t), distance: Math.abs(tabs.indexOf(t) - index) }))
      .sort((a, b) => a.distance - b.distance || b.at - a.at)[0].tab;
    run("tab.select", { id: nearest.id });
  }

  // The side panel is remembered per space: switching shows that space's choice
  // (closed if it never had one), and opening or closing it records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    // Until the restore lands (or something else won), the old state isn't a choice.
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  /**
   * Render the tab bar, including tabs, optional + overlay / new tab, optional chat toggle, and panel shortcuts.
   */
  render() {
    const t = theme();
    const space = spaces().find(p => p.active);
    const tabs = space?.tabs ?? [];
    const allPanes = panes();
    const pinned = this.pinnedSet();
    // The placeholder tab is hidden while the space has other tabs (see visibleTabs).
    const isHolder = (tab) => allPanes.some((pane) => pane.tab === tab.id && pane.mod === "space-pin");
    // The model order is kept pinned-first by `reorder`; sorting here too means
    // the very first frame after a switch already reads correctly.
    const ordered = this.visibleTabs(space, allPanes);
    const stop = (_e, cx) => cx.stop_propagation();
    const button = (id, label, action) => div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", stop).on_click(action).child(label);
    const item = (c, i) => {
      const program = allPanes.find(p => p.tab === c.id && p.program?.agent)?.program ?? allPanes.find(p => p.tab === c.id)?.program;
      const name = this.isPlaceholder(c.id, allPanes) ? "New tab" : (/^tb\d+$/.test(c.name) ? program?.name ?? "Terminal" : c.name);
      const isChatZoomed = c.zoomed && allPanes.some(p => p.tab === c.id && p.mod === "agent-chat" && p.zoomed);
      const tabTitle = c.zoomed && !isChatZoomed ? `${name} Z` : name;
      const preview = Boolean(this.previewEntry(c));
      return h_flex().id(`tab-${c.id}`).h(29).px(10).gap(7).rounded(7).items_center().flex_none().text_size(12.8)
        .border(1).border_color(c.active ? t.border : t.chrome).bg(c.active ? t.raised : t.chrome).text_color(c.active ? t.foreground : t.muted)
        .hover(s => s.bg(t.hover))
        .on_mouse_down("left", (e, cx) => {
          cx.stop_propagation();
          this.pressed = i;
          this.pressedAt = Date.now();
          if (e.click_count === 2) {
            // A preview tab becomes permanent; permanent tabs keep the old
            // double-click-to-rename behavior.
            if (this.promotePreview(c)) cx.notify();
            else run("tab.rename", { id: c.id });
          }
        })
        .on_mouse_up("left", (_e, cx) => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) {
            run("tab.move", { id: ordered[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
            // Let the move land, then put pinned tabs back in front if the drop
            // crossed the block boundary.
            cx.timer.after(60, (cx) => { this.reorder(); cx.notify(); });
          } else {
            run("tab.select", { id: c.id });
            const pane = allPanes.find((p) => p.tab === c.id);
            if (pane) run("pane.focus", { pane: pane.pane });
          }
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.openTabMenu(c, space); })
        .when(Boolean(program?.icon), el => el.child(program.tint ? svg(program.icon).size(14).text_color(t.muted) : image(program.icon).size(14)))
        .when(!program?.icon && this.isPlaceholder(c.id, allPanes), el => el.child(svg("mods/tabs-ref/new-tab.svg").size(13).text_color(t.muted)))
        .child(
          div()
            .max_w(170)
            .truncate()
            .when(preview, (el) => el.italic())
            .when(preview, (el) => el.text_color(t.dim))
            .when(preview, (el) => el.tooltip("Preview tab — double-click to keep it open"))
            .child(tabTitle)
        )
        .when(preview, (el) =>
          el.child(
            div()
              .size(5)
              .rounded_full()
              .border_1()
              .border_color(t.dim)
              .flex_none()
              .tooltip("Preview tab — double-click to keep it open")
          )
        )
        .when(pinned.has(c.id) && !isHolder(c), el => el.child(svg("mods/tabs-ref/pin.svg").size(11).flex_none().text_color(t.accent)))
        .when(c.status === "working", el => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
        .when(c.status === "blocked" || c.status === "done", el => el.child(div().size(6).rounded(3).bg(t[c.status])))
        .when(c.active && (!isHolder(c) || tabs.some((t) => !isHolder(t))), el => el.child(div().id(`close-${c.id}`).text_color(t.dim).on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); this.closeTab(c.id, space, allPanes); }).child(svg("mods/pane/close.svg").size(12))));
    };
    const root = layout(), sidebar = find(root, "sidebar"), w = window();
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(10, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 10;
    const panel = find(root, "panel"), body = find(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const panelButton = (id, label, icon) => {
      const on = panel && !panel.hidden && body?.active === id;
      return h_flex().id(`panel-${id}`).h(26).px(8).gap(5).flex_none().items_center().rounded(6)
        .text_size(12).bg(on ? t.selected : t.chrome).text_color(on ? t.foreground : t.muted)
        .hover(s => s.bg(t.hover)).on_mouse_down("left", stop)
        .on_click(() => {
          if (on) run("layout.hide", { id: "panel" });
          else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
        }).child(svg(icon).size(14)).child(label);
    };

    const chatToggle = () => {
      const activeTabId = space?.tabs?.find((x) => x.active)?.id;
      const tabPanes = panes().filter((p) => p.tab === activeTabId);
      const chatPane = tabPanes.find((p) => p.mod === "agent-chat");
      const terminalPane = tabPanes.find((p) => p.terminal);
      const isChat = Boolean(chatPane && (chatPane.zoomed || !terminalPane));

      // Auto-zoom chatPane right after initial creation once Herdr registers it
      if (this.pendingZoomChat) {
        if (this.pendingZoomChat.tab === activeTabId && Date.now() < this.pendingZoomChat.until) {
          if (chatPane) {
            this.pendingZoomChat = null;
            if (!chatPane.zoomed) {
              run("pane.zoom", { pane: chatPane.pane });
            }
          }
        } else {
          this.pendingZoomChat = null;
        }
      }

      const showChat = () => {
        if (!chatPane) {
          if (activeTabId) {
            this.pendingZoomChat = { tab: activeTabId, until: Date.now() + 3000 };
          }
          const activeTerminal = terminalPane?.terminal || focused()?.terminal || null;
          run("pane.split", {
            direction: "right",
            mod: "agent-chat",
            props: activeTerminal ? { terminal: activeTerminal } : undefined,
          });
        } else if (!chatPane.zoomed) {
          run("pane.zoom", { pane: chatPane.pane });
        }
      };

      const showOriginal = () => {
        if (terminalPane) {
          if (!terminalPane.zoomed) {
            run("pane.zoom", { pane: terminalPane.pane });
          }
        } else {
          run("terminal.open", { place: "right" });
        }
      };

      return h_flex()
        .id("view-mode-toggle-bar")
        .h(26)
        .p(2)
        .gap(2)
        .flex_none()
        .items_center()
        .rounded(6)
        .bg(t.raised || t.chrome)
        .border_1()
        .border_color(t.border)
        .on_mouse_down("left", stop)
        .child(
          h_flex()
            .id("toggle-original-view")
            .h(20)
            .px(6)
            .gap(4)
            .items_center()
            .rounded(4)
            .when(!isChat, (el) => el.bg(t.selected || t.raised).border_1().border_color(t.border))
            .cursor_pointer()
            .hover((s) => (!isChat ? s : s.bg(t.hover)))
            .on_click(showOriginal)
            .child(svg("mods/tabs-ref/terminal.svg").size(12).text_color(!isChat ? t.accent : t.muted))
            .child(
              div()
                .text_size(11)
                .font_medium()
                .text_color(!isChat ? t.foreground : t.muted)
                .child("Original")
            )
        )
        .child(
          h_flex()
            .id("toggle-chat-view")
            .h(20)
            .px(6)
            .gap(4)
            .items_center()
            .rounded(4)
            .when(isChat, (el) => el.bg(t.selected || t.raised).border_1().border_color(t.border))
            .cursor_pointer()
            .hover((s) => (isChat ? s : s.bg(t.hover)))
            .on_click(() => {
              if (isChat) showOriginal();
              else showChat();
            })
            .child(svg("mods/tabs-ref/chat.svg").size(12).text_color(isChat ? t.accent : t.muted))
            .child(
              div()
                .text_size(11)
                .font_medium()
                .text_color(isChat ? t.foreground : t.muted)
                .child("Chat")
            )
        );
    };

    return h_flex().size_full().min_w(0).px(10).pl(lightsPadding).gap(3).items_center().bg(t.chrome).border_b(1).border_color(t.border)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      // The + rides at the end of the tab strip, next to the last tab. It
      // scrolls with the tabs instead of sitting by the panel buttons.
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().gap(3).overflow_x_scrollbar()
        .children(ordered.map(item))
        .child(button("tab-new", "+", () => {
          if (this.hasNewMenu) this.openNewMenu();
          else run("tab.new", { space: space?.id });
        }).on_mouse_move(e => { if (e.position) this.plusPos = { x: Math.round(e.position.x - 13), y: 40 }; })))
      .when(this.hasChat, el => el.child(chatToggle()))
      .when(enabled.includes("files"), el => el.child(panelButton("files", "Files", "mods/files/file.svg")))
      .when(enabled.includes("changes"), el => el.child(panelButton("changes", "Changes", "mods/changes/changes.svg")))
      .when(w?.buttons, el => el.child(button("minimize", w.platform === "windows" ? svg("mods/tabs-ref/win-min.svg").size(16) : "−", () => run("window.minimize")))
        .child(button("maximize", w.platform === "windows" ? svg(`mods/tabs-ref/${w.maximized ? "win-restore" : "win-max"}.svg`).size(16) : "□", () => run("window.maximize")))
        .child(button("close-window", w.platform === "windows" ? svg("mods/tabs-ref/win-close.svg").size(16) : svg("mods/pane/close.svg").size(13), () => run("window.close"))));
  }
}
