/** Keeps hyphenated names on one line ("Paul-Valentin" → "Paul‑Valentin"). */
export function noBreakHyphens(value: string): string {
  return value.replaceAll('-', '‑');
}
