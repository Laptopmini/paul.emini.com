import { Icon } from '@/components/Icon';
import type { Award as AwardEntry } from '@/content';
import { formatYearMonth } from '@/lib/format';
import { Card } from './Card';
import s from './cards.module.css';

export function Award({ award }: { award: AwardEntry }) {
  return (
    <Card tone="dark">
      <div className={s.restingHead} style={{ gap: 12 }}>
        <span className={s.awardBadge}>
          <Icon name="medal" size={22} />
        </span>
        <span className={`${s.mono} ${s.upper} ${s.onInkMuted}`}>
          {award.issuer} · {formatYearMonth(award.received)}
        </span>
      </div>
      <h3 className={s.title}>{award.name}</h3>
      <p className={`${s.body} ${s.onInkBody}`}>{award.blurb}</p>
    </Card>
  );
}
