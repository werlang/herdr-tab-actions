// Pane header with split, move/reorder, zoom and close actions.
//
// Mounted by a layout pane frame:
//   { "pane": { "header": { "content": { "mod": "pane-plus" } },
//               "lone": true } }
// It also opens itself as a popup (props { menu: pane }) for the move menu.
//
// A split opens `new-pane` when that mod is installed, so the new pane starts
// with the same Terminal/agent chooser as the New tab placeholder; without it,
// the split opens a terminal directly like Herdr's shipped pane header.

import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import {
  panes,
  spaces,
  focused,
  props,
  run,
  theme,
  home,
  appHome,
  readTextFile,
  openOverlay,
  closeOverlay,
  nextCommand,
} from "herdr";
import { splitRequest, menuRows, actions, isModPane } from "./pane.js";

/** How often an installed `new-pane` is looked for again. */
const PROBE_MS = 15000;

/**
 * A program icon: tinted SVG or a full-colour image, like Herdr's own header.
 * @param {{icon?: string, tint?: boolean} | undefined} program
 * @param {number} size
 * @param {string} color
 */
function icon(program, size, color) {
  if (!program?.icon) return null;
  return program.tint ? svg(program.icon).size(size).flex_none().text_color(color) : image(program.icon).w(size).h(size).flex_none();
}

/** A path relative to the home folder, as the header shows it. */
function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

/**
 * Whether a mod is installed in the live mods folder. Herdr has no API for
 * that, so read the manifest; a missing file resolves to false.
 * @param {string} name mod folder name
 * @returns {Promise<boolean>}
 */
function installed(name) {
  return readTextFile(`${appHome()}/mods/${name}/mod.json`)
    .then((text) => typeof text === "string")
    .catch(() => false);
}

/** The icon for one pane actions menu row. */
function menuGlyph(action) {
  if (action === "split-right") return "mods/pane-plus/split-right.svg";
  if (action === "split-down") return "mods/pane-plus/split-down.svg";
  if (action === "left" || action === "right" || action === "up" || action === "down") return "mods/pane-plus/move.svg";
  if (action === "zoom") return "mods/pane-plus/zoom.svg";
  return "mods/pane-plus/close.svg";
}

