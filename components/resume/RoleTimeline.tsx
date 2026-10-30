import { Icon } from '@/components/Icon';
import { currentYearMonth, formatDuration } from '@/lib/cards';
import { caseStudies, experience } from '@/lib/content';
import { formatYearRange } from '@/lib/format';
import layout from './layout.module.css';
import { PageLink } from './PageLink';
import styles from './RoleTimeline.module.css';

/** Roles shown expanded; the rest collapse to a one-line summary (still in the HTML). */
const OPEN_ROLES = 1;

/**
 * Experience as a timeline: dates on the left, a node on the line, the role as a
 * native <details>. The most recent role gets the accent node.
 */
export function RoleTimeline() {
  const now = currentYearMonth(new Date());
  const first = experience.at(-1)?.start;
  const last = experience[0]?.end ?? now;
  return (
    <section aria-labelledby="experience" className={layout.section}>
      <div className={layout.sectionHead}>
        <h2 id="experience" className={layout.h2}>
          Experience
        </h2>
        {first && (
          <p className={layout.mono}>
            {experience.length} roles · {formatYearRange(first, last)}
          </p>
        )}
      </div>
      <div className={styles.timeline}>
        {experience.map((e, i) => (
          <article
            key={e.id}
            id={e.id}
            className={i === 0 ? `${styles.role} ${styles.latest}` : styles.role}
          >
            <p className={`${layout.mono} ${styles.when}`}>
              {formatYearRange(e.start, e.end)}
              <span className={styles.duration}>
                <span className={styles.dot}> · </span>
                {formatDuration(e.start, e.end ?? now)}
              </span>
            </p>
            <span className={styles.node} aria-hidden="true" />
            <details open={i < OPEN_ROLES} className={`${layout.card} ${styles.card}`}>
              <summary>
                <h3 className={styles.company}>{e.company}</h3>{' '}
                <span className={styles.meta}>
                  {e.title} · {e.location}
                </span>{' '}
                <span className={styles.gloss}>{e.oneLiner ?? e.highlights[0]?.short}</span>
                <span className={styles.chevron}>
                  <Icon name="chevronDown" />
                </span>
              </summary>
              <ul className={styles.highlights}>
                {e.highlights.map((h) => (
                  <li key={h.label}>
                    <strong>{h.label}:</strong> {h.text}
                  </li>
                ))}
              </ul>
              {caseStudies
                .filter((c) => c.experienceId === e.id)
                .map((c) => (
                  <p key={c.id} className={styles.related}>
                    Case study:{' '}
                    <PageLink href={`/work/${c.id}/`} className={styles.relatedLink}>
                      {c.title}
                    </PageLink>
                  </p>
                ))}
              <p className={styles.stack}>
                <span className="sr-only">Tech stack: </span>
                {e.stack.join(' · ')}
              </p>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
