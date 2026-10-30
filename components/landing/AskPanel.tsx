'use client';

import type { Persona } from '@/content';
import { preloadChat, startChat } from '@/lib/chat-store';
import { usePersona } from '@/lib/persona-store';
import styles from './AskPanel.module.css';
import { ChatDock } from './ChatDock';
import { ASK_ID, ASK_INPUT_ID } from './copy';
import { PersonaToggle } from './PersonaToggle';
import { PromptPills } from './PromptPills';
import { ReadLink } from './ReadLink';

export function AskPanel({
  personas,
  defaultPersona,
}: {
  personas: Pick<Persona, 'id' | 'label' | 'hint' | 'prompts'>[];
  defaultPersona: Persona['id'];
}) {
  const [personaId, setPersona] = usePersona(
    personas.map((p) => p.id),
    defaultPersona,
  );
  const persona = personas.find((p) => p.id === personaId) ?? personas[0];

  const ask = (prompt: string) => startChat(prompt);

  if (!persona) return null;

  return (
    <section
      id={ASK_ID}
      aria-label="Ask the agent"
      className={styles.section}
      onFocus={preloadChat}
      onPointerEnter={preloadChat}
    >
      <div className={styles.inner}>
        <PersonaToggle personas={personas} selected={persona} onSelect={setPersona} />
        <PromptPills prompts={persona.prompts} onPick={ask} />
        <ChatDock onSubmit={ask} inputId={ASK_INPUT_ID} />
        <div className={styles.foot}>
          <p className={styles.disclaimer}>
            AI answers from my résumé and GitHub. It can make mistakes.
          </p>
          <span className={styles.rule} aria-hidden="true" />
          <ReadLink />
        </div>
      </div>
    </section>
  );
}
