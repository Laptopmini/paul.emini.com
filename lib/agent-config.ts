/**
 * Where the agent Worker lives. Set NEXT_PUBLIC_AGENT_URL at build time; in `next dev`
 * it defaults to `wrangler dev`. Empty means the chat shows its unavailable state.
 */
export const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8787/api/copilotkit' : '');
