import { describe, expect, it } from 'vitest';
import { experience, projects } from '@/content';
import { formatYearMonth, formatYearRange, handleFromUrl } from './format';
import { buildStrata, latestContribution } from './strata';

describe('buildStrata', () => {
  it('matches the landing board from current content', () => {
    expect(buildStrata(projects, experience)).toEqual([
      expect.objectContaining({
        kind: 'entry',
        title: 'Ragoût',
        eyebrow: 'Jun 2026 · Project',
        href: '#ragout',
      }),
      expect.objectContaining({
        kind: 'entry',
        title: 'Ralph-node',
        eyebrow: 'Apr 2026 · Project',
      }),
      expect.objectContaining({
        kind: 'entry',
        title: 'SmartThings',
        eyebrow: '2020 – 2026',
        detail: 'Senior Software Developer',
        href: '#smartthings',
      }),
      {
        kind: 'earlier',
        key: 'earlier',
        href: '#experience',
        eyebrow: '2015 – 2020',
        detail: 'Samsung · Prism · Imprivata',
      },
    ]);
  });

  it('handles a current role and no earlier roles', () => {
    const [role] = experience;
    if (!role) throw new Error('fixture');
    const strata = buildStrata([], [{ ...role, end: null }]);
    expect(strata).toEqual([expect.objectContaining({ eyebrow: '2020 – Present' })]);
  });
});

describe('latestContribution', () => {
  const base = {
    kind: 'pr' as const,
    state: 'merged' as const,
    title: 'fix: something',
    number: 1,
    createdAt: '2026-10-01T00:00:00Z',
  };
  const older = {
    ...base,
    repo: 'a/old',
    url: 'https://github.com/a/old/pull/1',
    updatedAt: '2026-10-02T00:00:00Z',
  };
  const newer = {
    ...base,
    repo: 'CopilotKit/CopilotKit',
    url: 'https://github.com/b/new/pull/2',
    updatedAt: '2026-10-24T00:00:00Z',
  };

  it('picks the newest and becomes the top row, titled by repo', () => {
    const latest = latestContribution([older, newer], new Date('2026-10-29T00:00:00Z'));
    expect(latest?.repo).toBe('CopilotKit/CopilotKit');
    expect(buildStrata(projects, experience, latest)[0]).toEqual({
      kind: 'live',
      key: 'latest-on-github',
      href: '#open-source',
      eyebrow: 'Oct 24, 2026 · Latest on GitHub',
      title: 'CopilotKit/CopilotKit',
      pill: { label: 'PR · merged', tone: 'merged' },
    });
  });

  it('hides activity older than 30 days', () => {
    expect(latestContribution([newer], new Date('2026-11-24T00:00:00Z'))).toBeNull();
    expect(latestContribution([], new Date())).toBeNull();
  });
});

describe('format', () => {
  it('formats dates and handles', () => {
    expect(formatYearMonth('2025-12')).toBe('Dec 2025');
    expect(formatYearRange('2015-01', '2015-08')).toBe('2015');
    expect(handleFromUrl('https://github.com/Laptopmini')).toBe('Laptopmini');
  });
});
