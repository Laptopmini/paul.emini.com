'use client';

import type { Persona } from '@/content';
import { usePersona } from '@/lib/persona-store';
import styles from './AskPanel.module.css';
import { ChatDock } from './ChatDock';
import { PersonaToggle } from './PersonaToggle';
import { PromptPills } from './PromptPills';

export function AskPanel({
  personas,
  defaultPersona,
}: {
  personas: Persona[];
  defaultPersona: Persona['id'];
}) {
  const [personaId, setPersona] = usePersona(
    personas.map((p) => p.id),
    defaultPersona,
  );
  const persona = personas.find((p) => p.id === personaId) ?? personas[0];

  // Phase 5 connects this to the agent and the landing → chat view transition.
  const ask = (_prompt: string) => {};

  if (!persona) return null;

  return (
    <section aria-label="Ask the agent" className={styles.section}>
      <div className={styles.inner}>
        <PersonaToggle personas={personas} selected={persona} onSelect={setPersona} />
        <PromptPills prompts={persona.prompts} onPick={ask} />
        <ChatDock onSubmit={ask} />
        <p className={styles.disclaimer}>
          An AI agent that only talks about Paul’s career, from his résumé and public GitHub — it
          can make mistakes.
        </p>
      </div>
    </section>
  );
}
