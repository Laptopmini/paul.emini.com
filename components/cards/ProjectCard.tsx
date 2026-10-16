import { ExternalLink } from '@/components/ExternalLink';
import { Icon } from '@/components/Icon';
import type { GitHubActivity, Project } from '@/content';
import { formatDate } from '@/lib/cards';
import { formatYearMonth } from '@/lib/format';
import { Card } from './Card';
import s from './cards.module.css';

type Repo = GitHubActivity['repos'][number];

/** A project. Stars and last push appear once the daily GitHub cache has the repo. */
export function ProjectCard({ project, repo }: { project: Project; repo?: Repo }) {
  const href = repo?.url ?? (project.repo ? `https://github.com/${project.repo}` : undefined);
  return (
    <Card>
      <div className={s.meta}>
        <span className={s.metaInline}>
          Project
          {repo && (
            <>
              {' · '}
              <Icon name="star" size={12} />
              <span>
                {repo.stars}
                <span className="sr-only"> stars</span>
              </span>
            </>
          )}
        </span>
        <span>{formatYearMonth(project.date)}</span>
      </div>
      <div>
        <h3 className={`${s.title} ${s.titleLg}`}>{project.name}</h3>
        <p className={s.subtitle}>{project.tagline}</p>
      </div>
      <p className={s.body}>{project.blurb}</p>
      <ul className={s.tags} aria-label="Tech">
        {project.tags.map((t) => (
          <li key={t} className={s.tag}>
            {t}
          </li>
        ))}
      </ul>
      {repo && (
        <p className={s.mono}>Last push {formatDate(repo.pushedAt)} · from daily GitHub cache</p>
      )}
      {href && (
        <ExternalLink href={href} className={s.textLink} style={{ marginTop: 'auto' }}>
          View repo on GitHub
          <span className="sr-only">: {project.name}</span>
          <Icon name="arrowUpRight" size={16} />
        </ExternalLink>
      )}
    </Card>
  );
}
