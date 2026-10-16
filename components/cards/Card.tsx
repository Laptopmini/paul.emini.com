import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

type Tone = 'default' | 'dark' | 'accent' | 'dashed';

/** Card shell: 18px radius, 1px --line border, and the 3px hover rise from the brief. */
export function Card({
  as: Tag = 'article',
  tone = 'default',
  interactive = true,
  className,
  children,
  ...rest
}: {
  as?: 'article' | 'section' | 'figure' | 'div';
  tone?: Tone;
  /** Hover rise; off for placeholders like the skeleton. */
  interactive?: boolean;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  const classes = [styles.card, styles[tone], interactive && styles.interactive, className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
