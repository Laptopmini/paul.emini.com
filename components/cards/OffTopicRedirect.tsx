import { Card } from './Card';
import s from './cards.module.css';

export type Suggestion = { label: string; prompt: string };

/** Canned reply for off-topic prompts: no model call, just a nudge back on topic. */
export function OffTopicRedirect({
  suggestions,
  onPick,
}: {
  suggestions: Suggestion[];
  onPick: (prompt: string) => void;
}) {
  return (
    <Card>
      <p className={s.body}>
        I’m here to talk about my work and background, so I’ll leave that one there. Here’s what I
        can help with:
      </p>
      <ul className={s.pills} aria-label="Suggested questions">
        {suggestions.map((sg) => (
          <li key={sg.label}>
            <button type="button" className={s.pill} onClick={() => onPick(sg.prompt)}>
              {sg.label}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
