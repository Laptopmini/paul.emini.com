'use client';

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Icon } from '@/components/Icon';
import styles from './Carousel.module.css';
import layout from './layout.module.css';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Behaviour for a server-rendered row of slides. Without JS the row is a plain
 * scroll-snap strip; with it come controls, dots, ←/→ and autoplay that pauses on
 * hover, focus, the pause button, offscreen and hidden tabs (and never runs under
 * reduced motion). A #slide-id in the URL selects that slide.
 */
export function Carousel({
  labelledBy,
  heading,
  slides,
  interval,
  children,
}: {
  /** Id of the heading inside `heading`. */
  labelledBy: string;
  heading: ReactNode;
  slides: { id: string; name: string }[];
  interval: number;
  /** The slides, in order, as direct children. */
  children: ReactNode;
}) {
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  /** Slide a programmatic scroll is heading to; scroll sync ignores the ones it passes. */
  const target = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [onscreen, setOnscreen] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [reduced, setReduced] = useState(true);
  const playing =
    ready && !reduced && !userPaused && !hovered && !focused && onscreen && !pageHidden;
  const count = slides.length;

  const goTo = useCallback(
    (i: number, smooth = true) => {
      const vp = viewport.current;
      const next = (i + count) % count;
      const slide = vp?.children[next] as HTMLElement | undefined;
      if (!vp || !slide) return;
      target.current = next;
      setIndex(next);
      const inset = Number.parseFloat(getComputedStyle(vp).scrollPaddingLeft) || 0;
      vp.scrollTo({
        left: slide.offsetLeft - inset,
        behavior: smooth && !reducedMotion() ? 'smooth' : 'auto',
      });
      window.setTimeout(() => {
        if (target.current === next) target.current = null;
      }, 1000);
    },
    [count],
  );

  useEffect(() => {
    setReady(true);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReduced(motion.matches);
    const onVisibility = () => setPageHidden(document.hidden);
    onMotion();
    onVisibility();
    motion.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);

    const vp = viewport.current;
    const el = section.current;
    if (!vp || !el) return;

    // Keep the active slide in sync with manual swipes and scrolls.
    const slideObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = [...vp.children].indexOf(e.target);
          if (target.current === null || target.current === i) {
            target.current = null;
            setIndex(i);
          }
        }
      },
      { root: vp, threshold: 0.6 },
    );
    for (const slide of vp.children) slideObserver.observe(slide);

    const sectionObserver = new IntersectionObserver(([e]) => setOnscreen(!!e?.isIntersecting));
    sectionObserver.observe(el);

    const fromHash = () => {
      const i = slides.findIndex((s) => `#${s.id}` === window.location.hash);
      if (i < 0) return;
      goTo(i, false);
      document.getElementById(labelledBy)?.scrollIntoView();
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);

    return () => {
      motion.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('hashchange', fromHash);
      slideObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, [goTo, labelledBy, slides]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    goTo(index + (e.key === 'ArrowRight' ? 1 : -1));
  };

  return (
    <section
      ref={section}
      aria-roledescription="carousel"
      aria-labelledby={labelledBy}
      className={`${layout.section} ${styles.carousel}`}
      data-ready={ready || undefined}
      data-paused={!playing || undefined}
      style={{ '--interval': `${interval}ms` } as CSSProperties}
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div className={layout.sectionHead}>
        {heading}
        {ready && (
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.control}
              aria-label={userPaused ? 'Play recommendations' : 'Pause recommendations'}
              onClick={() => setUserPaused((p) => !p)}
            >
              <Icon name={userPaused ? 'play' : 'pause'} />
            </button>
            <button
              type="button"
              className={styles.control}
              aria-label="Previous recommendation"
              onClick={() => goTo(index - 1)}
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              className={styles.control}
              aria-label="Next recommendation"
              onClick={() => goTo(index + 1)}
            >
              <Icon name="chevronRight" />
            </button>
          </div>
        )}
      </div>
      <div ref={viewport} className={styles.viewport} aria-live={playing ? 'off' : 'polite'}>
        {children}
      </div>
      {ready && (
        // biome-ignore lint/a11y/useSemanticElements: slide pickers, not form fields (WAI carousel pattern)
        <div role="group" aria-label="Choose a recommendation" className={styles.dots}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={styles.dotButton}
              aria-label={`Show recommendation from ${s.name}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(i)}
            >
              <span className={styles.dot}>
                {i === index && (
                  <span
                    key={index}
                    className={styles.fill}
                    onAnimationEnd={() => playing && goTo(index + 1)}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
