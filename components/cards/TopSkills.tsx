import type { SkillGroup } from '@/content';
import { Card } from './Card';
import s from './cards.module.css';

/** Featured skills per group; skills relevant to the question are highlighted with <mark>. */
export function TopSkills({
  groups,
  highlight = [],
}: {
  groups: SkillGroup[];
  highlight?: string[];
}) {
  const marked = new Set(highlight);
  return (
    <Card as="section" aria-label="Top skills">
      <div className={s.skillsGrid}>
        {groups.map((group) => (
          <div key={group.id}>
            <h3 className={s.groupTitle}>{group.label}</h3>
            <ul className={s.skillList}>
              {group.featured.map((skill) => (
                <li key={skill}>
                  {marked.has(skill) ? (
                    <mark className={s.skill}>{skill}</mark>
                  ) : (
                    <span className={s.skill}>{skill}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
