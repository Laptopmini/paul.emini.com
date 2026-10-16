import { ExternalLink, isExternalHref } from '@/components/ExternalLink';
import { Icon } from '@/components/Icon';
import { Card } from './Card';
import s from './cards.module.css';

/** Shown when the global daily cap is reached; the rest of the site keeps working. */
export function AgentResting({
  email,
  browse,
}: {
  email: string;
  browse: { label: string; href: string }[];
}) {
  return (
    <Card tone="dashed" role="status">
      <div className={s.restingHead}>
        <Icon name="moon" size={22} />
        <h3 className={`${s.title} ${s.titleMd}`}>The agent is resting</h3>
      </div>
      <p className={s.body}>
        It’s answered its share of questions for today. Everything is still here — browse it
        directly, or{' '}
        <a className={s.inlineLink} href={`mailto:${email}`}>
          email Paul
        </a>
        .
      </p>
      <nav aria-label="Browse">
        <ul className={s.pills}>
          {browse.map((b) => {
            const LinkTag = isExternalHref(b.href) ? ExternalLink : 'a';
            return (
              <li key={b.href}>
                <LinkTag className={s.pill} href={b.href}>
                  {b.label}
                </LinkTag>
              </li>
            );
          })}
        </ul>
      </nav>
    </Card>
  );
}
