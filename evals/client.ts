import { MAX_PROMPT_LENGTH } from '@/shared/agent';

// A minimal AG-UI client for the evals: one question in, what the visitor would see out.

const BASE = (process.env.EVAL_AGENT_URL ?? 'http://localhost:8787').replace(/\/$/, '');
const ORIGIN = 'http://localhost:3000';

export type Reply = {
  text: string;
  tools: { name: string; args: Record<string, unknown>; result?: unknown }[];
  /** Text and tool names in the order they streamed. */
  order: string[];
  followUps: string[];
};

let session: Promise<string> | undefined;

/** The dev Worker pairs with Cloudflare's always-pass Turnstile test secret. */
function getSession(): Promise<string> {
  session ??= fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ token: 'XXXX.DUMMY.TOKEN.XXXX' }),
  })
    .then((r) => r.json() as Promise<{ session: string }>)
    .then((r) => r.session);
  return session;
}

export async function ask(question: string, persona = 'visitor'): Promise<Reply> {
  const response = await fetch(`${BASE}/api/copilotkit/agent/default/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      origin: ORIGIN,
      'x-agent-session': await getSession(),
      // Each eval is its own visitor, so the daily limit never gets in the way.
      'x-test-visitor': crypto.randomUUID(),
    },
    body: JSON.stringify({
      threadId: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      messages: [{ id: '1', role: 'user', content: question.slice(0, MAX_PROMPT_LENGTH) }],
      forwardedProps: { persona },
    }),
  });
  if (!response.ok) throw new Error(`Agent answered HTTP ${response.status}`);

  const reply: Reply = { text: '', tools: [], order: [], followUps: [] };
  const calls = new Map<string, { name: string; args: string; result?: unknown }>();
  for (const frame of (await response.text()).split('\n\n')) {
    if (!frame.startsWith('data: ')) continue;
    const e = JSON.parse(frame.slice(6));
    if (e.type === 'RUN_ERROR') throw new Error(`Run failed: ${e.message}`);
    if (e.type === 'TEXT_MESSAGE_CONTENT') {
      if (reply.order.at(-1) !== 'text') reply.order.push('text');
      reply.text += e.delta;
    }
    if (e.type === 'TOOL_CALL_START') {
      calls.set(e.toolCallId, { name: e.toolCallName, args: '' });
      reply.order.push(e.toolCallName);
    }
    const call = calls.get(e.toolCallId);
    if (e.type === 'TOOL_CALL_ARGS' && call) call.args += e.delta;
    if (e.type === 'TOOL_CALL_RESULT' && call) call.result = safeJson(e.content);
  }
  for (const { name, args, result } of calls.values()) {
    reply.tools.push({ name, args: (safeJson(args) ?? {}) as Record<string, unknown>, result });
    // What the visitor sees: the tool's result, after the Worker's own checks.
    const shown = (result as { questions?: unknown } | undefined)?.questions;
    if (name === 'suggestFollowUps' && Array.isArray(shown)) reply.followUps = shown as string[];
  }
  // A resting card means the Worker held the question back (limits, provider down).
  const resting = reply.tools.find((t) => t.name === 'agentResting');
  if (resting) throw new Error(`The agent is resting: ${JSON.stringify(resting.result)}`);
  return reply;
}

function safeJson(raw: unknown): unknown {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return undefined;
  }
}

export const called = (reply: Reply, name: string) => reply.tools.some((t) => t.name === name);
