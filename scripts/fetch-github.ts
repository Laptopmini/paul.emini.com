// Refreshes content/github.json from the GitHub API (brief §6). Run daily by
// .github/workflows/github.yml; locally: GITHUB_TOKEN=$(gh auth token) pnpm fetch:github
//
// - repos: public, non-fork repos owned by the user, limited to the curated projects'
//   repos and content/portfolio-repos.json (never job applications or generated demos),
//   each with the opening of its README
// - contributions: PRs and issues on repos the user doesn't own, updated in the last 90
//   days (plus anything pinned in content/contributions-pinned.json, listed first)
//
// The file is only rewritten when the data changed, so a quiet day makes no commit and
// `fetchedAt` is the time of the last real change.

import { readFile, writeFile } from 'node:fs/promises';
import {
  contributionsPinnedSchema,
  type GitHubActivity,
  githubSchema,
  portfolioReposSchema,
  projectsSchema,
} from '../content/schema/index.ts';

const USER = 'Laptopmini';
const WINDOW_DAYS = 90;
const MAX_CONTRIBUTIONS = 30;
const OUT = new URL('../content/github.json', import.meta.url);
const PINNED = new URL('../content/contributions-pinned.json', import.meta.url);
const PORTFOLIO = new URL('../content/portfolio-repos.json', import.meta.url);
const PROJECTS = new URL('../content/projects.json', import.meta.url);
const README_MAX = 420;

type Repo = GitHubActivity['repos'][number];
type Contribution = GitHubActivity['contributions'][number];

export type ApiRepo = {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  created_at: string;
  pushed_at: string;
  fork: boolean;
  private: boolean;
};

export type ApiIssue = {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  state: 'open' | 'closed';
  comments: number;
  created_at: string;
  updated_at: string;
  pull_request?: { merged_at: string | null };
};

export type ApiPull = { merged_at: string | null; additions: number; deletions: number };

/** GitHub returns second-precision timestamps; the schema wants ISO datetimes. */
const iso = (value: string) => new Date(value).toISOString();

/**
 * The README's opening as plain text: the first paragraph of prose, skipping headings,
 * badges, quotes, code and HTML; links keep their text; cut at a sentence near 420 chars.
 */
