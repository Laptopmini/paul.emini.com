import { type FormEvent, type Ref, useId, useState } from 'react';
import { Icon } from '@/components/Icon';
import { MAX_PROMPT_LENGTH } from '@/shared/constants';
import styles from './ChatDock.module.css';
import { DOCK_PLACEHOLDER } from './copy';

export function ChatDock({
  onSubmit,
  label = 'Ask Paul’s agent',
  placeholder = DOCK_PLACEHOLDER,
  busy = false,
  className,
  inputRef,
}: {
  onSubmit: (prompt: string) => void;
  label?: string;
  placeholder?: string;
  /** While the agent answers: typing is allowed, sending waits. */
  busy?: boolean;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const inputId = useId();
  const counterId = useId();
  const [value, setValue] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = value.trim();
    if (!prompt || busy) return;
    onSubmit(prompt);
    setValue('');
  };

  return (
    <form
      className={className ? `${styles.dock} ${className}` : styles.dock}
      onSubmit={handleSubmit}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        maxLength={MAX_PROMPT_LENGTH}
        autoComplete="off"
        placeholder={placeholder}
        aria-describedby={counterId}
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <span id={counterId} className={styles.counter} data-empty={value.length === 0}>
        <span className="sr-only">Characters used: </span>
        {value.length}/{MAX_PROMPT_LENGTH}
      </span>
      <button type="submit" aria-label="Send" aria-disabled={busy} className={styles.send}>
        <Icon name="send" size={20} strokeWidth={2.2} />
      </button>
    </form>
  );
}
