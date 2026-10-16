import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

// Landing ↔ chat view state. Asking from the landing switches to the chat (with a view
// transition), pushes a history entry so Back returns to the landing, and keeps the
// conversation mounted so asking again continues it.

type View = 'landing' | 'chat';
type State = { view: View; started: boolean; pending: { id: number; prompt: string } | null };

let state: State = { view: 'landing', started: false, pending: null };
let seq = 0;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function withTransition(update: () => void) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}

function onPopState() {
  const view: View = state.started && window.history.state?.view === 'chat' ? 'chat' : 'landing';
  if (view !== state.view) withTransition(() => set({ view }));
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('popstate', onPopState);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('popstate', onPopState);
  };
}

const SERVER_STATE: State = { view: 'landing', started: false, pending: null };

export function useChatState(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

/** Starts (or continues) the conversation with a prompt and shows the chat. */
export function startChat(prompt: string) {
  const pending = { id: ++seq, prompt };
  withTransition(() => set({ view: 'chat', started: true, pending }));
  if (window.history.state?.view !== 'chat') {
    window.history.pushState({ view: 'chat' }, '', '#chat');
  }
  window.scrollTo({ top: 0 });
}

/** Back to the landing; the conversation stays for next time. */
export function showLanding() {
  if (window.history.state?.view === 'chat') window.history.back();
  else withTransition(() => set({ view: 'landing' }));
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
