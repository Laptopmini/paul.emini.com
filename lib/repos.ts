import type { GitHubActivity, Project } from '@/content';

type Repo = GitHubActivity['repos'][number];

/**
 * Portfolio repos that aren't already a curated project, most recently pushed first.
 * github.json only holds allow-listed repos (content/portfolio-repos.json), so this
 * never surfaces job applications or generated demos.
 */
export function moreRepos(github: GitHubActivity, projects: Project[]): Repo[] {
  const curated = new Set(
    projects.flatMap((p) => (p.repo ? [p.repo.split('/')[1]?.toLowerCase()] : [])),
  );
  return github.repos
    .filter((r) => !curated.has(r.name.toLowerCase()))
    .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
}
