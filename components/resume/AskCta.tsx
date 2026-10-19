import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { COPY } from './copy';
import layout from './layout.module.css';

/** "Rather just ask?": the hand-off to the agent at the end of /resume. */
export function AskCta() {
  return (
    <aside aria-labelledby="ask-cta" className={layout.cta}>
      <div>
        <p id="ask-cta" className={layout.ctaTitle}>
          {COPY.ctaTitle}
        </p>
        <p className={layout.ctaText}>{COPY.ctaText}</p>
      </div>
      <Link href="/" className={layout.ctaButton}>
        {COPY.askAgent} <Icon name="arrowUpRight" size={16} />
      </Link>
    </aside>
  );
}
