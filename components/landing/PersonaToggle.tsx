import type { Persona } from '@/content';
import styles from './PersonaToggle.module.css';

const LEAD = 'Answer as if I’m a';

type PersonaOption = Pick<Persona, 'id' | 'label' | 'hint'>;

export function PersonaToggle({
  personas,
  selected,
  onSelect,
  variant = 'row',
}: {
  personas: PersonaOption[];
  selected: PersonaOption;
  onSelect: (id: Persona['id']) => void;
  /**
   * `row`: lead-in, control and hint on one line (ask panel). `compact`: the control
   * only, legend kept for assistive tech (chat header). `stacked`: the lead-in above a
   * full-width control with equal segments (the ask button's chat box).
   */
  variant?: 'row' | 'compact' | 'stacked';
}) {
  const segments = personas.map((p) => (
    <button
      key={p.id}
      type="button"
      aria-pressed={p.id === selected.id}
      className={styles.segment}
      onClick={() => onSelect(p.id)}
    >
      {p.label}
    </button>
  ));

  if (variant === 'compact') {
    return (
      <fieldset className={`${styles.track} ${styles.compact}`}>
        <legend className="sr-only">{LEAD}</legend>
        {segments}
      </fieldset>
    );
  }
  if (variant === 'stacked') {
    return (
      <fieldset className={styles.stacked}>
        <legend className={styles.lead}>{LEAD}</legend>
        <div className={`${styles.track} ${styles.full}`}>{segments}</div>
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
        {segments}
      </fieldset>
      <span className={styles.hint} aria-live="polite">
        {selected.hint}
      </span>
    </div>
  );
}
