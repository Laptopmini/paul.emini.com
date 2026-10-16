'use client';

import { useId, useState } from 'react';
import { mailtoHref } from '@/lib/cards';
import { Card } from './Card';
import s from './cards.module.css';

/** Hands the visitor to the real Paul with an editable draft the agent wrote. */
export function ContactHandoff({
  email,
  draft,
  subject = 'Hello from paul.emini.com',
}: {
  email: string;
  draft: string;
  subject?: string;
}) {
  const [text, setText] = useState(draft);
  const [status, setStatus] = useState('');
  const fieldId = useId();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied to clipboard.');
    } catch {
      setStatus('Couldn’t copy. Select the text and copy it instead.');
    }
  };

  return (
    <Card tone="accent">
      <h3 className={`${s.title} ${s.titleMd}`}>Want to talk to the real Paul?</h3>
      <p className={s.body}>I’ve drafted a note with what you asked about — edit it and send.</p>
      <p className={s.draftSubject}>Subject: {subject}</p>
      <label htmlFor={fieldId} className="sr-only">
        Your message to Paul
      </label>
      <textarea
        id={fieldId}
        className={s.draft}
        value={text}
        rows={4}
        onChange={(e) => {
          setText(e.target.value);
          setStatus('');
        }}
      />
      <div className={s.actions}>
        <a className={s.primary} href={mailtoHref(email, subject, text)}>
          Open in email
        </a>
        <button type="button" className={s.secondary} onClick={copy}>
          Copy
        </button>
        <span className={s.copyStatus} role="status">
          {status}
        </span>
      </div>
    </Card>
  );
}
