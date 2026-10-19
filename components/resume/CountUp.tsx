'use client';

import { useEffect, useRef } from 'react';

/**
 * A stat value that counts up the first time it scrolls into view. The real value is
 * server-rendered and stays put when motion is reduced or the value isn't a number.
 */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const match = value.match(/^(\d+)(\D*)$/);
    if (!el || !match || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = Number(match[1]);
    const suffix = match[2] ?? '';
    let frame = 0;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 900);
        const eased = 1 - (1 - t) ** 3;
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = value;
    };
  }, [value]);

  return <span ref={ref}>{value}</span>;
}
