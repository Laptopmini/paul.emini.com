'use client';

import type { ReactNode } from 'react';
import { ASK_ID, ASK_INPUT_ID } from './copy';

/**
 * A link up to the ask panel that also puts the cursor in its dock. Without JS it's a
 * plain #ask anchor.
 */
export function AskLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <a
      href={`#${ASK_ID}`}
      className={className}
      onClick={() => {
        // After the jump, so focusing doesn't scroll the page a second time.
        requestAnimationFrame(() =>
          document.getElementById(ASK_INPUT_ID)?.focus({ preventScroll: true }),
        );
      }}
    >
      {children}
    </a>
  );
}
