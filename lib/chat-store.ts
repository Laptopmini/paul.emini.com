import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

// Landing ↔ chat view state. Asking from the landing switches to the chat (with a view
// transition), pushes a history entry so Back returns to the landing where the visitor
// left it, and keeps the conversation mounted so asking again continues it. `#chat` is
// the chat's history entry; every other hash is an anchor in the landing's résumé.

type View = 'landing' | 'chat';
type State = {
  view: View;
  started: boolean;
  pending: { id: number; prompt: string } | null;
  /** Answers so far, for the ask button's "Back to our chat" badge. */
  answers: number;
  /** Questions left today, once the Worker has said. */
  questionsLeft: number | null;
  /** The visitor left the chat through a card link to the résumé. */
  away: boolean;
};

const CHAT_HASH = '#chat';

let state: State = {
  view: 'landing',
  started: false,
  pending: null,
  answers: 0,
  questionsLeft: null,
  away: false,
};
let seq = 0;
/** Where the landing was scrolled when the chat opened over it. */
let landingScroll = 0;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Applies `update` (inside a view transition where possible), then `after` on the new view. */
function withTransition(update: () => void, after?: () => void) {
  const apply = () => {
    flushSync(update);
    after?.();
  };
  if (!document.startViewTransition || reducedMotion()) {
    apply();
    return;
  }
  document.startViewTransition(apply);
}

const restoreLanding = () => window.scrollTo({ top: landingScroll });

function onPopState() {
  const view: View = state.started && window.history.state?.view === 'chat' ? 'chat' : 'landing';
  if (view === state.view) return;
  if (view === 'landing') withTransition(() => set({ view }), restoreLanding);
  else openChat({});
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('popstate', onPopState);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('popstate', onPopState);
  };
}

const SERVER_STATE: State = {
  view: 'landing',
  started: false,
  pending: null,
  answers: 0,
  questionsLeft: null,
  away: false,
};

export function useChatState(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

function openChat(next: Partial<State>, after?: () => void) {
  if (state.view === 'landing') landingScroll = window.scrollY;
  withTransition(() => set({ view: 'chat', started: true, away: false, ...next }), after);
  if (window.history.state?.view !== 'chat') {
    window.history.pushState({ view: 'chat' }, '', CHAT_HASH);
  }
}

/** Starts (or continues) the conversation with a prompt and shows the chat. */
export function startChat(prompt: string) {
  openChat({ pending: { id: ++seq, prompt } }, () => window.scrollTo({ top: 0 }));
}

/** Back to the conversation as it was, after leaving it for the résumé. */
export function resumeChat() {
  if (state.started) openChat({});
}

/** Back to the landing, where the visitor left it; the conversation stays for next time. */
export function showLanding() {
  if (window.history.state?.view === 'chat') window.history.back();
  else withTransition(() => set({ view: 'landing' }), restoreLanding);
}

/**
 * A card's link to the résumé (/#<id>): close the chat (keeping it), jump to the
 * anchor, open its <details> and flash it, and let the ask button lead back.
 */
export function showSection(id: string) {
  if (id === CHAT_HASH.slice(1)) return;
  withTransition(
    () => set({ view: 'landing', away: state.started }),
    () => {
      window.history.pushState(null, '', `#${id}`);
      // What a click on the anchor would trigger (OpenOnHash, the carousel).
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      const target = document.getElementById(id);
      if (!target) return;
      const details =
        target instanceof HTMLDetailsElement ? target : target.querySelector('details');
      if (details && !details.open) details.open = true;
      target.scrollIntoView({ block: 'start' });
      flash(details ?? target);
    },
  );
}

/** A brief accent outline on what the visitor was sent to (globals.css, `[data-flash]`). */
function flash(el: HTMLElement) {
  if (reducedMotion()) return;
  delete el.dataset.flash;
  void el.offsetWidth; // restart the animation if it is still running
  el.dataset.flash = '';
  el.addEventListener('animationend', () => delete el.dataset.flash, { once: true });
}

/** The chat reports what the landing's ask button shows about it. */
export function reportChat(answers: number, questionsLeft: number | null) {
  if (answers !== state.answers || questionsLeft !== state.questionsLeft) {
    set({ answers, questionsLeft });
  }
}

/** The chat takes the pending prompt exactly once. */
export function takePending(): string | null {
  const prompt = state.pending?.prompt ?? null;
  if (state.pending) state = { ...state, pending: null };
  return prompt;
}

let chatModule: Promise<unknown> | undefined;
/** Warm the chat chunk (CopilotKit + cards) before the first question. */
export function preloadChat() {
  chatModule ??= import('@/components/chat/ChatApp');
  return chatModule;
}
