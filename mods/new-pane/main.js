// The New pane chooser: the split-sized twin of the New tab placeholder.
//
// Created by pane-plus (or ref-menu) with:
//   pane.split { direction, mod: "new-pane",
//                props: { space, direction, folder } }
// It lists Terminal and installed agents; picking one opens it in this split
// and closes the chooser pane, so the choice takes the chooser's place.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import {
  props,
  spaces,
  panes,
  focused,
  run,
  theme,
  shared,
  setShared,
  knownAgents,
  nextCommand,
} from "herdr";
import { ownPane, openArgs, chooserAgents } from "./chooser.js";

// Shared with space-pin / new-menu-plus, so the chooser paints installed
// agents before knownAgents() answers again.
const KNOWN = "new-menu.agents";
/** How long a freshly created chooser keeps trying to take the keyboard. */
const FOCUS_WINDOW_MS = 500;

/** Where a space is now, matching space-pin's New tab screen. */
function place(space) {
  if (!space) return undefined;
  const pinned = (shared("spaces.pinned") ?? []).includes(space.id);
  if (pinned) {
    const loc = (shared("spaces.pinned_locations") ?? {})[space.id];
    if (loc) return loc;
  }
  const tabs = new Set((space.tabs ?? []).map((tab) => tab.id));
  return panes().find((pane) => tabs.has(pane.tab) && pane.cwd)?.cwd || space.folder;
}

/** The active space and tab, for locating this chooser copy. */
function activeTab() {
  const space = spaces().find((s) => s.active) ?? null;
  return { space, tab: (space?.tabs ?? []).find((tab) => tab.active) ?? null };
}

/** The chooser's starting folder: the split's folder, else the space's. */
function folderOf(value, space) {
  return value?.folder || place(space);
}

export default class NewPane extends View {
  init(_props, cx) {
    this.handle = cx.focus_handle();
    this.focusUntil = Date.now() + FOCUS_WINDOW_MS;
    this.failed = false;

    const space = spaces().find((s) => s.id === props()?.space) ?? spaces().find((s) => s.active);
    const where = space?.machine ?? "";
    this.agents = shared(KNOWN)?.[where] ?? [];
    cx.spawn(async (cx) => {
      try {
        this.agents = await knownAgents({ on: space?.machine });
        setShared(KNOWN, { ...shared(KNOWN), [where]: this.agents });
      } catch {
        this.failed = true;
      }
      cx.notify();
    });

    // focusable: true sends "focus" when pane.go lands on this copy.
    cx.spawn(async () => {
      for (;;) {
        if (await nextCommand() === "focus") this.handle?.focus();
      }
    });

    // A split was just created and normally has the keyboard; take it for a
    // short window so T / 1-9 work without a click. Hidden copies fail the
    // active-tab check, and two choosers in one tab are left alone because
    // they cannot be told apart (see ownPane).
    cx.timer.every(60, () => {
      if (Date.now() > this.focusUntil) return;
      const { tab } = activeTab();
      if (!tab) return;
      const mine = panes().filter((p) => p.tab === tab.id && p.mod === "new-pane");
      if (mine.length !== 1 || focused()?.pane !== mine[0].pane) return;
      if (this.handle?.is_focused()) { this.focusUntil = 0; return; }
      this.handle?.focus();
    });
  }

  /** This copy's pane: focused when the user clicked it, else the only chooser. */
  own() {
    const { tab } = activeTab();
    if (!tab) return null;
    return ownPane(panes().filter((p) => p.tab === tab.id), focused()?.pane);
  }

  /** Open a terminal (or agent) in this split and give it the chooser's slot. */
  launch(choice) {
    const pane = this.own();
    if (!pane) return;
    const space = spaces().find((s) => s.id === props()?.space) ?? spaces().find((s) => s.active) ?? null;
    const direction = props()?.direction === "down" ? "down" : "right";
    run("pane.focus", { pane });
    run("terminal.open", openArgs(direction, folderOf(props(), space), choice));
    run("pane.close", { pane });
  }

  /** One chooser row. */
  row(id, glyph, name, hint, action) {
    const t = theme();
    return h_flex()
      .id(id)
      .h(31)
      .px(9)
      .gap(10)
      .rounded(7)
      .items_center()
      .flex_none()
      .text_color(t.foreground)
      .cursor_pointer()
      .hover((s) => s.bg(t.selected))
      .on_click(action)
      .child(glyph)
      .child(div().flex_1().truncate().child(name))
      .child(div().text_size(11).text_color(t.dim).child(hint));
  }

  render() {
    const t = theme();
    const value = props() ?? {};
    const space = spaces().find((s) => s.id === value.space) ?? spaces().find((s) => s.active) ?? null;
    const folder = folderOf(value, space);
    const where = space?.machine ?? "";
    const agents = (this.agents && this.agents.length) ? this.agents : (shared(KNOWN)?.[where] ?? []);
    const installed = chooserAgents(agents);
    const failed = Boolean(this.failed && installed.length === 0);
    const count = 1 + installed.length + (failed ? 1 : 0);
    const menuHeight = Math.min(280, 10 + count * 31);

    return v_flex()
      .size_full()
      .bg(t.surface)
      .items_center()
      .justify_center()
      .p(16)
      .track_focus(this.handle)
      .on_mouse_down("left", () => {
        this.handle?.focus();
        const pane = this.own();
        if (pane) run("pane.focus", { pane });
      })
      .on_key_down((e) => {
        if (e.modifiers.control || e.modifiers.platform || e.modifiers.alt) return;
        // GPUI reports named keys in lowercase ("enter"); keep "Enter" too.
        if (e.key === "enter" || e.key === "Enter" || e.key === "t" || e.key === "T") {
          this.launch();
          return;
        }
        const agent = /^[1-9]$/.test(e.key) ? installed[Number(e.key) - 1] : null;
        if (agent) this.launch(agent);
      })
      .child(v_flex().items_center().gap(6).flex_none()
        .child(svg("mods/new-pane/new-pane.svg").size(30).flex_none().text_color(t.accent))
        .child(div().text_size(15).text_color(t.foreground).child("New pane"))
        .when(Boolean(space), (el) => el.child(div().text_size(12).text_color(t.muted).child(space.name)))
        .when(Boolean(folder), (el) => el.child(div().max_w(520).truncate().text_size(11).text_color(t.dim).child(folder))))
      .child(v_flex().id("new-pane-menu").mt(16).w_full().max_w(260).flex_none().h(menuHeight)
        .rounded(8).bg(t.popover).border_1().border_color(t.border).p(5).text_size(12.8)
        .when(count * 31 > 270, (el) => el.overflow_y_scrollbar())
        .child(this.row("new-pane-terminal", svg("icons/shell.svg").size(14), "Terminal", "T", () => this.launch()))
        .children(installed.map((a, i) => this.row(`new-pane-${a.key ?? i}`, a.tint ? svg(a.icon).size(14).text_color(t.foreground) : image(a.icon).size(14), a.name, i < 9 ? String(i + 1) : "", () => this.launch(a))))
        .when(failed, (el) => el.child(div().px(9).py(6).text_color(t.dim).child("Could not load agents"))));
  }
}
