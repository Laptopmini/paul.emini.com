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
      retry: 'never';
      callback: (token: string) => void;
      'error-callback': (code: string) => boolean;
      'before-interactive-callback': () => void;
      'after-interactive-callback': () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
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
/** Turnstile challenges fail now and then for real visitors; a fresh one often passes. */
const CHECK_ATTEMPTS = 3;
const CHECK_RETRY_DELAY_MS = 1_000;
/** 110xxx codes are configuration errors (site key, domain): retrying can't help. */
const isConfigError = (code: string) => code.startsWith('110');

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

/**
 * True once the visitor couldn't get past the check (Turnstile failed every attempt,
 * or the Worker refused its token). The agent itself may be fine.
 */
let checkFailed = false;
const failListeners = new Set<() => void>();
function setCheckFailed(value: boolean) {
  if (checkFailed === value) return;
  checkFailed = value;
  for (const listener of failListeners) listener();
}
export const hasHumanCheckFailed = () => checkFailed;
export function onHumanCheckFailedChange(listener: () => void) {
  failListeners.add(listener);
  return () => {
    failListeners.delete(listener);
  };
}

class HumanCheckError extends Error {}

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
    let attempts = 1;
    const id = turnstile.render(el, {
      sitekey: TURNSTILE_SITE_KEY,
      appearance: 'interaction-only',
      // Retries are ours, so a failure that ends the check really is the last one.
      retry: 'never',
      callback: (token) => {
        setChecking(false);
        turnstile.remove(id);
        resolve(token);
      },
      'error-callback': (code) => {
        if (attempts < CHECK_ATTEMPTS && !isConfigError(code)) {
          attempts += 1;
          window.setTimeout(() => turnstile.reset(id), CHECK_RETRY_DELAY_MS);
          return true;
        }
        setChecking(false);
        turnstile.remove(id);
        reject(new HumanCheckError(`Turnstile check failed (${code})`));
        return true;
      },
      'before-interactive-callback': () => setChecking(true),
      'after-interactive-callback': () => setChecking(false),
    });
  });
}

async function newSession(): Promise<string> {
  setCheckFailed(false);
  try {
    return await requestSession(await turnstileToken());
  } catch (error) {
    if (error instanceof HumanCheckError) setCheckFailed(true);
    throw error;
  }
}

async function requestSession(turnstileToken: string): Promise<string> {
  const response = await fetch(SESSION_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: turnstileToken }),
  });
  // 403: the Worker's own Turnstile verification refused the token.
  if (response.status === 403) throw new HumanCheckError('Session refused (403)');
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
