import type { CSSProperties } from 'react';
import { experience, projects } from '@/lib/content';
import { buildStrata } from '@/lib/strata';
import styles from './TimelineStrata.module.css';

// Resting horizontal offsets (px) and parallax depth per row, from Main.dc.html.
const OFFSETS = [-24, -8, 8, 24];
const DEPTHS = [8, 20, 32, 44];

export function TimelineStrata() {
  const strata = buildStrata(projects, experience);

  return (
    <ol className={styles.strata} aria-label="Recent timeline">
      {strata.map((s, i) => (
        <li
          key={s.key}
          className={`${styles.item} ${styles[s.kind]}`}
          style={{ '--x': `${OFFSETS[i] ?? 0}px`, '--depth': DEPTHS[i] ?? 0 } as CSSProperties}
        >
          {s.kind === 'earlier' ? (
            <>
              <span className={styles.eyebrow}>{s.eyebrow}</span>
              <span className={styles.detail}>{s.detail}</span>
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
        </li>
      ))}
    </ol>
  );
}
