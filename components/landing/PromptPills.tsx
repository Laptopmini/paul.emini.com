import styles from './PromptPills.module.css';

export function PromptPills({
  prompts,
  onPick,
}: {
  prompts: string[];
  onPick: (prompt: string) => void;
}) {
  return (
    <ul className={styles.pills} aria-label="Suggested questions">
      {prompts.map((prompt) => (
        <li key={prompt}>
          <button type="button" className={styles.pill} onClick={() => onPick(prompt)}>
            {prompt}
          </button>
        </li>
      ))}
    </ul>
  );
}
