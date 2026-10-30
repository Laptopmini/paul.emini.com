import { RESUME_ID } from '@/components/landing/copy';
import { currentYearMonth } from '@/lib/cards';
import { experience, github, pages, profile } from '@/lib/content';
import { formatYearRange } from '@/lib/format';
import { experienceLabel, splitSummary, topOwners } from '@/lib/resume';
import layout from './layout.module.css';
import styles from './resume.module.css';

const latest = experience[0];
const owners = topOwners(github.contributions, pages.ossDisplayNames);

const glance = [
  {
    label: 'Experience',
    value: experienceLabel(experience, currentYearMonth(new Date())),
    className: styles.glanceLead,
  },
  latest && {
    label: 'Most recent',
    className: styles.glanceStrong,
    value: latest.shortName ?? latest.company,
    detail: formatYearRange(latest.start, latest.end),
  },
  { label: 'Focus', value: profile.focus.join(' · ') },
  owners.length > 0 && { label: 'Open source', value: owners.join(' · ') },
].filter((item) => !!item);

/**
 * Where the résumé starts on the landing page. The hero above already gives the name,
 * title and location, so this opens with the summary: its first sentence as a lead-in,
 * then the facts at a glance.
 */
export function ResumeIntro() {
  const [lead, rest] = splitSummary(profile.summary);
  return (
    <section id={RESUME_ID} aria-labelledby="resume-heading" className={styles.intro}>
      <div>
        <h2 id="resume-heading" className="sr-only">
          Résumé
        </h2>
        <p className={styles.lead}>{lead}</p>
        {rest && <p className={styles.summary}>{rest}</p>}
      </div>
      <aside aria-label="At a glance" className={`${layout.card} ${styles.glance}`}>
        <dl className={styles.glanceList}>
          {glance.map((item) => (
            <div key={item.label}>
              <dt className={layout.mono}>{item.label}</dt>
              <dd className={'className' in item ? item.className : undefined}>
                {item.value}
                {'detail' in item && (
                  <>
                    {' '}
                    <span className={styles.glanceDetail}>{item.detail}</span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </section>
  );
}