export default class PanePlus extends View {
  init(_props, cx) {
    // Popup mode: the pane actions menu. It needs only a focus handle.
    if (props()?.menu) {
      this.at = 0;
      this.handle = cx.focus_handle();
      this.handle.focus();
      return;
    }

    this.hovered = false;
    this.withChooser = false;
    this.probe(cx);
    cx.timer.every(PROBE_MS, (cx) => this.probe(cx));

    // Optional key commands. A header copy exists per pane, so only the copy
    // whose pane is focused acts; bind e.g. "cmd-d": "pane-plus.splitRight".
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        const mine = this.me();
        if (!mine || focused()?.pane !== mine.pane) continue;
        if (command === "splitRight") this.split(mine, "right");
        else if (command === "splitDown") this.split(mine, "down");
        else if (command === "menu") this.openMenu(mine);
        cx.notify();
      }
    });
  }

  /** Re-check the optional chooser, so installing it applies without a restart. */
  probe(cx) {
    cx.spawn(async (cx) => {
      const found = await installed("new-pane");
      if (found !== this.withChooser) {
        this.withChooser = found;
        cx.notify();
      }
    });
  }

  /** The pane this header copy belongs to. */
  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  /** The space that owns a pane, for the chooser's space/folder props. */
  spaceOf(p) {
    return spaces().find((s) => (s.tabs ?? []).some((t) => t.id === p?.tab)) ?? null;
  }

  /** Split this pane, opening the New pane chooser when it is installed. */
  split(p, direction) {
    if (!p) return;
    const space = this.spaceOf(p);
    run("pane.split", splitRequest(direction, p.pane, space?.id, p.cwd, this.withChooser));
  }

  /** Open the move/actions popup anchored on the header button. */
  openMenu(p) {
    const space = this.spaceOf(p);
    openOverlay({
      mod: "pane-plus",
      kind: "popup",
      width: 210,
      height: 300,
      props: {
        menu: p.pane,
        space: space?.id,
        folder: p.cwd,
        withChooser: this.withChooser,
      },
    });
  }

  /** One small header button. */
  button(t, id, glyph, label, action) {
    return div()
      .id(id)
      .p(3)
      .rounded(4)
      .text_color(t.dim)
      .tooltip(label)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        action();
      })
      .child(glyph);
  }

  render(cx) {
    if (props()?.menu) return this.renderMenu(cx);

    const t = theme();
    const p = this.me();
    if (!p) return div();
    // A chooser pane has no program: name it like its own screen.
    const chooser = p.mod === "new-pane";
    const name = chooser
      ? "New pane"
      : ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pic = chooser
      ? svg("mods/pane-plus/new-pane.svg").size(14).flex_none().text_color(t.dim)
      : icon(p.program, 14, t.dim);
    const st = p.status;
    const pane = p.pane;

    if (isModPane(p)) {
      // In a full mod pane (e.g. git-graph, file-editor), the mod owns its own header
      // and controls. Returning an empty container ensures that header clicks and hover
      // states pass directly to the mod without occlusion by the pane overlay.
      return div();
    }

    return h_flex()
      .id(`pane-plus-head-${pane}`)
      .size_full()
      .px(10)
      .gap(8)
      .items_center()
      .bg(t.background)
      .border_b(1)
      .border_color(t.border)
      .text_size(12)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(pic), (el) => el.child(pic))
      .child(div().flex_none().truncate().max_w(260).font_medium().text_color(t.foreground).child(name))
      .child(div().flex_1().truncate().text_color(t.dim).child(folder(p.cwd)))
      .when(st === "working", (el) => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
      .when(st === "blocked", (el) => el.child(div().flex_none().px(6).h(18).flex().items_center().rounded(5).bg(t.blocked + "26").text_size(10.5).font_semibold().text_color(t.blocked).child("Needs you")))
      .when(st === "done", (el) => el.child(div().size(7).flex_none().rounded(4).bg(t.done)))
      .when(this.hovered, (el) => el
        .child(this.button(t, `ph-r-${pane}`, svg("mods/pane-plus/split-right.svg").size(14), "Split right", () => this.split(p, "right")))
        .child(this.button(t, `ph-d-${pane}`, svg("mods/pane-plus/split-down.svg").size(14), "Split down", () => this.split(p, "down")))
        .when(p.movable, (row) => row.child(this.button(t, `ph-m-${pane}`, svg("mods/pane-plus/move.svg").size(14), "Move pane", () => this.openMenu(p))))
        .child(this.button(t, `ph-z-${pane}`, svg(p.zoomed ? "mods/pane-plus/unzoom.svg" : "mods/pane-plus/zoom.svg").size(14), p.zoomed ? "Unzoom" : "Zoom", () => run("pane.zoom", { pane })))
        .child(this.button(t, `ph-x-${pane}`, svg("mods/pane-plus/close.svg").size(14), "Close pane", () => run("pane.close", { pane }))));
  }

  /** Run one actions-menu choice and close the popup. */
  choose(action, cx) {
    const pane = props()?.menu;
    closeOverlay(props()?.overlay);
    if (action === "split-right" || action === "split-down") {
      const p = panes().find((candidate) => candidate.pane === pane);
      if (p) {
        const space = spaces().find((s) => s.id === props()?.space) ?? this.spaceOf(p);
        run("pane.split", splitRequest(action === "split-right" ? "right" : "down", pane, space?.id, props()?.folder || p.cwd, Boolean(props()?.withChooser)));
      }
      return;
    }
    if (action === "zoom") { run("pane.zoom", { pane }); return; }
    if (action === "close") { run("pane.close", { pane }); return; }
    run("pane.swap", { pane, direction: action });
  }

  renderMenu(cx) {
    const t = theme();
    const rows = menuRows();
    const list = actions(rows);
    this.at = Math.max(0, Math.min(this.at ?? 0, list.length - 1));
    let actionIndex = -1;
    return v_flex()
      .id("pane-plus-menu")
      .track_focus(this.handle)
      .w_full()
      .min_h(0)
      .p(5)
      .bg(t.popover)
      .text_size(12.8)
      .on_key_down((e, cx) => {
        if (e.key === "down") this.at = (this.at + 1) % list.length;
        else if (e.key === "up") this.at = (this.at + list.length - 1) % list.length;
        else if (e.key === "enter") this.choose(list[this.at][1], cx);
        else if (e.key === "escape") closeOverlay(props().overlay);
        else return;
        cx.notify();
      })
      .children(rows.map((row) => {
        if (row.sep) return div().mx(7).my(4).h(1).bg(t.border);
        actionIndex += 1;
        const i = actionIndex;
        return h_flex()
          .id(`pane-plus-mi-${i}`)
          .h(31)
          .px(8)
          .gap(9)
          .rounded(7)
          .items_center()
          .text_color(t.foreground)
          .when(i === this.at, (el) => el.bg(t.selected))
          .hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => this.choose(row[1], cx))
          .child(svg(menuGlyph(row[1])).size(14).flex_none().text_color(t.muted))
          .child(div().flex_1().child(row[0]));
      }));
  }
}
