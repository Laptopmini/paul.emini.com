import Link from 'next/link';
import { ExternalLink } from '@/components/ExternalLink';
import { Icon, type IconName } from '@/components/Icon';
import { PageLink } from '@/components/resume/PageLink';
import { caseStudies, profile, RESUME_PDF } from '@/lib/content';
import { noBreakHyphens } from '@/lib/format';
import styles from './SiteHeader.module.css';

/** The static page being shown; the landing page passes nothing. */
export type SitePage = 'case-study';

const study = caseStudies[0];

/** Shown in the landing header once the visitor is reading the résumé. */
const contacts: { href: string; label: string; icon: IconName }[] = [
  { href: `mailto:${profile.email}`, label: 'Email', icon: 'mail' },
  { href: profile.links.linkedin, label: 'LinkedIn', icon: 'linkedin' },
  { href: profile.links.github, label: 'GitHub', icon: 'github' },
];

function DownloadResume() {
  return (
    <a
      href={RESUME_PDF}
      download={`${profile.name.replaceAll(' ', '-')}-Resume.pdf`}
      className={styles.cta}
    >
      <Icon name="download" />
      <span className={styles.long}>Download résumé</span>
      <span className={styles.short} aria-hidden="true">
        Résumé
      </span>
    </a>
  );
}

function Brand({ href }: { href: string }) {
  const content = (
    <>
      <span className={styles.monogram} aria-hidden="true">
        {profile.monogram}
      </span>
      <span>{noBreakHyphens(profile.name)}</span>
    </>
  );
  // On the landing page the brand is an in-page link back to the top (`#top` needs no
  // element: browsers scroll to the top of the document).
  return href.startsWith('#') ? (
    <a href={href} className={styles.brand}>
      {content}
    </a>
  ) : (
    <Link href={href} className={styles.brand}>
      {content}
    </Link>
  );
}

/**
 * The landing page's header is one sticky bar for the whole page: transparent at the
 * top, frosted once anything scrolls under it, with contact icons and a reading-progress
 * line while the résumé is in view (CSS scroll timelines, see SiteHeader.module.css).
 */
export function SiteHeader({ current }: { current?: SitePage }) {
  if (!current) {
    return (
      <header className={styles.bar}>
        <div className={`${styles.header} ${styles.landing}`}>
          <Brand href="#top" />
          <div className={styles.actions}>
            <div className={styles.more}>
              {contacts.map((c) => {
                const LinkTag = c.href.startsWith('mailto:') ? 'a' : ExternalLink;
                return (
                  <LinkTag key={c.href} href={c.href} className={styles.iconLink}>
                    <Icon name={c.icon} />
                    <span className="sr-only">{c.label}</span>
                  </LinkTag>
                );
              })}
            </div>
            <DownloadResume />
          </div>
        </div>
        <div className={styles.progress} aria-hidden="true" />
      </header>
    );
  }

  return (
    <header className={`${styles.header} ${styles.pageHeader}`}>
      <Brand href="/" />
      <nav aria-label="Site" className={styles.nav}>
        <PageLink href="/#resume" className={styles.navLink}>
          Résumé
        </PageLink>
        {study && (
          <PageLink
            href={`/work/${study.id}/`}
            className={styles.navLink}
            aria-current={current === 'case-study' ? 'page' : undefined}
          >
            Case study
          </PageLink>
        )}
        <Link href="/" className={styles.ask}>
          <Icon name="chat" size={16} />
          Ask my agent
        </Link>
      </nav>
    </header>
  );
}
