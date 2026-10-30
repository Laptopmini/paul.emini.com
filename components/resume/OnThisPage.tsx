import { Icon } from '@/components/Icon';
import styles from './layout.module.css';

export type PageSection = { id: string; label: string };

const number = (i: number) => String(i + 1).padStart(2, '0');

/**
 * Section links for the résumé and /work/*. Plain #anchors, so they work without JS;
 * ScrollSpy marks the section in view with aria-current. The rail shows from 1100px,
 * the tab strip or picker below it (CSS swaps them; `className` can move the switch).
 */
export function OnThisPage({
  sections,
  variant,
  note,
  className,
}: {
  sections: PageSection[];
  variant: 'rail' | 'tabs' | 'picker';
  /** Mono line under the rail, e.g. the reading time. */
  note?: string;
  className?: string;
}) {
  const links = (
    <ol className={styles.tocList}>
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`}>
            {variant === 'rail' && <span className={styles.tocNumber}>{number(i)}</span>}
            {s.label}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variant === 'picker') {
    const first = sections[0];
    return (
      <details className={styles.picker} data-spy-picker>
        <summary>
          <span>
            <span className={styles.mono} data-spy-index>
              {number(0)} / {number(sections.length - 1)} ·{' '}
            </span>
            <strong data-spy-label>{first?.label}</strong>
          </span>
          <span className={styles.chevron}>
            <Icon name="chevronDown" />
          </span>
        </summary>
        <nav aria-label="On this page" data-spy>
          {links}
        </nav>
      </details>
    );
  }

  return (
    <nav
      aria-label="On this page"
      className={[variant === 'rail' ? styles.rail : styles.tabs, className]
        .filter(Boolean)
        .join(' ')}
      data-spy
    >
      {variant === 'rail' && <p className={styles.mono}>On this page</p>}
      {links}
      {note && <p className={styles.mono}>{note}</p>}
    </nav>
  );
}
