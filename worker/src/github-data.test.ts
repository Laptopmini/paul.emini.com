import { afterEach, describe, expect, it, vi } from 'vitest';
import { github as bundled } from '@/content';
import { githubActivity } from './github-data';

const snapshot = (fetchedAt: string) => ({ ...bundled, fetchedAt });

afterEach(() => vi.unstubAllGlobals());

describe('githubActivity', () => {
  it('uses the published snapshot when it is newer, and caches it', async () => {
    const fresh = snapshot('2099-01-01T00:00:00.000Z');
    const fetchMock = vi.fn(async () => Response.json(fresh));
    vi.stubGlobal('fetch', fetchMock);
    expect(await githubActivity('https://site/github.json', 1_000)).toEqual(fresh);
    expect(await githubActivity('https://site/github.json', 2_000)).toEqual(fresh);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the bundled copy without a URL, or when the published one is invalid', async () => {
    expect(await githubActivity(undefined)).toBe(bundled);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ nope: true })),
    );
    const later = 10 * 60_000 * 100; // past the cache
    expect(await githubActivity('https://site/github.json', later)).toEqual(
      snapshot('2099-01-01T00:00:00.000Z'), // last good snapshot still cached
    );
  });
});
