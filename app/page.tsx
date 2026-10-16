import Link from 'next/link';
import { profile, RESUME_PDF } from '@/lib/content';
import { noBreakHyphens } from '@/lib/format';
import styles from './page.module.css';

// Placeholder landing: content-driven, but the real layout (Main.dc.html) lands in Phase 3.
export default function Home() {
  return (
    <>
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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          Download résumé
        </a>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Hi, I’m
          <br />
          <span className={styles.accent}>{noBreakHyphens(profile.firstName)}.</span>
        </h1>
        <p className={styles.lede}>{`${profile.title} ${profile.tagline}`}</p>
      </main>
    </>
  );
}
