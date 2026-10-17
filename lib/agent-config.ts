/**
 * Where the agent Worker lives. Set NEXT_PUBLIC_AGENT_URL at build time; in `next dev`
 * it defaults to `wrangler dev`. Empty means the chat shows its unavailable state.
 */
export const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8787/api/copilotkit' : '');

/** Cloudflare's documented always-pass Turnstile site key; pairs with the dev Worker. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

/**
 * Turnstile site key (public). Set NEXT_PUBLIC_TURNSTILE_SITE_KEY at build time; in
 * `next dev` it defaults to the test key.
 */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
  (process.env.NODE_ENV === 'development' ? TURNSTILE_TEST_SITE_KEY : '');
