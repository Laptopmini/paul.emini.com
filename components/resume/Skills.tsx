import { skills } from '@/lib/content';
import layout from './layout.module.css';
import styles from './resume.module.css';

/** One card per group, all at the same height; featured skills first. */
export function Skills() {
  return (
    <section aria-labelledby="skills" className={layout.section}>
      <h2 id="skills" className={layout.h2}>
        Skills
      </h2>
      <dl className={styles.skills}>
        {skills.map((g) => (
          <div key={g.id} className={layout.card}>
            <dt>{g.label}</dt>
            <dd>
              {[...g.featured, ...g.items.filter((s) => !g.featured.includes(s))].map((s) => (
                <span key={s} className={layout.chip}>
                  {s}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
