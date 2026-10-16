import type { Experience } from '@/content';
import { formatYearRange } from '@/lib/format';
import { Card } from './Card';
import s from './cards.module.css';

/** A list of roles. "Details" asks for the expanded card (wired to the agent in Phase 5). */
export function ExperienceTimeline({
  items,
  onDetails,
}: {
  items: Experience[];
  onDetails?: (id: string) => void;
}) {
  return (
    <Card as="section" aria-label="Experience" className={s.listCard}>
      <ol className={s.list}>
        {items.map((e) => (
          <li key={e.id} className={s.timelineRow}>
            <span className={s.mono} style={{ fontSize: 13 }}>
              {formatYearRange(e.start, e.end)}
            </span>
            <div>
              <h3 className={s.company}>{e.company}</h3>
              <p className={s.role}>{e.title}</p>
            </div>
            {onDetails && (
              <button type="button" className={s.linkButton} onClick={() => onDetails(e.id)}>
                Details<span className="sr-only"> about {e.company}</span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
