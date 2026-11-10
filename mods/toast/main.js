// How notifications look. Anything can post one with notify({ title, body,
// level, icon, action }). Clicking the toast opens a modal dialog
// showing the full message, clipboard copy, and optional action.

import { View, div, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { props, closeOverlay, openOverlay, run, theme } from "herdr";
import { DOT, copyableText, buildModalOverlay, splitLines } from "./toast-logic.js";

export default class Toast extends View {
  init(_props, cx) {
    this.copied = false;
    this.handle = cx.focus_handle();
    if (props()?.modal) {
      this.handle.focus();
    }
  }

  render(cx) {
    const t = theme();
    const p = props() ?? {};
    if (p.modal) {
      return this.renderModal(cx, t, p);
    }
    return this.renderToast(cx, t, p);
  }

  renderToast(cx, t, p) {
    return h_flex()
      .id("toast")
      .size_full()
      .px(18)
      .gap(12)
      .items_center()
      .bg(t.popover)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click(() => {
        if (p.overlay) closeOverlay(p.overlay);
        openOverlay(buildModalOverlay(p));
      })
      .child(
        p.icon
          ? image(p.icon).w(18).h(18).flex_none()
          : div().size(8).rounded(4).flex_none().bg(t[DOT[p.level] ?? "accent"]),
      )
      .child(
        v_flex()
          .flex_1()
          .overflow_hidden()
          .child(
            div()
              .truncate()
              .font_semibold()
              .text_size(13)
              .text_color(t.foreground)
              .child(p.title ?? ""),
          )
          .when(Boolean(p.body), (el) =>
            el.child(
              div()
                .truncate()
                .text_size(12)
                .text_color(t.muted)
                .child(p.body ?? ""),
            ),
          ),
      );
  }

  renderModal(cx, t, p) {
    const copyText = copyableText(p.title, p.body);
    const hasBody = Boolean(p.body && p.body.trim());
    const dotColor = t[DOT[p.level] ?? "accent"];
    const content = hasBody ? p.body : (p.title ?? "");
    const lines = splitLines(content);

    const button = (id, label, primary, onClick) =>
      h_flex()
        .id(id)
        .h(30)
        .px(12)
        .items_center()
        .rounded(6)
        .border_1()
        .border_color(primary ? t.solid : t.input)
        .bg(primary ? t.solid : t.raised)
        .text_color(primary ? t.solid_foreground : t.foreground)
        .text_size(12)
        .font_medium()
        .cursor_pointer()
        .hover((s) => s.opacity(0.88))
        .on_click(onClick)
        .child(label);

    return v_flex()
      .id("toast-modal")
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "escape") {
          if (p.overlay) closeOverlay(p.overlay);
          cx.stop_propagation();
        }
      })
      .size_full()
      .min_h(0)
      .p(18)
      .gap(12)
      .rounded(8)
      .bg(t.popover)
      .text_color(t.foreground)
      .text_size(13)
      .child(
        h_flex()
          .items_center()
          .gap(10)
          .child(
            p.icon
              ? image(p.icon).w(18).h(18).flex_none()
              : div().size(10).rounded(5).flex_none().bg(dotColor),
          )
          .child(
            div()
              .flex_1()
              .text_size(14)
              .font_semibold()
              .text_color(t.foreground)
              .child(p.title ?? "Notification"),
          )
          .child(div().text_size(11).text_color(t.dim).child("Esc")),
      )
      .child(
        v_flex()
          .flex_1()
          .min_h(80)
          .max_h(360)
          .rounded(6)
          .p(12)
          .border_1()
          .border_color(t.input)
          .bg(t.background)
          .overflow_y_scrollbar()
          .children(
            lines.length > 0
              ? lines.map((line) =>
                  div()
                    .text_size(12.5)
                    .line_height(1.4)
                    .text_color(hasBody ? t.foreground : t.muted)
                    .child(line === "" ? " " : line),
                )
              : [div().text_size(12.5).line_height(1.4).child(content)],
          ),
      )
      .child(
        h_flex()
          .items_center()
          .justify_between()
          .pt(4)
          .child(
            button("toast-modal-copy", this.copied ? "Copied!" : "Copy message", false, (_e, cx) => {
              if (copyText) {
                cx.write_to_clipboard(copyText);
                this.copied = true;
                cx.notify();
                cx.timer.after(2000, () => {
                  this.copied = false;
                  cx.notify();
                });
              }
            }),
          )
          .child(
            h_flex()
              .items_center()
              .gap(8)
              .when(Boolean(p.action?.name), (el) =>
                el.child(
                  button("toast-modal-action", "Run action", true, () => {
                    if (p.overlay) closeOverlay(p.overlay);
                    run(p.action.name, p.action.args ?? {});
                  }),
                ),
              )
              .child(
                button("toast-modal-close", "Close", !p.action?.name, () => {
                  if (p.overlay) closeOverlay(p.overlay);
                }),
              ),
          ),
      );
  }
}
