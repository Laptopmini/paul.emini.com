import type { Certification, GitHubActivity, Recommendation } from '@/content';
import { formatYearMonth } from './format';

// Pure helpers behind the generative UI cards. Kept free of React so they're unit-tested.

export type Contribution = GitHubActivity['contributions'][number];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toMonthIndex(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return (y ?? 0) * 12 + ((m ?? 1) - 1);
}

export function currentYearMonth(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Inclusive month count, résumé style: Jan 2020 – Jun 2026 → "6 yr 6 mo". */
export function formatDuration(start: string, end: string): string {
  const months = toMonthIndex(end) - toMonthIndex(start) + 1;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years && `${years} yr`, rest && `${rest} mo`].filter(Boolean).join(' ') || '1 mo';
}

/** "Jan 2020 – Jun 2026" or "Jan 2020 – Present". */
export function formatMonthRange(start: string, end: string | null): string {
  return `${formatYearMonth(start)} – ${end ? formatYearMonth(end) : 'Present'}`;
}

/** ISO date or datetime → "Jun 3, 2026" (UTC, so server and client agree). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "3 d ago", "2 wk ago", or a date past ~2 months. */
export function formatRelative(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} d ago`;
  if (days < 60) return `${Math.round(days / 7)} wk ago`;
  return formatDate(iso);
}

/** "Dr. Luc Julia" → "LJ" */
export function initials(name: string): string {
  const parts = name
    .replace(/^(Dr|Mr|Mrs|Ms|Prof)\.\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * The agent picks an excerpt for the question, but a recommendation is someone else's
 * words: only a verbatim passage of the body is shown. Anything else falls back to the
 * first sentence.
 */
export function pickExcerpt(recommendation: Recommendation, requested?: string): string {
  const body = squash(recommendation.body);
  const wanted = requested ? squash(requested).replace(/^[“"]|[”"]$/g, '') : '';
  if (wanted.length >= 20 && body.includes(wanted)) return wanted;
  return body.split(/(?<=[.!?])\s+/)[0] ?? body;
}

export function mailtoHref(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body }).toString().replaceAll('+', '%20');
  return `mailto:${email}?${params}`;
}

export type ContributionStatus = 'merged' | 'open' | 'closed' | 'issue';

export function contributionStatus(c: Contribution): {
  status: ContributionStatus;
  label: string;
} {
  if (c.kind === 'issue')
    return { status: 'issue', label: c.state === 'open' ? 'Issue' : 'Issue · closed' };
  if (c.state === 'merged') return { status: 'merged', label: 'PR · merged' };
  if (c.state === 'open') return { status: 'open', label: 'PR · open' };
  return { status: 'closed', label: 'PR · closed' };
}

export function contributionDetail(c: Contribution): string {
  const ref = `${c.repo} #${c.number}`;
  if (c.kind === 'issue') {
    const n = c.comments ?? 0;
    return `${ref} · ${n} comment${n === 1 ? '' : 's'}`;
  }
  if (c.state === 'open') return `${ref} · in review`;
  if (c.additions !== undefined && c.deletions !== undefined) {
    return `${ref} · +${c.additions} −${c.deletions}`;
  }
  return ref;
}

/** Newest first; the rest collapses to "+ 2 from Frontend Masters" (or "+ 3 more"). */
export function splitCertifications(items: Certification[], visible: number) {
  const sorted = [...items].sort((a, b) => b.issued.localeCompare(a.issued));
  const shown = sorted.slice(0, visible);
  const hidden = sorted.slice(visible);
  const issuers = new Set(hidden.map((c) => c.issuer));
  const summary =
    hidden.length === 0
      ? null
      : issuers.size === 1
        ? `+ ${hidden.length} from ${hidden[0]?.issuer}`
        : `+ ${hidden.length} more`;
  return { shown, hidden, summary };
}
