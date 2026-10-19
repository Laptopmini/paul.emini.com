import Link from 'next/link';
import { ExternalLink } from '@/components/ExternalLink';
import { Icon, type IconName } from '@/components/Icon';
import { currentYearMonth } from '@/lib/cards';
import { experience, github, pages, profile, RESUME_PDF } from '@/lib/content';
import { formatYearRange, noBreakHyphens } from '@/lib/format';
import { experienceLabel, topOwners } from '@/lib/resume';
import { COPY } from './copy';
import layout from './layout.module.css';
import styles from './resume.module.css';

const latest = experience[0];
const owners = topOwners(github.contributions, pages.ossDisplayNames);

/** Glance items; phones show the first two. */
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

/** On phones contacts become icon tiles; `short` replaces a label too long for one. */
const contacts: { href: string; label: string; short?: string; icon: IconName }[] = [
  { href: `mailto:${profile.email}`, label: profile.email, short: 'Email', icon: 'mail' },
  { href: profile.links.linkedin, label: 'LinkedIn', icon: 'linkedin' },
  { href: profile.links.github, label: 'GitHub', icon: 'github' },
];

export function ResumeHero() {
  return (
    <section aria-labelledby="name" className={styles.hero}>
      <div className={styles.intro}>
        <p className={`${layout.mono} ${styles.location}`}>
          <Icon name="pin" size={16} />
          {profile.location.city}, {profile.location.region}
        </p>
        <h1 id="name" className={styles.name}>
          {noBreakHyphens(profile.name)}
        </h1>
        <p className={styles.title}>{profile.title}</p>
        <p className={styles.summary}>{profile.summary}</p>
      </div>

      <aside aria-label="At a glance" className={`${layout.card} ${styles.glance}`}>
        <dl className={styles.glanceList}>
          {glance.map((item) => (
            <div key={item.label}>
              <dt className={layout.mono}>{item.label}</dt>
              <dd className={'className' in item ? item.className : undefined}>
                {item.value}
                {'detail' in item && <span className={styles.glanceDetail}>{item.detail}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <nav aria-label="Contact" className={styles.contacts}>
          {contacts.map((c) => {
            const content = (
              <>
                <Icon name={c.icon} size={16} />
                <span className={c.short ? styles.contactLong : undefined}>{c.label}</span>
                {c.short && (
                  <span className={styles.contactShort} aria-hidden="true">
                    {c.short}
                  </span>
                )}
              </>
            );
            return c.href.startsWith('mailto:') ? (
              <a key={c.href} href={c.href} className={`${styles.contact} ${layout.lift}`}>
                {content}
              </a>
            ) : (
              <ExternalLink
                key={c.href}
                href={c.href}
                className={`${styles.contact} ${layout.lift}`}
              >
                {content}
              </ExternalLink>
            );
          })}
        </nav>
        <div className={styles.heroActions}>
          <a
            href={RESUME_PDF}
            download={`${profile.name.replaceAll(' ', '-')}-Resume.pdf`}
            className={layout.primary}
          >
            <Icon name="download" size={16} /> {COPY.downloadPdf}
          </a>
          <Link href="/" className={layout.ghost}>
            {COPY.askInstead}
          </Link>
        </div>
      </aside>
    </section>
  );
}
