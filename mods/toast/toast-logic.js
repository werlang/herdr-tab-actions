// Logic and data formatting for toast notifications and modal dialogs.
// Kept free of GPUI or herdr imports so it can be tested in standard Node.

export const DOT = {
  error: "blocked",
  warning: "working",
  success: "done",
  info: "accent",
};

/**
 * Normalizes copyable text for clipboard export.
 * If body is distinct from title, copies "Title\n\nBody".
 * Otherwise copies the non-empty text.
 */
export function copyableText(title, body) {
  const t = (title ?? "").trim();
  const b = (body ?? "").trim();
  if (t && b && t !== b) {
    return `${t}\n\n${b}`;
  }
  return b || t || "";
}

/**
 * Returns a human-friendly label for a notification level.
 */
export function levelLabel(level) {
  switch (level) {
    case "error":
      return "Error";
    case "warning":
      return "Warning";
    case "success":
      return "Success";
    case "info":
      return "Info";
    default:
      return "Notification";
  }
}

/**
 * Prepares the overlay specification to display the toast in a modal dialog.
 */
export function buildModalOverlay(p = {}) {
  return {
    mod: "toast",
    kind: "dialog",
    width: 520,
    props: {
      modal: true,
      title: p.title ?? "",
      body: p.body ?? "",
      level: p.level ?? "info",
      icon: p.icon ?? null,
      action: p.action ?? null,
    },
  };
}

/**
 * Splits text into individual lines for clean multiline rendering.
 */
export function splitLines(text) {
  if (typeof text !== "string" || !text) return [];
  return text.split(/\r?\n/);
}
