import { AGENT_URL, TURNSTILE_SITE_KEY } from './agent-config';

// The chat's session with the agent Worker. A Turnstile check (invisible unless
// Cloudflare wants an interaction) is exchanged once for a signed session token, which
// every agent request then carries. The Turnstile script loads only with the chat.

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      appearance: 'interaction-only';
      callback: (token: string) => void;
      'error-callback': () => void;
      'before-interactive-callback': () => void;
      'after-interactive-callback': () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** Renew a little before the Worker would reject the token. */
const RENEW_MARGIN_MS = 5 * 60_000;

export const SESSION_URL = AGENT_URL.replace(/\/copilotkit\/?$/, '/session');

let session: { token: string; expiresAt: number } | null = null;
let pending: Promise<string> | null = null;
let script: Promise<TurnstileApi> | null = null;
let slot: HTMLElement | null = null;
let slotWaiters: ((el: HTMLElement) => void)[] = [];

/** True while Turnstile waits for the visitor to tick its box (most never see it). */
let checking = false;
const checkListeners = new Set<() => void>();
function setChecking(value: boolean) {
  if (checking === value) return;
  checking = value;
  for (const listener of checkListeners) listener();
}
export const isHumanCheckShown = () => checking;
export function onHumanCheckChange(listener: () => void) {
  checkListeners.add(listener);
  return () => {
    checkListeners.delete(listener);
  };
}

/** Where a Turnstile challenge appears if Cloudflare asks the visitor to interact. */
export function setTurnstileSlot(el: HTMLElement | null) {
  slot = el;
  if (!el) return;
  for (const resolve of slotWaiters) resolve(el);
  slotWaiters = [];
}

const waitForSlot = () =>
  slot ? Promise.resolve(slot) : new Promise<HTMLElement>((r) => slotWaiters.push(r));

function loadTurnstile(): Promise<TurnstileApi> {
  script ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const el = document.createElement('script');
    el.src = SCRIPT;
    el.async = true;
    el.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile'));
    el.onerror = () => {
      script = null;
      reject(new Error('Turnstile failed to load'));
    };
    document.head.append(el);
  });
  return script;
}

async function turnstileToken(): Promise<string> {
  const [turnstile, el] = await Promise.all([loadTurnstile(), waitForSlot()]);
  return new Promise((resolve, reject) => {
    const id = turnstile.render(el, {
      sitekey: TURNSTILE_SITE_KEY,
      appearance: 'interaction-only',
      callback: (token) => {
        setChecking(false);
        turnstile.remove(id);
        resolve(token);
      },
      'error-callback': () => {
        setChecking(false);
        turnstile.remove(id);
        reject(new Error('Turnstile check failed'));
      },
      'before-interactive-callback': () => setChecking(true),
      'after-interactive-callback': () => setChecking(false),
    });
  });
}

async function newSession(): Promise<string> {
  const response = await fetch(SESSION_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: await turnstileToken() }),
  });
  if (!response.ok) throw new Error(`Session refused (${response.status})`);
  const { session: token, expiresAt } = (await response.json()) as {
    session: string;
    expiresAt: number;
  };
  session = { token, expiresAt };
  return token;
}

/** A valid session token, from memory or a fresh Turnstile check. */
export function getSession(): Promise<string> {
  if (session && session.expiresAt - RENEW_MARGIN_MS > Date.now()) {
    return Promise.resolve(session.token);
  }
  pending ??= newSession().finally(() => {
    pending = null;
  });
  return pending;
}
