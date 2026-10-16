'use client';

import { domAnimation, LazyMotion, m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Spring enter for a card arriving in the chat. The only place springs are used
 * (brief §4); renders a plain wrapper under prefers-reduced-motion.
 */
export function CardEnter({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8, delay }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
