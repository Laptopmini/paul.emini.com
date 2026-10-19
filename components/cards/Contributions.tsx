import { ExternalLink } from '@/components/ExternalLink';
import {
  type Contribution,
  contributionDetail,
  contributionStatus,
  formatDate,
  formatRelative,
} from '@/lib/cards';
import { Card } from './Card';
import s from './cards.module.css';

/** PRs and issues on repos Paul doesn't own, from the daily GitHub cache. */
/** `now` gives relative times ("3 d ago"); without it (static pages), plain dates. */
export function Contributions({ items, now }: { items: Contribution[]; now?: Date }) {
  return (
    <Card as="section" aria-label="Open source contributions" className={s.listCard}>
      {items.length === 0 ? (
        <p className={s.empty}>No public contributions in the last 90 days.</p>
      ) : (
        <ul className={s.list}>
          {items.map((c) => {
            const { status, label } = contributionStatus(c);
            return (
              <li key={c.url} className={s.contribRow}>
                <span className={`${s.status} ${s[status]}`}>{label}</span>
                <div style={{ minWidth: 0 }}>
                  <h3 className={s.contribTitle}>
                    <ExternalLink href={c.url}>{c.title}</ExternalLink>
                  </h3>
                  <p className={s.mono} style={{ margin: '2px 0 0' }}>
                    {contributionDetail(c)}
                  </p>
                </div>
                <time className={s.mono} dateTime={c.updatedAt}>
                  {now ? formatRelative(c.updatedAt, now) : formatDate(c.updatedAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