export function readmeExcerpt(markdown: string): string | undefined {
  const blocks = markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n\s*\n/)
    .map((b) => b.trim());
  const prose = blocks.find(
    (b) => b && !/^(#|>|!\[|\[!\[|<|\||[-*+] |\d+\. )/.test(b) && /[a-z]{3,}.*[.!?:]/i.test(b),
  );
  if (!prose) return undefined;
  const text = prose
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|`)(.+?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= README_MAX) return text;
  const cut = text.slice(0, README_MAX);
  const end = cut.lastIndexOf('. ');
  return end > 120 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

export function toRepo(r: ApiRepo, readme?: string): Repo {
  const excerpt = readme ? readmeExcerpt(readme) : undefined;
  return {
    name: r.name,
    description: r.description,
    url: r.html_url,
    language: r.language,
    stars: r.stargazers_count,
    createdAt: iso(r.created_at),
    pushedAt: iso(r.pushed_at),
    ...(excerpt ? { readme: excerpt } : {}),
  };
}

/** Repos the site may show: the curated projects' and the portfolio allow-list. */
export function includedRepos(portfolio: string[], projectRepos: string[]): Set<string> {
  return new Set(
    [...portfolio, ...projectRepos.map((r) => r.split('/')[1] ?? r)].map((n) => n.toLowerCase()),
  );
}

export function toContribution(issue: ApiIssue, pull?: ApiPull): Contribution {
  const repo = issue.repository_url.replace('https://api.github.com/repos/', '');
  const base = {
    title: issue.title,
    repo,
    number: issue.number,
    url: issue.html_url,
    createdAt: iso(issue.created_at),
    updatedAt: iso(issue.updated_at),
    comments: issue.comments,
  };
  if (!issue.pull_request) return { kind: 'issue', state: issue.state, ...base };
  const merged = Boolean(pull?.merged_at ?? issue.pull_request.merged_at);
  return {
    kind: 'pr',
    state: merged ? 'merged' : issue.state,
    ...base,
    ...(pull ? { additions: pull.additions, deletions: pull.deletions } : {}),
  };
}

/** Pinned first (in their order), then the rest by most recent update. */
export function orderContributions(items: Contribution[], pinned: string[]): Contribution[] {
  const rank = (c: Contribution) => {
    const i = pinned.indexOf(c.url);
    return i === -1 ? pinned.length : i;
  };
  const unique = [...new Map(items.map((c) => [c.url, c])).values()];
  return unique.sort((a, b) => rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt));
}

/** Whether anything but `fetchedAt` differs. */
export function sameData(a: GitHubActivity, b: GitHubActivity): boolean {
  const strip = ({ fetchedAt: _, ...rest }: GitHubActivity) => JSON.stringify(rest);
  return strip(a) === strip(b);
}

async function api<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub ${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function readme(name: string): Promise<string | undefined> {
  const response = await fetch(`https://api.github.com/repos/${USER}/${name}/readme`, {
    headers: {
      accept: 'application/vnd.github.raw',
      'x-github-api-version': '2022-11-28',
      ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GitHub README ${name}: HTTP ${response.status}`);
  return response.text();
}

async function readIncluded(): Promise<Set<string>> {
  const portfolio = portfolioReposSchema.parse(JSON.parse(await readFile(PORTFOLIO, 'utf8')));
  const projects = projectsSchema.parse(JSON.parse(await readFile(PROJECTS, 'utf8')));
  return includedRepos(
    portfolio.repos,
    projects.flatMap((p) => (p.repo ? [p.repo] : [])),
  );
}

async function readPinned(): Promise<string[]> {
  try {
    const raw = JSON.parse(await readFile(PINNED, 'utf8'));
    return contributionsPinnedSchema.parse(raw).map((p) => p.url);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/** "https://github.com/o/r/pull/12" → its issue from the API. */
async function issueAt(url: string): Promise<ApiIssue> {
  const match = url.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/(?:pull|issues)\/(\d+)$/);
  if (!match) throw new Error(`Not a GitHub PR or issue URL: ${url}`);
  return api<ApiIssue>(`/repos/${match[1]}/issues/${match[2]}`);
}

async function withDetails(issue: ApiIssue): Promise<Contribution> {
  if (!issue.pull_request) return toContribution(issue);
  const [, owner, repo] = issue.html_url.match(/github\.com\/([^/]+)\/([^/]+)\//) ?? [];
  const pull = await api<ApiPull>(`/repos/${owner}/${repo}/pulls/${issue.number}`);
  return toContribution(issue, pull);
}

export async function fetchActivity(now: Date): Promise<GitHubActivity> {
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const query = encodeURIComponent(`author:${USER} -user:${USER} updated:>=${since}`);
  const [repos, search, pinned, included] = await Promise.all([
    api<ApiRepo[]>(`/users/${USER}/repos?type=owner&sort=pushed&per_page=100`),
    api<{ items: ApiIssue[] }>(`/search/issues?q=${query}&sort=updated&order=desc&per_page=100`),
    readPinned(),
    readIncluded(),
  ]);
  const shown = repos.filter((r) => !r.fork && !r.private && included.has(r.name.toLowerCase()));
  const readmes = await Promise.all(shown.map((r) => readme(r.name)));
  const found = new Set(search.items.map((i) => i.html_url));
  const pinnedIssues = await Promise.all(pinned.filter((u) => !found.has(u)).map(issueAt));
  const contributions = await Promise.all(
    [...search.items.slice(0, MAX_CONTRIBUTIONS), ...pinnedIssues].map(withDetails),
  );
  return githubSchema.parse({
    fetchedAt: now.toISOString(),
    user: USER,
    repos: shown.map((r, i) => toRepo(r, readmes[i])),
    contributions: orderContributions(contributions, pinned),
  });
}

if (import.meta.main) {
  const current = githubSchema.parse(JSON.parse(await readFile(OUT, 'utf8')));
  const next = await fetchActivity(new Date());
  if (current.fetchedAt && sameData(current, next)) {
    console.log('github.json: no changes');
  } else {
    await writeFile(OUT, `${JSON.stringify(next, null, 2)}\n`);
    console.log(
      `github.json: ${next.repos.length} repos, ${next.contributions.length} contributions`,
    );
  }
}
