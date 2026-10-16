'use client';

import { useId, useState } from 'react';
import type { Certification } from '@/content';
import { splitCertifications } from '@/lib/cards';
import { formatYearMonth } from '@/lib/format';
import { Card } from './Card';
import s from './cards.module.css';

export function Certifications({
  items,
  visible = 4,
}: {
  items: Certification[];
  visible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const { shown, hidden, summary } = splitCertifications(items, visible);
  const rows = expanded ? [...shown, ...hidden] : shown;

  return (
    <Card as="section" aria-label="Certifications" className={s.listCard}>
      <ul className={s.list} id={listId}>
        {rows.map((c) => (
          <li key={c.id} className={s.certRow}>
            <h3 className={s.certName}>{c.name}</h3>
            <p className={s.certMeta}>
              {c.issuer} · {formatYearMonth(c.issued)}
            </p>
          </li>
        ))}
      </ul>
      {summary && (
        <button
          type="button"
          className={s.linkButton}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show fewer' : summary}
        </button>
      )}
    </Card>
  );
}
