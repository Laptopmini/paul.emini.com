import type { ReactNode } from 'react';
import layout from './layout.module.css';

/** Phone-only bar with the page's two actions; hidden from 641px and in print. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Page actions" className={layout.bottomBar}>
      {children}
    </nav>
  );
}
