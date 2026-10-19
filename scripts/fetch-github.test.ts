import { describe, expect, it } from 'vitest';
import type { GitHubActivity } from '@/content';
import {
  type ApiIssue,
  includedRepos,
  orderContributions,
  readmeExcerpt,
  sameData,
  toContribution,
  toRepo,
} from './fetch-github.ts';

const issue = (over: Partial<ApiIssue> = {}): ApiIssue => ({
  number: 12,
  title: 'Fix the thing',
  html_url: 'https://github.com/acme/lib/pull/12',
  repository_url: 'https://api.github.com/repos/acme/lib',
  state: 'closed',
  comments: 3,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-02T10:00:00Z',
  ...over,
});

describe('fetch-github', () => {
  it('maps a merged PR with its diff size', () => {
    const c = toContribution(issue({ pull_request: { merged_at: null } }), {
      merged_at: '2026-10-02T09:00:00Z',
      additions: 40,
      deletions: 2,
    });
    expect(c).toMatchObject({
      kind: 'pr',
      state: 'merged',
      repo: 'acme/lib',
      number: 12,
      additions: 40,
      deletions: 2,
      updatedAt: '2026-10-02T10:00:00.000Z',
    });
  });

  it('maps an issue and a closed, unmerged PR', () => {
    expect(toContribution(issue({ state: 'open' }))).toMatchObject({
      kind: 'issue',
      state: 'open',
    });
    expect(
      toContribution(issue({ pull_request: { merged_at: null } }), {
        merged_at: null,
        additions: 1,
        deletions: 1,
      }),
    ).toMatchObject({ kind: 'pr', state: 'closed' });
  });

  it('maps a repo', () => {
    expect(
      toRepo({
        name: 'ragout',
        description: null,
        html_url: 'https://github.com/Laptopmini/ragout',
        language: 'Python',
        stargazers_count: 4,
        created_at: '2026-06-01T00:00:00Z',
        pushed_at: '2026-06-20T00:00:00Z',
        fork: false,
        private: false,
      }),
    ).toMatchObject({ name: 'ragout', stars: 4, pushedAt: '2026-06-20T00:00:00.000Z' });
  });

  it('lists pinned contributions first, then the most recent, without duplicates', () => {
    const a = toContribution(issue({ html_url: 'https://github.com/a/a/issues/1' }));
    const b = toContribution(
      issue({ html_url: 'https://github.com/b/b/issues/2', updated_at: '2026-10-09T00:00:00Z' }),
    );
    const c = toContribution(
      issue({ html_url: 'https://github.com/c/c/issues/3', updated_at: '2026-10-05T00:00:00Z' }),
    );
    expect(orderContributions([a, b, c, b], [a.url]).map((x) => x.url)).toEqual([
      a.url,
      b.url,
      c.url,
    ]);
  });

  it('takes the first prose paragraph of a README, as plain text', () => {
    const readme = [
      '# 🍲 Ragoût',
      '[![CI](https://x/badge.svg)](https://x)',
      '> Your manual, now with answers.',
      '```sh\nnpm i\n```',
      'An **expert** assistant built with [LlamaIndex](https://llamaindex.ai) and `ChromaDB`.',
      'Second paragraph.',
    ].join('\n\n');
    expect(readmeExcerpt(readme)).toBe('An expert assistant built with LlamaIndex and ChromaDB.');
    expect(readmeExcerpt('# Title only\n\n![logo](x.png)')).toBeUndefined();
  });

  it('cuts a long README opening at a sentence', () => {
    const long = `${'This sentence is long enough to count. '.repeat(20)}`;
    const excerpt = readmeExcerpt(long) ?? '';
    expect(excerpt.length).toBeLessThanOrEqual(420);
    expect(excerpt.endsWith('.')).toBe(true);
  });

  it('includes only allow-listed and project repos, by name', () => {
    expect([...includedRepos(['PorschePi'], ['Laptopmini/ragout'])].sort()).toEqual([
      'porschepi',
      'ragout',
    ]);
  });

  it('ignores fetchedAt when deciding whether anything changed', () => {
    const base: GitHubActivity = { fetchedAt: null, user: 'x', repos: [], contributions: [] };
    expect(sameData(base, { ...base, fetchedAt: '2026-10-17T00:00:00.000Z' })).toBe(true);
    expect(sameData(base, { ...base, user: 'y' })).toBe(false);
  });
});
