import { Icon } from '@/components/Icon';
import { certifications, education } from '@/lib/content';
import { formatYearMonth } from '@/lib/format';
import layout from './layout.module.css';
import styles from './resume.module.css';

export function Education() {
  const newestFirst = [...certifications].sort((a, b) => b.issued.localeCompare(a.issued));
  return (
    <section aria-labelledby="education" className={layout.section}>
      <h2 id="education" className={layout.h2}>
        Education &amp; certifications
      </h2>
      {education.map((e) => (
        <div key={e.id} className={`${layout.card} ${styles.degree}`}>
          <span className={styles.degreeIcon}>
            <Icon name="graduation" size={24} />
          </span>
          <div>
            <strong>{e.degree}</strong>
            <p className={styles.school}>{e.school}</p>
          </div>
        </div>
      ))}
      <ol className={styles.certs} aria-label="Certifications, newest first">
        {newestFirst.map((c) => (
          <li key={c.id}>
            <span className={layout.mono}>{formatYearMonth(c.issued)}</span>
            <span>
              <strong>{c.name}</strong>
              <span className={styles.issuer}>{c.issuer}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
