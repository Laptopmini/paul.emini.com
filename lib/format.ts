const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Keeps hyphenated names on one line ("Paul-Valentin" → "Paul‑Valentin"). */
export function noBreakHyphens(value: string): string {
  return value.replaceAll('-', '‑');
}

/** "2026-06" → "Jun 2026". Locale-independent so server and client render the same. */
export function formatYearMonth(value: string): string {
  const [year, month] = value.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** "2020-01".."2026-06" → "2020 – 2026"; same year → "2015"; null end → "Present". */
export function formatYearRange(start: string, end: string | null): string {
  const from = start.slice(0, 4);
  const to = end === null ? 'Present' : end.slice(0, 4);
  return from === to ? from : `${from} – ${to}`;
}

/** "https://github.com/Laptopmini" → "Laptopmini" */
export function handleFromUrl(url: string): string {
  return new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? url;
}
