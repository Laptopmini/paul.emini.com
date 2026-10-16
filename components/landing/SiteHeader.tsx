import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { profile, RESUME_PDF } from '@/lib/content';
import { noBreakHyphens } from '@/lib/format';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <span className={styles.monogram} aria-hidden="true">
          {profile.monogram}
        </span>
        <span>{noBreakHyphens(profile.name)}</span>
      </Link>
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
    </header>
  );
}
