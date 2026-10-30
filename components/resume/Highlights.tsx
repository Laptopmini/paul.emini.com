import type { CSSProperties } from 'react';
import { Icon } from '@/components/Icon';
import { awards, caseStudies, experience, mentions } from '@/lib/content';
import { formatYearMonth } from '@/lib/format';
import { COPY } from './copy';
import layout from './layout.module.css';
import { Mention } from './Mention';
import { PageLink } from './PageLink';
import styles from './resume.module.css';
import { StatTiles } from './StatTiles';

/** How far each bento card starts below its place as it settles in (px), in order. */
const DEPTHS = [32, 64, 112];
const settle = (i: number) => ({ '--y': `${DEPTHS[i] ?? DEPTHS.at(-1)}px` }) as CSSProperties;

/**
 * Bento: each case study as a full-width ink card, then mentions and awards side by
 * side at equal height. The cards settle in at different rates (layout.settle).
 */
export function Highlights() {
  const offset = caseStudies.length + mentions.length;
  return (
    <section aria-labelledby="highlights" className={layout.section}>
      <h2 id="highlights" className={layout.h2}>
        Highlights
      </h2>
      <div className={styles.bento}>
        {caseStudies.map((c, i) => {
          const company = experience.find((e) => e.id === c.experienceId);
          const stats = (c.stats ?? []).filter((s) => s.teaser);
          return (
            <article
              key={c.id}
              className={`${styles.teaser} ${layout.lift} ${layout.settle}`}
              style={settle(i)}
            >
              <div className={styles.teaserHead}>
                <p className={`${layout.mono} ${styles.onInkMuted}`}>
                  Case study · {company?.shortName ?? company?.company} · {formatYearMonth(c.start)}{' '}
                  – {formatYearMonth(c.end)}
                </p>
                <h3 className={styles.teaserTitle} style={{ viewTransitionName: `case-${c.id}` }}>
                  {c.title}
                </h3>
                <PageLink href={`/work/${c.id}/`} className={`${layout.more} ${styles.onInkLink}`}>
                  {COPY.readCaseStudy} <Icon name="arrowUpRight" size={16} />
                </PageLink>
              </div>
              <div className={styles.teaserBody}>
                <p>{c.summary}</p>
                {stats.length > 0 && <StatTiles stats={stats} variant="teaser" />}
              </div>
            </article>
          );
        })}
        {mentions.map((m, i) => (
          <Mention
            key={m.id}
            mention={m}
            className={layout.settle}
            style={settle(caseStudies.length + i)}
          />
        ))}
        {awards.map((a, i) => (
          <article
            key={a.id}
            className={`${layout.card} ${layout.lift} ${layout.settle} ${styles.award}`}
            style={settle(offset + i)}
          >
            <span className={styles.medal}>
              <Icon name="medal" size={24} />
            </span>
            <div className={styles.awardText}>
              <p className={layout.mono}>
                Award · {a.issuer} · {formatYearMonth(a.received)}
              </p>
              <h3 className={styles.awardName}>{a.name}</h3>
              <p className={styles.awardBlurb}>{a.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
