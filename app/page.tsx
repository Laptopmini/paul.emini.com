import { ChatShell } from '@/components/ChatShell';
import { AskPanel } from '@/components/landing/AskPanel';
import { Hero } from '@/components/landing/Hero';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { TimelineStrata } from '@/components/landing/TimelineStrata';
import { DEFAULT_PERSONA, personas } from '@/lib/content';
import styles from './page.module.css';

// Agent guidance stays server-side; the landing only needs what it shows.
const personaOptions = personas.map(({ id, label, hint, prompts }) => ({
  id,
  label,
  hint,
  prompts,
}));

export default function Home() {
  return (
    <ChatShell>
      <div className={styles.page}>
        <SiteHeader />
        <main className={styles.main}>
          <div className={styles.hero}>
            <Hero />
            <TimelineStrata />
          </div>
        </main>
        <AskPanel personas={personaOptions} defaultPersona={DEFAULT_PERSONA} />
      </div>
    </ChatShell>
  );
}
