import { AskPanel } from '@/components/landing/AskPanel';
import { Hero } from '@/components/landing/Hero';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { TimelineStrata } from '@/components/landing/TimelineStrata';
import { DEFAULT_PERSONA, personas } from '@/lib/content';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.hero}>
          <Hero />
          <TimelineStrata />
        </div>
      </main>
      <AskPanel personas={personas} defaultPersona={DEFAULT_PERSONA} />
    </div>
  );
}
