'use client';

import { useEffect } from 'react';

const number = (i: number) => String(i + 1).padStart(2, '0');

/**
 * Marks the "On this page" link of the section in view with aria-current="true", keeps
 * the active tab scrolled into the strip and updates the picker's label. Without JS the
 * links are plain anchors, so nothing here is required.
 */
export function ScrollSpy() {
  useEffect(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-spy] a[href^="#"]')];
    const ids = [...new Set(links.map((a) => a.hash.slice(1)))].filter((id) =>
      document.getElementById(id),
    );
    // Links may point at a section's heading; watch the whole section.
    const sections = ids.map((id) => {
      const el = document.getElementById(id) as HTMLElement;
      return el.closest('section') ?? el;
    });
    const picker = document.querySelector<HTMLDetailsElement>('[data-spy-picker]');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const inView = new Set<Element>();
    let current = -1;

    function activate(index: number) {
      if (index === current) return;
      current = index;
      const id = ids[index];
      for (const a of links) {
        if (a.hash.slice(1) !== id) {
          a.removeAttribute('aria-current');
          continue;
        }
        a.setAttribute('aria-current', 'true');
        const strip = a.closest<HTMLElement>('[data-spy]');
        if (strip && strip.scrollWidth > strip.clientWidth) {
          strip.scrollTo({
            left: a.offsetLeft - 16,
            behavior: reduce.matches ? 'auto' : 'smooth',
          });
        }
      }
      if (picker) {
        const counter = picker.querySelector('[data-spy-index]');
        const label = picker.querySelector('[data-spy-label]');
        if (counter) counter.textContent = `${number(index)} / ${number(ids.length - 1)} · `;
        if (label) label.textContent = links.find((a) => a.hash.slice(1) === id)?.textContent ?? '';
      }
    }

    // A band from under the sticky bar to the middle of the screen: the first section
    // touching it is the one being read. Short closing sections can't scroll up into
    // the band, so at the end of the page the last section is the one being read.
    const atBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const update = () => {
      const index = atBottom() ? sections.length - 1 : sections.findIndex((s) => inView.has(s));
      if (index >= 0) activate(index);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target);
          else inView.delete(e.target);
        }
        update();
      },
      { rootMargin: '-120px 0px -50% 0px' },
    );
    for (const s of sections) observer.observe(s);
    // The band doesn't change when the page hits its end, so watch the scroll too.
    window.addEventListener('scroll', update, { passive: true });

    // The picker closes once a section is chosen.
    const onPick = (e: MouseEvent) => {
      if (picker && (e.target as Element).closest('a')) picker.open = false;
    };
    picker?.addEventListener('click', onPick);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      picker?.removeEventListener('click', onPick);
    };
  }, []);

  return null;
}
