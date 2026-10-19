import { ExternalLink } from '@/components/ExternalLink';
import { Icon } from '@/components/Icon';
import type { Mention } from '@/content';
import { formatDate } from '@/lib/cards';
import styles from './caseStudy.module.css';

/**
 * A public mention as a full-width ink quote: the first quote large, the rest with the
 * attribution. Their words verbatim, labelled as a mention.
 */
export function MentionPanel({ mention: m }: { mention: Mention }) {
  const [lead, ...rest] = m.quotes;
  return (
    <figure className={styles.mentionPanel}>
      <blockquote cite={m.url} className={styles.mentionQuote}>
        <p>“{lead}”</p>
      </blockquote>
      <figcaption className={styles.mentionCaption}>
        {rest.map((q) => (
          <p key={q.slice(0, 40)}>“{q}”</p>
        ))}
        <span>
          <strong>{m.author}</strong>, {m.authorTitle} · {formatDate(m.date)}
        </span>
        <ExternalLink href={m.url} className={styles.mentionLink}>
          View the LinkedIn post <Icon name="arrowUpRight" size={16} />
        </ExternalLink>
      </figcaption>
    </figure>
  );
}
