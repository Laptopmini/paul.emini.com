'use client';

import { type HTMLAttributes, useId, useState } from 'react';
import { ExternalLink } from '@/components/ExternalLink';
import type { Recommendation as RecommendationEntry } from '@/content';
import { initials, markExcerpt, pickExcerpt } from '@/lib/cards';
import { formatYearMonth } from '@/lib/format';
import { Card } from './Card';
import s from './cards.module.css';

/**
 * A recommendation with the excerpt the agent picked for the question. The excerpt is
 * only shown if it's verbatim from the source; the full text expands inline.
 * `highlight` (the /resume carousel) shows the full text from the start, with the
 * excerpt marked in place.
 */
export function Recommendation({
  recommendation: r,
  excerpt,
  highlight = false,
  ...rest
}: {
  recommendation: RecommendationEntry;
  excerpt?: string;
  highlight?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>) {
  const [expanded, setExpanded] = useState(false);
  const fullId = useId();
  const paragraphs = r.body.split(/\n\s*\n/);

  return (
    <Card as="figure" {...rest}>
      {highlight ? (
        <blockquote className={s.fullQuote} cite={r.linkedin}>
          {markExcerpt(r, excerpt).map((p, i) =>
            typeof p === 'string' ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: static text, never reordered
              <p key={i}>{p}</p>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: static text, never reordered
              <p key={i}>
                {p.before}
                <mark className={s.mark}>{p.mark}</mark>
                {p.after}
              </p>
            ),
          )}
        </blockquote>
      ) : (
        <>
          <blockquote className={s.quote} cite={r.linkedin}>
            <p>“{pickExcerpt(r, excerpt)}”</p>
          </blockquote>
          {expanded && (
            <div id={fullId} className={s.fullText}>
              {paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className={s.body}>
                  {p}
                </p>
              ))}
            </div>
          )}
          <button
            type="button"
            className={s.linkButton}
            aria-expanded={expanded}
            aria-controls={fullId}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Show less' : 'Read the full recommendation'}
          </button>
        </>
      )}
      <figcaption className={s.caption}>
        <span className={s.avatar} aria-hidden="true">
          {initials(r.name)}
        </span>
        <div>
          <div className={s.person}>
            <ExternalLink href={r.linkedin}>
              {r.name}
              <span className="sr-only"> on LinkedIn</span>
            </ExternalLink>
          </div>
          <p className={s.personMeta}>
            {r.title}, {r.company} · {r.relationship} · {formatYearMonth(r.date.slice(0, 7))}
          </p>
        </div>
      </figcaption>
    </Card>
  );
}
