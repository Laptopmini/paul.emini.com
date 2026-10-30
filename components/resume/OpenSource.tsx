import { ExternalLink } from '@/components/ExternalLink';
import { Icon } from '@/components/Icon';
import { formatDate } from '@/lib/cards';
import { github, profile } from '@/lib/content';
import { contributionPill } from '@/lib/resume';
import { COPY } from './copy';
import layout from './layout.module.css';
import styles from './resume.module.css';
import { StatusPill } from './StatusPill';

const SHOWN = 6;

/** Recent pull requests and issues on other people's projects (github.json, refreshed daily). */
export function OpenSource() {
  return (
    <section aria-labelledby="open-source" className={layout.section}>
      <div className={layout.sectionHead}>
        <h2 id="open-source" className={layout.h2}>
          Open source
        </h2>
        <p className={layout.mono}>Refreshed daily</p>
      </div>
      <p className={styles.ossIntro}>{COPY.ossIntro}</p>
      <ul className={`${layout.card} ${styles.oss}`}>
        {github.contributions.slice(0, SHOWN).map((c) => {
          const pill = contributionPill(c);
          return (
            <li key={c.url}>
              <StatusPill {...pill} className={styles.ossPill} />
              <span>
                <ExternalLink href={c.url} className={styles.ossTitle}>
                  {c.title}
                </ExternalLink>{' '}
                <span className={layout.mono}>
                  {c.repo} · {formatDate(c.updatedAt)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <ExternalLink href={profile.links.github} className={layout.more}>
        {COPY.allActivity} <Icon name="arrowUpRight" size={16} />
      </ExternalLink>
    </section>
  );
}
