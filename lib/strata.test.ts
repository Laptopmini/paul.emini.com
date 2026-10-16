import { describe, expect, it } from 'vitest';
import { experience, projects } from '@/content';
import { formatYearMonth, formatYearRange, handleFromUrl } from './format';
import { buildStrata } from './strata';

describe('buildStrata', () => {
  it('matches the landing board from current content', () => {
    expect(buildStrata(projects, experience)).toEqual([
      expect.objectContaining({ kind: 'feature', title: 'Ragoût', eyebrow: 'Jun 2026 · Project' }),
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
      }),
      {
        kind: 'earlier',
        key: 'earlier',
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

describe('format', () => {
  it('formats dates and handles', () => {
    expect(formatYearMonth('2025-12')).toBe('Dec 2025');
    expect(formatYearRange('2015-01', '2015-08')).toBe('2015');
    expect(handleFromUrl('https://github.com/Laptopmini')).toBe('Laptopmini');
  });
});
