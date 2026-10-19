import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { PageLink } from '@/components/resume/PageLink';
import { caseStudies, profile, RESUME_PDF } from '@/lib/content';
import { noBreakHyphens } from '@/lib/format';
import styles from './SiteHeader.module.css';

/** The static page being shown; the landing page passes nothing. */
export type SitePage = 'resume' | 'case-study';

const study = caseStudies[0];

export function SiteHeader({ current }: { current?: SitePage }) {
  return (
    <header className={current ? `${styles.header} ${styles.pageHeader}` : styles.header}>
      <Link href="/" className={styles.brand}>
        <span className={styles.monogram} aria-hidden="true">
          {profile.monogram}
        </span>
        <span>{noBreakHyphens(profile.name)}</span>
      </Link>
      {current ? (
        <nav aria-label="Site" className={styles.nav}>
          <PageLink
            href="/resume/"
            className={styles.navLink}
            aria-current={current === 'resume' ? 'page' : undefined}
          >
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
      ) : (
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
      )}
    </header>
  );
}
