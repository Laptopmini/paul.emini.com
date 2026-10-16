import type { Contribution } from '@/lib/cards';

// Clearly fake data for the gallery until content/github.json is populated (Phase 7).

export const FIXTURE_NOW = new Date('2026-10-16T12:00:00Z');

export const fixtureContributions: Contribution[] = [
  {
    kind: 'pr',
    state: 'merged',
    title: 'Example: fix streaming tool-call args',
    repo: 'example-org/example-repo',
    number: 101,
    url: 'https://github.com/example-org/example-repo/pull/101',
    createdAt: '2026-10-10T12:00:00Z',
    updatedAt: '2026-10-13T12:00:00Z',
    additions: 120,
    deletions: 30,
  },
  {
    kind: 'pr',
    state: 'open',
    title: 'Example: document the Workers runtime',
    repo: 'example-org/example-docs',
    number: 42,
    url: 'https://github.com/example-org/example-docs/pull/42',
    createdAt: '2026-10-08T12:00:00Z',
    updatedAt: '2026-10-09T12:00:00Z',
  },
  {
    kind: 'issue',
    state: 'open',
    title: 'Example: renderer drops partial JSON',
    repo: 'example-org/example-repo',
    number: 7,
    url: 'https://github.com/example-org/example-repo/issues/7',
    createdAt: '2026-09-30T12:00:00Z',
    updatedAt: '2026-10-02T12:00:00Z',
    comments: 4,
  },
];

export const fixtureRepo = {
  name: 'ralph-node',
  description: null,
  url: 'https://github.com/Laptopmini/ralph-node',
  language: 'JavaScript',
  stars: 0,
  createdAt: '2026-03-01T00:00:00Z',
  pushedAt: '2026-06-03T23:38:55Z',
};
