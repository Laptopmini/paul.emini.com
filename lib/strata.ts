import type { Experience, Project } from '@/content';
import { formatYearMonth, formatYearRange } from './format';

/** Each row links to its section of /resume. */
export type Stratum =
  | {
      kind: 'feature' | 'entry';
      key: string;
      href: string;
      eyebrow: string;
      title: string;
      detail: string;
    }
  | { kind: 'earlier'; key: string; href: string; eyebrow: string; detail: string };

/**
 * Landing "recent timeline": the two latest projects, the latest role, then every
 * earlier role folded into one line. Inputs are ordered most recent first.
 */
export function buildStrata(projects: Project[], experience: Experience[]): Stratum[] {
  const [latestRole, ...earlierRoles] = experience;
  const strata: Stratum[] = projects.slice(0, 2).map((p, i) => ({
    kind: i === 0 ? 'feature' : 'entry',
    key: `project-${p.id}`,
    href: `/resume/#${p.id}`,
    eyebrow: `${formatYearMonth(p.date)} · Project`,
    title: p.name,
    detail: p.tagline,
  }));

  if (latestRole) {
    strata.push({
      kind: 'entry',
      key: `experience-${latestRole.id}`,
      href: `/resume/#${latestRole.id}`,
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
      href: `/resume/#${earlierRoles[0]?.id ?? 'experience'}`,
      eyebrow: formatYearRange(
        starts[0] ?? '',
        ends.at(-1) === '9999-12' ? null : (ends.at(-1) ?? null),
      ),
      detail: names.join(' · '),
    });
  }

  return strata;
}
