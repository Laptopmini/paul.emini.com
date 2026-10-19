import type { CaseStudy } from '@/content';
import { CountUp } from './CountUp';
import styles from './StatTiles.module.css';

type Stat = NonNullable<CaseStudy['stats']>[number];

function StatLabel({ stat, variant }: { stat: Stat; variant: 'tiles' | 'teaser' }) {
  if (variant === 'teaser') return stat.shortLabel ?? stat.label;
  if (!stat.shortLabel) return stat.label;
  return (
    <>
      <span className={styles.long}>{stat.label}</span>
      <span className={styles.short} aria-hidden="true">
        {stat.shortLabel}
      </span>
    </>
  );
}

/**
 * Case-study stats as a <dl>. `tiles`: one card each, the last inverted, short labels on
 * phones. `teaser`: a ruled row inside the ink card on /resume, short labels throughout.
 */
export function StatTiles({ stats, variant }: { stats: Stat[]; variant: 'tiles' | 'teaser' }) {
  return (
    <dl className={styles[variant]}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={variant === 'tiles' && i === stats.length - 1 ? styles.inverted : undefined}
        >
          <dt>
            <StatLabel stat={s} variant={variant} />
          </dt>
          <dd>
            <CountUp value={s.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
