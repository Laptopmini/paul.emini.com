import type { Experience } from '@/content';
import { currentYearMonth, formatDuration, formatMonthRange } from '@/lib/cards';
import { Card } from './Card';
import s from './cards.module.css';

/** A single role, expanded: curated `short` bullets and card tags. */
export function ExperienceCard({ experience, now }: { experience: Experience; now?: Date }) {
  const end = experience.end ?? currentYearMonth(now ?? new Date());
  return (
    <Card>
      <div className={s.expHead}>
        <div>
          <h3 className={`${s.title} ${s.titleLg}`}>{experience.company}</h3>
          <p className={s.expRole}>
            {experience.title} · {experience.location}
          </p>
        </div>
        <span className={s.dateChip}>
          {formatMonthRange(experience.start, experience.end)} ·{' '}
          {formatDuration(experience.start, end)}
        </span>
      </div>
      <ul className={s.bullets}>
        {experience.highlights.map((h) => (
          <li key={h.label}>{h.short}</li>
        ))}
      </ul>
      <ul className={s.tags} aria-label="Tech stack">
        {experience.tags.map((t) => (
          <li key={t} className={s.tag}>
            {t}
          </li>
        ))}
      </ul>
    </Card>
  );
}
