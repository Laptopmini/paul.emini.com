'use client';

import { useId, useState } from 'react';
import { ExternalLink } from '@/components/ExternalLink';
import type { Recommendation as RecommendationEntry } from '@/content';
import { initials, pickExcerpt } from '@/lib/cards';
import { formatYearMonth } from '@/lib/format';
import { Card } from './Card';
import s from './cards.module.css';

/**
 * A recommendation with the excerpt the agent picked for the question. The excerpt is
 * only shown if it's verbatim from the source; the full text expands inline.
 */
export function Recommendation({
  recommendation: r,
  excerpt,
}: {
  recommendation: RecommendationEntry;
  excerpt?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const fullId = useId();
  const quote = pickExcerpt(r, excerpt);
  const paragraphs = r.body.split(/\n\s*\n/);

  return (
    <Card as="figure">
      <blockquote className={s.quote} cite={r.linkedin}>
        <p>“{quote}”</p>
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
