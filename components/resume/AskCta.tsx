import { Icon } from '@/components/Icon';
import { AskLink } from '@/components/landing/AskLink';
import { profile } from '@/lib/content';
import { COPY } from './copy';
import layout from './layout.module.css';

/** "Rather just ask?": the hand-off back to the agent at the end of the résumé. */
export function AskCta() {
  return (
    <section aria-labelledby="ask-cta" className={layout.cta} data-ask-cta>
      <div>
        <h2 id="ask-cta" className={layout.ctaTitle}>
          {COPY.ctaTitle}
        </h2>
        <p className={layout.ctaText}>{COPY.ctaText}</p>
      </div>
      <div className={layout.ctaActions}>
        <a href={`mailto:${profile.email}`} className={layout.ctaGhost}>
          <Icon name="mail" size={16} /> {COPY.emailMe}
        </a>
        <AskLink className={layout.ctaButton}>
          {COPY.askAgent} <Icon name="send" size={16} />
        </AskLink>
      </div>
    </section>
  );
}
