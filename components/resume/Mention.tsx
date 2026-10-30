import type { CSSProperties } from 'react';
import { Card } from '@/components/cards';
import s from '@/components/cards/cards.module.css';
import { ExternalLink } from '@/components/ExternalLink';
import type { Mention as MentionEntry } from '@/content';
import { formatDate } from '@/lib/cards';
import styles from './resume.module.css';

/**
 * A public credit in someone else's post: their words, verbatim, attributed to them.
 * Labelled as a mention (not a recommendation), because that's what it is.
 */
export function Mention({
  mention: m,
  className,
  style,
}: {
  mention: MentionEntry;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Card as="figure" className={`${styles.mention} ${className ?? ''}`} style={style}>
      <p className={s.mono}>Public mention</p>
      <blockquote className={s.quote} cite={m.url}>
        {m.quotes.map((q) => (
          <p key={q.slice(0, 40)}>“{q}”</p>
        ))}
      </blockquote>
      <figcaption className={styles.mentionCaption}>
        <strong>{m.author}</strong>, {m.authorTitle} · {formatDate(m.date)} ·{' '}
        <ExternalLink href={m.url} className={s.inlineLink}>
          LinkedIn post
        </ExternalLink>
      </figcaption>
    </Card>
  );
}
