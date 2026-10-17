import { github as bundled, type GitHubActivity } from '@/content';
import { githubSchema } from '@/content/schema';

// The daily GitHub snapshot. A scheduled Action commits content/github.json and the site
// publishes it as /github.json; the Worker reads that copy (GITHUB_DATA_URL) so fresh
// activity reaches the agent without a Worker deploy. The copy bundled at deploy time is
// the fallback, and whichever snapshot is newer wins.

const TTL_MS = 10 * 60_000;

let cached: { data: GitHubActivity; at: number } | undefined;

const newer = (a: GitHubActivity, b: GitHubActivity) =>
  (a.fetchedAt ?? '') >= (b.fetchedAt ?? '') ? a : b;

export async function githubActivity(url: string | undefined, now = Date.now()) {
  if (!url) return bundled;
  if (cached && now - cached.at < TTL_MS) return cached.data;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = newer(githubSchema.parse(await response.json()), bundled);
    cached = { data, at: now };
    return data;
  } catch {
    return cached?.data ?? bundled;
  }
}
