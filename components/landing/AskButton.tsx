'use client';

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Icon } from '@/components/Icon';
import type { Pages, Persona } from '@/content';
import { preloadChat, resumeChat, startChat, useChatState } from '@/lib/chat-store';
import { usePersona } from '@/lib/persona-store';
import { MAX_PROMPT_LENGTH } from '@/shared/constants';
import styles from './AskButton.module.css';
import dock from './ChatDock.module.css';
import { RESUME_ID } from './copy';
import { PersonaToggle } from './PersonaToggle';

type SectionPrompts = Pages['askBySection'];
type SectionId = keyof SectionPrompts;

const BACK_LABEL = 'Back to our chat';
/** The section crossing this line (40% down the viewport) is the one being read. */
const PROBE = '-40% 0px -59% 0px';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The floating ask button, once the visitor is reading the résumé. Its label follows
 * the section in view, and it opens a small chat box with a question about it filled
 * in (following the section until the visitor types); sending goes through the same path as the main dock and switches to the chat.
 * After a chat card sent the visitor here, it leads back to the conversation instead.
 * Progressive enhancement: it isn't rendered without JS.
 */
export function AskButton({
  prompts,
  personas,
  defaultPersona,
}: {
  prompts: SectionPrompts;
  personas: Pick<Persona, 'id' | 'label' | 'hint' | 'prompts'>[];
  defaultPersona: Persona['id'];
}) {
  const { view, away, answers, questionsLeft } = useChatState();
  const [personaId, setPersona] = usePersona(
    personas.map((p) => p.id),
    defaultPersona,
  );
  const persona = personas.find((p) => p.id === personaId) ?? personas[0];
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<SectionId>('highlights');
  const [inResume, setInResume] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  /** Until the visitor types, the question follows the section being read. */
  const [edited, setEdited] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const width = useRef(0);
  const boxId = useId();
  const titleId = useId();

  // Hidden on the first screen and at the closing "Rather just ask?" band, which says
  // the same thing; the way back to a conversation shows everywhere.
  const visible = ready && view === 'landing' && (away || (inResume && !atEnd));
  const label = away ? BACK_LABEL : prompts[section].label;
  const question = edited ? text : prompts[section].prompt;

  useEffect(() => {
    setReady(true);
    const sections = new Map<Element, SectionId>();
    for (const id of Object.keys(prompts) as SectionId[]) {
      const el = document.getElementById(id);
      if (el) sections.set(el.closest('section') ?? el, id);
    }
    const probe = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.isIntersecting && sections.get(e.target);
          if (id) setSection(id);
        }
      },
      { rootMargin: PROBE },
    );
    for (const el of sections.keys()) probe.observe(el);

    // In the résumé once its intro has passed the probe line. Measured on scroll: a jump
    // straight past the intro never intersects it, so an observer would miss it.
    const introEl = document.getElementById(RESUME_ID);
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (introEl) setInResume(introEl.getBoundingClientRect().top < window.innerHeight * 0.4);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });

    const end = new IntersectionObserver(([e]) => setAtEnd(!!e?.isIntersecting));
    const endEl = document.querySelector('[data-ask-cta]');
    if (endEl) end.observe(endEl);

    return () => {
      probe.disconnect();
      end.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [prompts]);

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  useEffect(() => {
    const el = field.current;
    if (!open || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [open]);

  // The button's width morphs between labels: measure the new width, then transition
  // from the old one. Instant under reduced motion.
  useLayoutEffect(() => {
    const el = button.current;
    if (!el || !label) return;
    const from = el.style.width ? el.getBoundingClientRect().width : width.current;
    el.style.width = '';
    const to = el.getBoundingClientRect().width;
    width.current = to;
    if (!from || Math.abs(from - to) < 1 || reducedMotion()) return;
    el.style.width = `${from}px`;
    void el.offsetWidth;
    el.style.width = `${to}px`;
    const done = (e: TransitionEvent) => {
      if (e.propertyName !== 'width') return;
      el.style.width = '';
      el.removeEventListener('transitionend', done);
    };
    el.addEventListener('transitionend', done);
    return () => el.removeEventListener('transitionend', done);
  }, [label]);

  // Focus goes back to the button once the box has closed (on phones the button is
  // hidden while the sheet is open, so it can't take focus any sooner).
  const refocus = useRef(false);
  useEffect(() => {
    if (open || !refocus.current) return;
    refocus.current = false;
    button.current?.focus();
  }, [open]);

  const close = () => {
    refocus.current = true;
    setOpen(false);
  };

  const onButton = () => {
    if (away) {
      resumeChat();
      return;
    }
    if (open) {
      close();
      return;
    }
    preloadChat();
    setEdited(false);
    setOpen(true);
  };

  const ask = (prompt: string) => {
    setOpen(false);
    startChat(prompt);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const prompt = question.trim();
    if (prompt) ask(prompt);
  };

  const onFieldKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      onSubmit(event);
    }
  };

  if (!ready || !persona) return null;

  return (
    <div className={styles.dock}>
      {open && (
        <>
          {/* A backdrop: Esc and the close button do the same. */}
          <div className={styles.scrim} onClick={close} aria-hidden="true" />
          <form
            id={boxId}
            role="dialog"
            aria-labelledby={titleId}
            className={styles.box}
            onSubmit={onSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
            }}
          >
            <div className={styles.head}>
              <span id={titleId} className={styles.who}>
                <span className={styles.avatar} aria-hidden="true">
                  PVM
                </span>
                {label}
              </span>
              <button type="button" className={styles.close} aria-label="Close" onClick={close}>
                <Icon name="close" />
              </button>
            </div>
            <PersonaToggle
              personas={personas}
              selected={persona}
              onSelect={setPersona}
              variant="stacked"
            />
            <div className={styles.field}>
              <label htmlFor={`${boxId}-q`} className="sr-only">
                Your question
              </label>
              <textarea
                ref={field}
                id={`${boxId}-q`}
                rows={2}
                maxLength={MAX_PROMPT_LENGTH}
                value={question}
                onChange={(e) => {
                  setText(e.target.value);
                  setEdited(true);
                }}
                onKeyDown={onFieldKey}
              />
              <button type="submit" aria-label="Send" className={dock.send}>
                <Icon name="send" size={20} strokeWidth={2.2} />
              </button>
            </div>
            {questionsLeft !== null && (
              <p className={styles.foot}>
                {questionsLeft} question{questionsLeft === 1 ? '' : 's'} left today
              </p>
            )}
          </form>
        </>
      )}
      <button
        ref={button}
        type="button"
        className={visible ? styles.button : `${styles.button} ${styles.hidden}`}
        inert={!visible}
        aria-expanded={away ? undefined : open}
        aria-controls={open ? boxId : undefined}
        onClick={onButton}
      >
        <span className={styles.avatar} aria-hidden="true">
          PVM
        </span>
        <span key={label} className={styles.label}>
          {label}
        </span>
        {away && answers > 0 && (
          <span className={styles.count}>
            <span className="sr-only">(</span>
            {answers}
            <span className="sr-only"> {answers === 1 ? 'answer' : 'answers'})</span>
          </span>
        )}
      </button>
    </div>
  );
}
