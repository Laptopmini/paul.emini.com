import styles from './chat.module.css';

export function FollowUps({
  questions,
  onPick,
  disabled = false,
}: {
  questions: string[];
  onPick: (question: string) => void;
  disabled?: boolean;
}) {
  if (questions.length === 0) return null;
  return (
    <ul className={styles.followUps} aria-label="Follow-up questions">
      {questions.map((q) => (
        <li key={q}>
          <button
            type="button"
            className={styles.pill}
            aria-disabled={disabled}
            onClick={() => !disabled && onPick(q)}
          >
            {q}
          </button>
        </li>
      ))}
    </ul>
  );
}
