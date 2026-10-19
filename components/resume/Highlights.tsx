import { Icon } from '@/components/Icon';
import { awards, caseStudies, experience, mentions } from '@/lib/content';
import { formatYearMonth } from '@/lib/format';
import { COPY } from './copy';
import layout from './layout.module.css';
import { Mention } from './Mention';
import { PageLink } from './PageLink';
import styles from './resume.module.css';
import { StatTiles } from './StatTiles';

/** Bento: each case study as a full-width ink card, then mentions and awards. */
export function Highlights() {
  return (
    <section aria-labelledby="highlights" className={layout.section}>
      <h2 id="highlights" className={layout.h2}>
        Highlights
      </h2>
      <div className={styles.bento}>
        {caseStudies.map((c) => {
          const company = experience.find((e) => e.id === c.experienceId);
          const stats = (c.stats ?? []).filter((s) => s.teaser);
          return (
            <article key={c.id} className={`${styles.teaser} ${layout.lift}`}>
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
        {mentions.map((m) => (
          <Mention key={m.id} mention={m} />
        ))}
        {awards.map((a) => (
          <article key={a.id} className={`${layout.card} ${layout.lift} ${styles.award}`}>
            <div className={styles.awardHead}>
              <p className={layout.mono}>
                Award · {a.issuer} · {formatYearMonth(a.received)}
              </p>
              <Icon name="medal" size={22} />
            </div>
            <h3 className={styles.awardName}>{a.name}</h3>
            <p className={styles.awardText}>{a.blurb}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
