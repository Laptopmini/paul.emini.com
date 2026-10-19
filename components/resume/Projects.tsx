import { ExternalLink } from '@/components/ExternalLink';
import { Icon } from '@/components/Icon';
import { formatDate } from '@/lib/cards';
import { github, profile, projects } from '@/lib/content';
import { formatYearMonth } from '@/lib/format';
import { moreRepos } from '@/lib/repos';
import { COPY } from './copy';
import layout from './layout.module.css';
import styles from './Projects.module.css';

const repos = new Map(github.repos.map((r) => [r.name.toLowerCase(), r]));
const repoId = (name: string) => `repo-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/**
 * Curated projects side by side (a swipe row on phones), each highlight a ruled row
 * that opens to its full text; then the other public repos as linked tiles.
 */
export function Projects() {
  const more = moreRepos(github, projects);
  return (
    <section aria-labelledby="projects" className={layout.section}>
      <div className={layout.sectionHead}>
        <h2 id="projects" className={layout.h2}>
          Projects
        </h2>
        <ExternalLink href={profile.links.github} className={layout.more}>
          {COPY.allRepos} <Icon name="arrowUpRight" size={16} />
        </ExternalLink>
      </div>
      <div className={styles.row}>
        {projects.map((p) => {
          const repo = p.repo ? repos.get(p.repo.split('/')[1]?.toLowerCase() ?? '') : undefined;
          const href = repo?.url ?? (p.repo ? `https://github.com/${p.repo}` : undefined);
          return (
            <article
              key={p.id}
              id={p.id}
              className={`${layout.card} ${layout.lift} ${styles.project}`}
            >
              <p className={layout.mono}>
                {[p.kind, formatYearMonth(p.date), repo && `★ ${repo.stars}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <div>
                <h3 className={styles.name}>{p.name}</h3>
                <p className={styles.tagline}>{p.tagline}</p>
              </div>
              <p className={styles.summary}>{p.summary}</p>
              <ul className={styles.highlights}>
                {p.highlights.map((h) => (
                  <li key={h.label}>
                    <details>
                      <summary>
                        <span>
                          <strong>{h.label}</strong>
                          {h.short && ` — ${h.short}`}
                        </span>
                        <Icon name="chevronDown" size={16} />
                      </summary>
                      <p>{h.text}</p>
                    </details>
                  </li>
                ))}
              </ul>
              <p className={styles.stack}>
                <span className="sr-only">Tech stack: </span>
                {p.stack.join(' · ')}
                {repo && ` · last push ${formatDate(repo.pushedAt)}`}
              </p>
              {href && (
                <ExternalLink href={href} className={`${layout.more} ${styles.repoLink}`}>
                  {COPY.viewRepo} <Icon name="arrowUpRight" size={16} />
                </ExternalLink>
              )}
            </article>
          );
        })}
      </div>

      {more.length > 0 && (
        <>
          <h3 id="more-on-github" className={styles.subheading}>
            More on GitHub
          </h3>
          <ul className={styles.tiles}>
            {more.map((r) => (
              <li key={r.name}>
                <article
                  id={repoId(r.name)}
                  className={`${layout.card} ${layout.lift} ${styles.tile}`}
                >
                  <p className={layout.mono}>
                    {[r.language, `★ ${r.stars}`].filter(Boolean).join(' · ')}
                  </p>
                  <h4 className={styles.tileName}>
                    <ExternalLink href={r.url} className={styles.tileLink}>
                      {r.name}
                    </ExternalLink>
                  </h4>
                  {(r.readme ?? r.description) && (
                    <p className={styles.tileText}>{r.readme ?? r.description}</p>
                  )}
                  <p className={layout.mono}>Last push {formatDate(r.pushedAt)}</p>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
