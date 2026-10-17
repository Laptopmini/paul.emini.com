// Visitor sessions. The chat passes a Turnstile check once, the Worker verifies it with
// Cloudflare and hands back a signed, short-lived session token that every run then
// carries in a header. No cookies, no accounts; the signature is an HMAC with
// SESSION_SECRET, which also keys the hash that stands in for a visitor's IP.

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const SESSION_TTL_MS = 6 * 60 * 60_000;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}

/** Constant-time string comparison, so a forged signature can't be found byte by byte. */
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string | null,
): Promise<boolean> {
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);
  const response = await fetch(SITEVERIFY, { method: 'POST', body: form });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

/** "<expiry ms>.<signature>" */
export async function issueSession(secret: string, now: number): Promise<string> {
  const expires = String(now + SESSION_TTL_MS);
  return `${expires}.${await hmac(secret, `session:${expires}`)}`;
}

export async function verifySession(
  secret: string,
  token: string | null,
  now: number,
): Promise<boolean> {
  const [expires, signature] = token?.split('.') ?? [];
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < now) return false;
  return equal(signature, await hmac(secret, `session:${expires}`));
}

/**
 * Stands in for the visitor's IP in the daily counters: keyed and salted with the day,
 * so it can't be reversed or followed from one day to the next.
 */
export const visitorId = (secret: string, ip: string, day: string) =>
  hmac(secret, `visitor:${day}:${ip}`);
