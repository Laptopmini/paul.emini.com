import type { CSSProperties } from 'react';
import { StatusPill } from '@/components/resume/StatusPill';
import { experience, github, projects } from '@/lib/content';
import { buildStrata, latestContribution } from '@/lib/strata';
import styles from './TimelineStrata.module.css';

// Left offsets (px) from the top row down; the dashed "earlier" row always sits at the
// deepest one. Drift (px) as the first screen scrolls away, from the bottom row up.
const OFFSETS = [0, 12, 24, 36, 48];
const DRIFT = [0, -12, -32, -56, -80];

export function TimelineStrata() {
  // Rendered at build: the daily GitHub refresh rebuilds the site.
  const strata = buildStrata(
    projects,
    experience,
    latestContribution(github.contributions, new Date()),
  );

  return (
    <ol className={styles.strata} aria-label="Recent timeline">
      {strata.map((s, i) => (
        <li
          key={s.key}
          className={`${styles.item} ${styles[s.kind]}`}
          style={
            {
              '--x': `${s.kind === 'earlier' ? OFFSETS.at(-1) : (OFFSETS[i] ?? 0)}px`,
              '--drift': `${DRIFT[strata.length - 1 - i] ?? 0}px`,
            } as CSSProperties
          }
        >
          <a href={s.href} className={styles.link}>
            {s.kind === 'earlier' ? (
              <>
                <span className={styles.eyebrow}>{s.eyebrow}</span>
                <span className={styles.detail}>{s.detail}</span>
              </>
            ) : s.kind === 'live' ? (
              <>
                <span className={styles.liveText}>
                  <span className={styles.eyebrow}>{s.eyebrow}</span>
                  <span className={styles.repo}>{s.title}</span>
                </span>
                <StatusPill {...s.pill} className={styles.pill} />
              </>
            ) : (
              <>
                <span>
                  <span className={styles.eyebrow}>{s.eyebrow}</span>
                  <span className={styles.title}>{s.title}</span>
                </span>
                <span className={styles.detail}>{s.detail}</span>
              </>
            )}
          </a>
        </li>
      ))}
    </ol>
  );
}
