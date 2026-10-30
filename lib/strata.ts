import type { Experience, Project } from '@/content';
import { type Contribution, formatDate } from './cards';
import { formatYearMonth, formatYearRange } from './format';
import { type ContributionTone, contributionPill } from './resume';

/** The "Latest on GitHub" row only shows activity this recent. */
export const LATEST_MAX_AGE_DAYS = 30;

/** Each row links to its section of the résumé, further down the landing page. */
export type Stratum =
  | {
      kind: 'live';
      key: string;
      href: string;
      eyebrow: string;
      title: string;
      pill: { label: string; tone: ContributionTone };
    }
  | {
      kind: 'entry';
      key: string;
      href: string;
      eyebrow: string;
      title: string;
      detail: string;
    }
  | { kind: 'earlier'; key: string; href: string; eyebrow: string; detail: string };

/** The newest public contribution, or null when the newest is older than the cut-off. */
export function latestContribution(
  contributions: Contribution[],
  now: Date,
  maxAgeDays = LATEST_MAX_AGE_DAYS,
): Contribution | null {
  const [newest] = [...contributions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!newest) return null;
  const age = now.getTime() - new Date(newest.updatedAt).getTime();
  return age <= maxAgeDays * 86_400_000 ? newest : null;
}

/**
 * Landing "recent timeline": the latest GitHub activity (when recent), the two latest
 * projects, the latest role, then every earlier role folded into one line. Inputs are
 * ordered most recent first.
 */
export function buildStrata(
  projects: Project[],
  experience: Experience[],
  latest: Contribution | null = null,
): Stratum[] {
  const [latestRole, ...earlierRoles] = experience;
  const strata: Stratum[] = [];
  if (latest) {
    strata.push({
      kind: 'live',
      key: 'latest-on-github',
      href: '#open-source',
      eyebrow: `${formatDate(latest.updatedAt)} · Latest on GitHub`,
      title: latest.repo,
      pill: contributionPill(latest),
    });
  }

  strata.push(
    ...projects.slice(0, 2).map((p) => ({
      kind: 'entry' as const,
      key: `project-${p.id}`,
      href: `#${p.id}`,
      eyebrow: `${formatYearMonth(p.date)} · Project`,
      title: p.name,
      detail: p.tagline,
    })),
  );

  if (latestRole) {
    strata.push({
      kind: 'entry',
      key: `experience-${latestRole.id}`,
      href: `#${latestRole.id}`,
      eyebrow: formatYearRange(latestRole.start, latestRole.end),
      title: latestRole.shortName ?? latestRole.company,
      detail: latestRole.title,
    });
  }

  if (earlierRoles.length > 0) {
    const starts = earlierRoles.map((e) => e.start).sort();
    const ends = earlierRoles.map((e) => e.end ?? '9999-12').sort();
    const names = [...new Set(earlierRoles.map((e) => e.shortName ?? e.company))];
    strata.push({
      kind: 'earlier',
      key: 'earlier',
      href: '#experience',
      eyebrow: formatYearRange(
        starts[0] ?? '',
        ends.at(-1) === '9999-12' ? null : (ends.at(-1) ?? null),
      ),
      detail: names.join(' · '),
    });
  }

  return strata;
}
