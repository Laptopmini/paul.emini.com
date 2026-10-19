import { Icon } from '@/components/Icon';
import type { CaseStudy } from '@/content';
import styles from './CaseStudyFigure.module.css';
import layout from './layout.module.css';

type Figure = NonNullable<CaseStudy['sections'][number]['figure']>;
type Panel = Figure['panels'][number];

/** A case-study figure, built in HTML from its `figure` content (never an image). */
export function CaseStudyFigure({ figure }: { figure: Figure }) {
  switch (figure.kind) {
    case 'architecture':
      return <Architecture figure={figure} />;
    case 'before-after':
      return <BeforeAfter figure={figure} />;
    case 'rollout':
      return <Rollout figure={figure} />;
  }
}

/** Columns left to right: numbered kicker, then a title box, item boxes or a plain list. */
function Architecture({ figure }: { figure: Figure }) {
  return (
    <figure className={`${layout.card} ${styles.architecture}`}>
      <div className={styles.columns}>
        {figure.panels.map((panel, i) => (
          <div key={panel.kicker ?? i} className={styles.column}>
            {panel.kicker && (
              <p className={layout.mono}>
                {i + 1} · {panel.kicker}
              </p>
            )}
            <ArchitecturePanel panel={panel} />
          </div>
        ))}
      </div>
      {figure.caption && <figcaption className={styles.caption}>{figure.caption}</figcaption>}
    </figure>
  );
}

function ArchitecturePanel({ panel }: { panel: Panel }) {
  const items = panel.items ?? [];
  if (panel.title) {
    return (
      <div className={`${styles.box} ${styles.inkBox}`}>
        <strong className={styles.boxTitle}>{panel.title}</strong>
        {panel.note && <span className={styles.boxNote}>{panel.note}</span>}
      </div>
    );
  }
  if (items.every((item) => !item.note)) {
    return (
      <ul className={`${styles.box} ${styles.plainList}`}>
        {items.map((item) => (
          <li key={item.label}>{item.label}</li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={items.length > 3 ? styles.boxGrid : styles.boxStack}>
      {items.map((item) => (
        <li key={item.label} className={`${styles.box} ${styles.tintBox}`}>
          <strong>{item.label}</strong>
          {item.note && <span className={styles.boxNote}>{item.note}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Two cards: the old form (a skeleton, one field flagged) and the new overview. The
 * mocks are decorative; each card's kicker and note carry the meaning.
 */
function BeforeAfter({ figure }: { figure: Figure }) {
  const [before, after] = figure.panels;
  return (
    <figure className={styles.beforeAfter}>
      {/* A swipe row on phones: focusable so keyboard users can scroll it. */}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region (WCAG 2.1.1) */}
      <section className={styles.pair} tabIndex={0} aria-label="Before and after">
        {before && (
          <div className={`${layout.card} ${styles.state}`}>
            {before.kicker && <p className={layout.mono}>{before.kicker}</p>}
            <div className={styles.mock} aria-hidden="true">
              {[40, 30, 50, 35, 44].map((width, i) => (
                <div key={width} className={styles.field}>
                  <span className={styles.fieldLabel} style={{ width: `${width}%` }} />
                  <span
                    className={
                      i === 3 ? `${styles.fieldInput} ${styles.flagged}` : styles.fieldInput
                    }
                  />
                </div>
              ))}
            </div>
            {before.note && <p className={styles.note}>{before.note}</p>}
          </div>
        )}
        {after && <Overview panel={after} />}
      </section>
      {figure.caption && <figcaption className={layout.mono}>{figure.caption}</figcaption>}
    </figure>
  );
}

/** The overview mock: rows marked "Done" count towards the progress bar. */
function Overview({ panel }: { panel: Panel }) {
  const items = panel.items ?? [];
  const done = items.filter((item) => item.note === 'Done').length;
  const next = items.findIndex((item) => item.note !== 'Done');
  return (
    <div className={`${layout.card} ${styles.state} ${styles.after}`}>
      {panel.kicker && <p className={`${layout.mono} ${styles.afterKicker}`}>{panel.kicker}</p>}
      <div className={styles.mock} aria-hidden="true">
        {panel.title && <strong className={styles.mockTitle}>{panel.title}</strong>}
        <div className={styles.progress}>
          <span
            className={styles.progressBar}
            style={{ width: `${(done / Math.max(1, items.length)) * 100}%` }}
          />
        </div>
        {items.map((item, i) => (
          <div
            key={item.label}
            className={[
              styles.row,
              item.note === 'Done' && styles.done,
              i === next && styles.next,
              i > next && next >= 0 && styles.todo,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span>{item.label}</span>
            <span className={styles.rowState}>{item.note}</span>
          </div>
        ))}
      </div>
      {panel.note && <p className={styles.note}>{panel.note}</p>}
    </div>
  );
}

/** An <ol> stepper: horizontal with connectors from 700px, vertical below; the last step is checked. */
function Rollout({ figure }: { figure: Figure }) {
  return (
    <figure className={styles.rollout}>
      <ol aria-label="Release stages" className={styles.stages}>
        {figure.panels.map((stage, i) => {
          const last = i === figure.panels.length - 1;
          return (
            <li key={stage.title ?? i} className={last ? styles.lastStage : undefined}>
              <span className={styles.marker} aria-hidden="true">
                {last ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
              </span>
              <strong>{stage.title}</strong>
              {stage.note && <span className={styles.stageNote}>{stage.note}</span>}
            </li>
          );
        })}
      </ol>
      {figure.caption && <figcaption className={layout.mono}>{figure.caption}</figcaption>}
    </figure>
  );
}
