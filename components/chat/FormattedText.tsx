import type { ReactNode } from 'react';
import { ExternalLink } from '@/components/ExternalLink';
import { profile } from '@/content';
import { linkify } from '@/lib/linkify';
import { SITE_ORIGIN } from '@/shared/constants';
import styles from './chat.module.css';

/**
 * Links in agent text may only point at Paul's own site, profiles, repos and email. Site
 * pages open in a new tab too, so following one never loses the conversation.
 */
const LINKABLE = {
  hosts: [
    new URL(SITE_ORIGIN).hostname,
    ...Object.values(profile.links).map((url) => new URL(url).hostname),
    'github.com',
  ],
  emails: [profile.email],
};

function links(text: string, key: string): ReactNode[] {
  return linkify(text, LINKABLE).map((part) => {
    if (typeof part === 'string') return part;
    return part.href.startsWith('mailto:') ? (
      <a key={`${key}:${part.href}`} href={part.href} className={styles.link}>
        {part.label}
      </a>
    ) : (
      <ExternalLink key={`${key}:${part.href}`} href={part.href} className={styles.link}>
        {part.label}
      </ExternalLink>
    );
  });
}

/**
 * Model text as paragraphs (single line breaks kept via CSS). The prompt asks for plain text; stray **bold** and `code`
 * are rendered rather than shown as symbols, and URLs become links. Always React text nodes, never HTML.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).flatMap((part, i) => {
    const key = `${i}:${part.slice(0, 12)}`;
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={key}>{links(part.slice(2, -2), key)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={key}>{part.slice(1, -1)}</code>;
    return links(part, key);
  });
}

export function FormattedText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className={styles.text}>
            {inline(paragraph)}
          </p>
        ))}
    </>
  );
}
