import type { ReactNode } from 'react';
import { SiteHeader, type SitePage } from '@/components/landing/SiteHeader';
import styles from './layout.module.css';

/** Sticky top bar: site header, the phone section nav, and the reading progress. */
export function PageTop({ current, children }: { current: SitePage; children?: ReactNode }) {
  return (
    <div className={styles.top}>
      <SiteHeader current={current} />
      {children}
      <div className={styles.progress} aria-hidden="true" />
    </div>
  );
}
