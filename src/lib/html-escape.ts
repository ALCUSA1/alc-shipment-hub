/** HTML-escape a value for safe interpolation into an HTML template literal. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Short alias used inside template literals: `${e(value)}`
export const e = escapeHtml;
