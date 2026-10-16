import { type FormEvent, useId, useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './ChatDock.module.css';

export const MAX_PROMPT_LENGTH = 400;

export function ChatDock({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const inputId = useId();
  const counterId = useId();
  const [value, setValue] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = value.trim();
    if (prompt) onSubmit(prompt);
  };

  return (
    <form className={styles.dock} onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="sr-only">
        Ask Paul’s agent
      </label>
      <input
        id={inputId}
        type="text"
        maxLength={MAX_PROMPT_LENGTH}
        autoComplete="off"
        placeholder="What can I help you with today?"
        aria-describedby={counterId}
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <span id={counterId} className={styles.counter} data-empty={value.length === 0}>
        <span className="sr-only">Characters used: </span>
        {value.length}/{MAX_PROMPT_LENGTH}
      </span>
      <button type="submit" aria-label="Send" className={styles.send}>
        <Icon name="send" size={20} strokeWidth={2.2} />
      </button>
    </form>
  );
}
