'use client';

import { ExternalLink } from '@/components/ExternalLink';
import { Icon } from '@/components/Icon';
import { PersonaToggle } from '@/components/landing/PersonaToggle';
import { type Persona, type PersonaId, profile } from '@/content';
import { showLanding } from '@/lib/chat-store';
import { noBreakHyphens } from '@/lib/format';
import { asset } from '@/lib/paths';
import styles from './chat.module.css';

export function ChatHeader({
  personas,
  persona,
  onPersona,
}: {
  personas: Pick<Persona, 'id' | 'label' | 'hint'>[];
  persona: PersonaId;
  onPersona: (id: PersonaId) => void;
}) {
  const selected = personas.find((p) => p.id === persona) ?? personas[0];
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a
          href={asset('/')}
          className={styles.brand}
          onClick={(event) => {
            event.preventDefault();
            showLanding();
          }}
        >
          <span className={styles.monogram} aria-hidden="true">
            {profile.monogram}
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>
              <span className={styles.nameFull}>{noBreakHyphens(profile.name)}</span>
              <span className={styles.nameShort} aria-hidden="true">
                {noBreakHyphens(profile.firstName)}
              </span>
            </span>
            <span className={styles.brandSub}>
              {profile.title} · {profile.location.city}
            </span>
          </span>
          <span className="sr-only">, back to the home page</span>
        </a>
        {selected && (
          <div className={styles.persona}>
            <PersonaToggle
              variant="compact"
              personas={personas}
              selected={selected}
              onSelect={onPersona}
            />
          </div>
        )}
        <nav aria-label="Contact" className={styles.contact}>
          <a
            href={`mailto:${profile.email}`}
            className={styles.iconLink}
            aria-label={`Email ${profile.email}`}
          >
            <Icon name="mail" size={20} />
          </a>
          <ExternalLink
            href={profile.links.linkedin}
            className={styles.iconLink}
            aria-label="LinkedIn"
          >
            <Icon name="linkedin" size={20} />
          </ExternalLink>
          <a
            href={asset('/resume.pdf')}
            download={`${profile.name.replaceAll(' ', '-')}-Resume.pdf`}
            className={styles.resume}
          >
            <Icon name="download" size={16} />
            <span className={styles.resumeLabel}>Résumé</span>
            <span className="sr-only">Download résumé</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
