import { Icon } from '@/components/Icon';
import type { Education as EducationEntry, Experience } from '@/content';
import { Card } from './Card';
import s from './cards.module.css';

export function Education({
  education,
  capstone,
}: {
  education: EducationEntry;
  /** The experience referenced by `capstoneExperienceId`, if any. */
  capstone?: Experience;
}) {
  return (
    <Card>
      <div className={s.row}>
        <span className={s.tile}>
          <Icon name="graduation" size={24} />
        </span>
        <div>
          <h3 className={`${s.title} ${s.titleMd}`}>{education.degree}</h3>
          <p className={s.school}>{education.school}</p>
          {capstone && (
            <p className={`${s.mono} ${s.upper}`} style={{ margin: '10px 0 0' }}>
              Capstone · {capstone.shortName ?? capstone.company} ·{' '}
              {(capstone.end ?? capstone.start).slice(0, 4)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
