import { ExternalLink } from '@/components/ExternalLink';
import { Icon } from '@/components/Icon';
import type { CaseStudy, Mention } from '@/content';
import { formatYearMonth } from '@/lib/format';
import { asset } from '@/lib/paths';
import { Card } from './Card';
import s from './cards.module.css';

/**
 * A case study in the chat: what it is and a link to the full write-up. Opens in a new
 * tab so the conversation stays where it is.
 */
export function CaseStudyCard({
  study,
  company,
  mention,
}: {
  study: CaseStudy;
  company?: string;
  mention?: Mention;
}) {
  return (
    <Card tone="dark">
      <span className={`${s.mono} ${s.upper} ${s.onInkMuted}`}>
        Case study · {company} · {formatYearMonth(study.start)} – {formatYearMonth(study.end)}
      </span>
      <h3 className={`${s.title} ${s.titleMd}`}>{study.title}</h3>
      <p className={`${s.body} ${s.onInkBody}`}>{study.summary}</p>
      {mention && (
        <p className={`${s.mono} ${s.onInkMuted}`}>
          Named in a launch post by the {mention.authorTitle}
        </p>
      )}
      <ExternalLink href={asset(`/work/${study.id}/`)} className={`${s.textLink} ${s.onInkLink}`}>
        Read the case study
        <Icon name="arrowUpRight" size={16} />
      </ExternalLink>
    </Card>
  );
}
