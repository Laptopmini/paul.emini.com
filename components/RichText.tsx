import { Fragment, type ReactNode } from 'react';

/** Owner-written copy with **bold** kept as written. React text nodes only, never HTML. */
export function RichText({ text }: { text: string }): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: static text, never reordered
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: static text, never reordered
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
