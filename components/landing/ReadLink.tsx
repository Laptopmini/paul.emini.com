'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ASK_INPUT_ID, RESUME_ID } from './copy';
import styles from './ReadLink.module.css';

// Where each hop cycle comes to rest (the `hop` keyframes in ReadLink.module.css).
const REST = 0.4;

/**
 * "Rather read? My résumé is right below": the way down from the ask panel. It rises in
 * once the page has settled and its arrow hops on a loop (CSS, off under reduced
 * motion) until the visitor scrolls or interacts. The hop then stops at rest: at once
 * if it's resting or hasn't started, else once the current hop lands (WCAG 2.2.2).
 * Hovering or focusing the link holds it at rest the same way. Without JS it's a plain
 * link that keeps hopping.
 */
export function ReadLink() {
  const link = useRef<HTMLAnchorElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const a = link.current;
    const el = arrow.current;
    if (!a || !el) return;
    const events = ['keydown', 'pointerdown', 'wheel'] as const;
    let stopping = false;
    let hovered = false;
    let focused = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Calls `then` once the arrow is at rest: now, or when the current hop lands.
    const atRest = (then: (hop: Animation | undefined) => void) => {
      const [hop] = el.getAnimations();
      const timing = hop?.effect?.getComputedTiming();
      const progress = timing?.progress;
      // No hop (reduced motion), paused at rest, waiting out its delay, or resting.
      if (!hop || hop.playState === 'paused' || progress == null || progress >= REST) {
        then(hop);
        return;
      }
      const duration = Number(timing?.duration ?? 0);
      timer = setTimeout(() => then(hop), (REST - progress) * duration + 40);
    };

    const stop = () => {
      if (stopping) return;
      stopping = true;
      detach();
      clearTimeout(timer);
      atRest(() => setDone(true));
    };
    const hold = () => {
      clearTimeout(timer);
      atRest((hop) => hop?.pause());
    };
    const release = () => {
      if (hovered || focused || stopping) return;
      clearTimeout(timer);
      el.getAnimations()[0]?.play();
    };
    const onEnter = () => {
      hovered = true;
      hold();
    };
    const onLeave = () => {
      hovered = false;
      release();
    };
    const onLinkFocus = () => {
      focused = true;
      hold();
    };
    const onLinkBlur = () => {
      focused = false;
      release();
    };
    const onScroll = () => {
      if (window.scrollY >= 1) stop();
    };
    const onFocus = (e: FocusEvent) => {
      if ((e.target as Element | null)?.id === ASK_INPUT_ID) stop();
    };
    function detach() {
      for (const name of events) window.removeEventListener(name, stop);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocus);
      a?.removeEventListener('pointerenter', onEnter);
      a?.removeEventListener('pointerleave', onLeave);
      a?.removeEventListener('focus', onLinkFocus);
      a?.removeEventListener('blur', onLinkBlur);
    }

    for (const name of events) window.addEventListener(name, stop, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocus);
    a.addEventListener('pointerenter', onEnter);
    a.addEventListener('pointerleave', onLeave);
    a.addEventListener('focus', onLinkFocus);
    a.addEventListener('blur', onLinkBlur);
    onScroll(); // landed mid-page (an anchor, a restored scroll position)
    return () => {
      detach();
      clearTimeout(timer);
    };
  }, []);

  return (
    <a ref={link} href={`#${RESUME_ID}`} className={styles.link}>
      <span>
        Rather read? <strong>My résumé is right below</strong>
      </span>
      <span ref={arrow} className={done ? `${styles.arrow} ${styles.done}` : styles.arrow}>
        <Icon name="arrowDown" size={16} />
      </span>
    </a>
  );
}
