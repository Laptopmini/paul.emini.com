import type { GitHubActivity } from '@/content';
import type { Contribution } from './cards';

// Values the static pages derive from /content rather than store. Pure, so they're unit-tested.

const months = (yearMonth: string) => {
  const [y, m] = yearMonth.split('-').map(Number);
  return (y ?? 0) * 12 + (m ?? 1) - 1;
};

/** Earliest role start → "10+ yrs", rounded down to a multiple of 5. */
export function experienceLabel(roles: { start: string }[], now: string): string {
  const first = roles.map((r) => r.start).sort()[0] ?? now;
  const years = Math.floor((months(now) - months(first)) / 12);
  const rounded = Math.floor(years / 5) * 5;
  return rounded >= 5 ? `${rounded}+ yrs` : `${years} yrs`;
}

/** The owners of the most contributed-to repos, most first, as display names. */
export function topOwners(
  contributions: GitHubActivity['contributions'],
  names: Record<string, string>,
  count = 3,
): string[] {
  const tally = new Map<string, number>();
  for (const c of contributions) {
    const owner = c.repo.split('/')[0] ?? c.repo;
    tally.set(owner, (tally.get(owner) ?? 0) + 1);
  }
  return [...tally]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([owner]) => names[owner] ?? owner);
}

/** "The Unified Journey: rebuilding…" → ["The Unified Journey:", "rebuilding…"]. */
export function splitTitle(title: string): [string, string | null] {
  const at = title.indexOf(': ');
  return at < 0 ? [title, null] : [title.slice(0, at + 1), title.slice(at + 2)];
}

/** Minutes to read, at 230 words a minute, never under 1. */
export function readingMinutes(texts: string[]): number {
  const words = texts.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

export type ContributionTone = 'merged' | 'open' | 'issue' | 'closed';

/** "PR · merged", "PR · open", "Issue · open", "Issue · closed", with a pill tone. */
export function contributionPill(c: Contribution): { label: string; tone: ContributionTone } {
  if (c.kind === 'issue') return { label: `Issue · ${c.state}`, tone: 'issue' };
  return { label: `PR · ${c.state}`, tone: c.state };
}

/** "**Every partner moved to it** with zero breakage…" → ["Every partner moved to it", "with zero breakage…"]. */
export function splitLead(bullet: string): [string | null, string] {
  const match = bullet.match(/^\*\*(.+?)\*\*\s*(.*)$/s);
  return match ? [match[1] ?? null, match[2] ?? ''] : [null, bullet];
}

/** "Senior … at a global scale. Expert in …" → ["Senior … at a global scale.", "Expert in …"]. */
export function splitSummary(summary: string): [string, string] {
  const at = summary.search(/\.\s/);
  return at < 0 ? [summary, ''] : [summary.slice(0, at + 1), summary.slice(at + 2).trimStart()];
}
