import type { Persona } from '@/content';
import styles from './PersonaToggle.module.css';

const LEAD = 'Answer as if I’m a';

type PersonaOption = Pick<Persona, 'id' | 'label' | 'hint'>;

export function PersonaToggle({
  personas,
  selected,
  onSelect,
  compact = false,
}: {
  personas: PersonaOption[];
  selected: PersonaOption;
  onSelect: (id: Persona['id']) => void;
  /** Chat header: the segmented control only (legend stays for assistive tech). */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <fieldset className={`${styles.track} ${styles.compact}`}>
        <legend className="sr-only">{LEAD}</legend>
        {personas.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === selected.id}
            className={styles.segment}
            onClick={() => onSelect(p.id)}
          >
            {p.label}
          </button>
        ))}
      </fieldset>
    );
  }
  return (
    <div className={styles.row}>
      {/* Visible lead-in; the legend carries the same text for assistive tech. */}
      <span className={styles.lead} aria-hidden="true">
        {LEAD}
      </span>
      <fieldset className={styles.track}>
        <legend className="sr-only">{LEAD}</legend>
        {personas.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === selected.id}
            className={styles.segment}
            onClick={() => onSelect(p.id)}
          >
            {p.label}
          </button>
        ))}
      </fieldset>
      <span className={styles.hint} aria-live="polite">
        {selected.hint}
      </span>
    </div>
  );
}
