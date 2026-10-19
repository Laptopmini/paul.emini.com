import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { certifications, parseRecommendations } from '@/content';
import {
  contributionDetail,
  contributionStatus,
  formatDate,
  formatDuration,
  formatMonthRange,
  formatRelative,
  initials,
  mailtoHref,
  markExcerpt,
  pickExcerpt,
  splitCertifications,
} from './cards';

const recommendations = parseRecommendations(
  readFileSync(join(import.meta.dirname, '..', 'content', 'recommendations.md'), 'utf8'),
);
const luc = recommendations.find((r) => r.id === 'luc-julia');
if (!luc) throw new Error('fixture');

describe('dates', () => {
  it('formats durations inclusively', () => {
    expect(formatDuration('2020-01', '2026-06')).toBe('6 yr 6 mo');
    expect(formatDuration('2015-01', '2015-08')).toBe('8 mo');
    expect(formatDuration('2018-03', '2020-02')).toBe('2 yr');
  });

  it('formats ranges and dates', () => {
    expect(formatMonthRange('2020-01', '2026-06')).toBe('Jan 2020 – Jun 2026');
    expect(formatMonthRange('2026-01', null)).toBe('Jan 2026 – Present');
    expect(formatDate('2026-06-03T23:38:55Z')).toBe('Jun 3, 2026');
  });

  it('formats relative times', () => {
    const now = new Date('2026-10-16T12:00:00Z');
    expect(formatRelative('2026-10-16T06:00:00Z', now)).toBe('6 h ago');
    expect(formatRelative('2026-10-13T12:00:00Z', now)).toBe('3 d ago');
    expect(formatRelative('2026-10-02T12:00:00Z', now)).toBe('2 wk ago');
    expect(formatRelative('2026-06-01T12:00:00Z', now)).toBe('Jun 1, 2026');
  });
});

describe('recommendations', () => {
  it('derives initials without honorifics', () => {
    expect(initials('Dr. Luc Julia')).toBe('LJ');
    expect(initials('Sandra Martocchia')).toBe('SM');
  });

  it('only accepts verbatim excerpts', () => {
    const quote =
      'Responding to our rapid innovation, he always managed to provide elegant solutions to hard engineering and user experience problems.';
    expect(pickExcerpt(luc, quote)).toBe(quote);
    expect(pickExcerpt(luc, `“${quote}”`)).toBe(quote);
    expect(pickExcerpt(luc, 'Paul is the best engineer I have ever worked with.')).toMatch(
      /^Paul-Valentin Mini was brought on to ARTIK Cloud/,
    );
    expect(pickExcerpt(luc)).toMatch(/^Paul-Valentin Mini was brought on/);
  });

  it('keeps the verbatim sentences of a partly paraphrased excerpt', () => {
    const verbatim =
      'His Swift knowledge, extensive understanding of platform limitations and great expertise with native iOS frameworks proved to be invaluable to the development of our product. Responding to our rapid innovation, he always managed to provide elegant solutions to hard engineering and user experience problems.';
    expect(pickExcerpt(luc, `${verbatim} He is, frankly, a genius.`)).toBe(verbatim);
  });

  it('marks a verbatim excerpt in place and leaves the rest unmarked', () => {
    const quote =
      'Responding to our rapid innovation, he always managed to provide elegant solutions to hard engineering and user experience problems.';
    const marked = markExcerpt(luc, quote);
    const hit = marked.find((p) => typeof p !== 'string');
    expect(hit).toMatchObject({ mark: quote });
    expect(marked.length).toBe(luc.body.split(/\n\s*\n/).length);
    expect(markExcerpt(luc, 'Paul is the best engineer I have ever worked with.')).toEqual(
      markExcerpt(luc),
    );
    expect(markExcerpt(luc).every((p) => typeof p === 'string')).toBe(true);
  });
});

describe('contact', () => {
  it('builds a mailto with encoded subject and body', () => {
    expect(mailtoHref('paul@emini.com', 'Hi there', 'A & B\nC')).toBe(
      'mailto:paul@emini.com?subject=Hi%20there&body=A%20%26%20B%0AC',
    );
  });
});

describe('contributions', () => {
  const base = {
    title: 'Fix it',
    repo: 'org/repo',
    number: 12,
    url: 'https://github.com/org/repo/pull/12',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  };

  it('labels status in text, not just color', () => {
    expect(contributionStatus({ ...base, kind: 'pr', state: 'merged' }).label).toBe('PR · merged');
    expect(contributionStatus({ ...base, kind: 'pr', state: 'closed' }).label).toBe('PR · closed');
    expect(contributionStatus({ ...base, kind: 'issue', state: 'open' }).label).toBe('Issue');
  });

  it('describes each row', () => {
    expect(
      contributionDetail({ ...base, kind: 'pr', state: 'merged', additions: 120, deletions: 30 }),
    ).toBe('org/repo #12 · +120 −30');
    expect(contributionDetail({ ...base, kind: 'pr', state: 'open' })).toBe(
      'org/repo #12 · in review',
    );
    expect(contributionDetail({ ...base, kind: 'issue', state: 'open', comments: 1 })).toBe(
      'org/repo #12 · 1 comment',
    );
  });
});

describe('certifications', () => {
  it('shows the newest and summarizes the rest by issuer', () => {
    const { shown, summary } = splitCertifications(certifications, 4);
    expect(shown.map((c) => c.issued)).toEqual(['2026-07', '2026-06', '2026-06', '2026-05']);
    expect(summary).toBe('+ 2 from Frontend Masters');
    expect(splitCertifications(certifications, 10).summary).toBeNull();
  });
});
