// Turns URLs and email addresses the agent writes into links, but only to places Paul
// controls: model text is untrusted, so an unknown domain stays plain text.

export type TextPart = string | { href: string; label: string };

const LINK =
  /([\w.+-]+@(?:[a-z0-9-]+\.)+[a-z]{2,})|((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?)/gi;
const TRAILING = /[.,;:!?)\]'"’”]+$/;

function toHref(match: string, isEmail: boolean, hosts: Set<string>, emails: Set<string>) {
  if (isEmail) return emails.has(match.toLowerCase()) ? `mailto:${match}` : null;
  try {
    const url = new URL(/^https?:\/\//i.test(match) ? match : `https://${match}`);
    return url.protocol === 'https:' && hosts.has(url.hostname.toLowerCase()) ? url.href : null;
  } catch {
    return null;
  }
}

export function linkify(
  text: string,
  { hosts, emails }: { hosts: Iterable<string>; emails: Iterable<string> },
): TextPart[] {
  const hostSet = new Set([...hosts].map((h) => h.toLowerCase()));
  const emailSet = new Set([...emails].map((e) => e.toLowerCase()));
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const label = m[0].replace(TRAILING, '');
    const href = toHref(label, Boolean(m[1]), hostSet, emailSet);
    if (!href) continue;
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ href, label });
    last = m.index + label.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
