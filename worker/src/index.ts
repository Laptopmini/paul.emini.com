import { BuiltInAgent, CopilotRuntime, createCopilotRuntimeHandler } from '@copilotkit/runtime/v2';
import { personas, recommendations } from '@/content';
import { AGENT_ID, type QuotaValue, SESSION_HEADER } from '@/shared/agent';
import { type AlertEnv, checkCredit, healthAlert, sendAlert } from './alerts';
import {
  cannedEvents,
  cannedResponse,
  dailyLimitItems,
  fallbackFollowUpItems,
  itemEvents,
  offTopicItems,
  quotaEvent,
  restingItems,
} from './canned';
import { githubActivity } from './github-data';
import type { GuardState } from './guard-state';
import { classifyFailure, dayOf, resetsAt } from './limits';
import { SYSTEM_PROMPT, sessionContext } from './prompt';
import { createModel, type ProviderEnv, providerCalls } from './provider';
import { BadRequest, type Sanitized, sanitizeRunBody } from './sanitize';
import { issueSession, SESSION_TTL_MS, verifySession, verifyTurnstile, visitorId } from './session';
import { createEventFilter, filterSseStream } from './stream-filter';
import { createTools } from './tools';
import { type GateEnv, isOnTopic } from './topic-gate';

export { GuardState } from './guard-state';

export type Env = ProviderEnv &
  GateEnv &
  AlertEnv & {
    /** Comma-separated origins allowed to call the agent. */
    ALLOWED_ORIGINS?: string;
    /** The site's published /github.json (daily snapshot); unset uses the bundled copy. */
    GITHUB_DATA_URL?: string;
    GUARD: DurableObjectNamespace<GuardState>;
    /** Signs visitor sessions and keys the visitor hash. */
    SESSION_SECRET?: string;
    TURNSTILE_SECRET?: string;
    VISITOR_DAILY_LIMIT?: string;
    GLOBAL_DAILY_LIMIT?: string;
    /** Local e2e and evals only: an `x-test-visitor` header names the visitor. */
    ALLOW_TEST_VISITOR?: string;
  };

// BuiltInAgent passes its prompt as a system message instead of the AI SDK's `system`
// option, so the SDK warns about prompt injection on every run. sanitize.ts drops every
// client system message, so the only one is ours: silence exactly that warning.
const SYSTEM_IN_MESSAGES_WARNING = 'AI SDK Warning: System messages in the prompt or messages';
const warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith(SYSTEM_IN_MESSAGES_WARNING)) return;
  warn(...args);
};

const BASE = '/api/copilotkit';
const RUN_PATH = `${BASE}/agent/${AGENT_ID}/run`;
const SESSION_PATH = '/api/session';

/**
 * Only what the chat needs. The runtime also serves thread listing/inspection routes;
 * with an in-memory runner those could expose other visitors' conversations.
 */
const ALLOWED_ROUTES = new Set([`GET ${BASE}/info`, `POST ${RUN_PATH}`, `POST ${SESSION_PATH}`]);

/** Questions the site itself suggests; they skip the topic gate. */
const PILLS = new Set(personas.flatMap((p) => p.prompts));

let handler: ((request: Request) => Promise<Response>) | undefined;

const originsOf = (env: Env) =>
  (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

function buildHandler(env: Env) {
  const origins = originsOf(env);
  const runtime = new CopilotRuntime({
    agents: {
      [AGENT_ID]: new BuiltInAgent({
        model: createModel(env),
        prompt: SYSTEM_PROMPT,
        tools: createTools(recommendations, () => githubActivity(env.GITHUB_DATA_URL)),
        maxSteps: 6,
        maxOutputTokens: 700,
        temperature: 0.4,
      }),
    },
  });
  return createCopilotRuntimeHandler({
    runtime,
    basePath: BASE,
    activateChannels: false,
    cors: { origin: (origin) => (origins.includes(origin) ? origin : null), maxAge: 600 },
  });
}

/** CORS for the Worker's own responses (the runtime handles its routes itself). */
function cors(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin || !originsOf(env).includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  Response.json(body, { status, headers });

/** Turnstile token in, session token out. */
async function createSession(request: Request, env: Env): Promise<Response> {
  const headers = cors(request, env);
  if (!env.TURNSTILE_SECRET || !env.SESSION_SECRET) {
    return json({ error: 'Sessions are not configured' }, 503, headers);
  }
  const { token } = ((await request.json().catch(() => ({}))) ?? {}) as { token?: unknown };
  if (typeof token !== 'string' || token.length > 2048) {
    return json({ error: 'Missing token' }, 400, headers);
  }
  const ok = await verifyTurnstile(
    env.TURNSTILE_SECRET,
    token,
    request.headers.get('cf-connecting-ip'),
  );
  if (!ok) return json({ error: 'Verification failed' }, 403, headers);
  const now = Date.now();
  return json(
    { session: await issueSession(env.SESSION_SECRET, now), expiresAt: now + SESSION_TTL_MS },
    200,
    headers,
  );
}

function rebuildRequest(request: Request, sanitized: Sanitized): Request {
  const { body, persona, userTurns } = sanitized;
  const personaDef = personas.find((p) => p.id === persona) ?? personas[0];
  if (personaDef) {
    body.context = [sessionContext({ persona: personaDef, userTurns, today: dayOf(new Date()) })];
  }
  return new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body),
  });
}

/** Stops a run through the runtime itself (internal call; the route isn't public). */
function stopRun(
  run: (request: Request) => Promise<Response>,
  url: string,
  threadId: string,
  runId?: string,
) {
  const stopUrl = new URL(`${BASE}/agent/${AGENT_ID}/stop/${encodeURIComponent(threadId)}`, url);
  return run(
    new Request(stopUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(runId ? { runId } : {}),
    }),
  );
}

/**
 * One visitor question: session → daily quota → provider health → model run, with the
 * topic gate deciding in parallel whether the run is shown at all.
 */
async function guardedRun(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const headers = cors(request, env);
  const secret = env.SESSION_SECRET;
  const now = new Date();
  if (
    !secret ||
    !(await verifySession(secret, request.headers.get(SESSION_HEADER), now.getTime()))
  ) {
    return json({ error: 'session' }, 401, headers);
  }
  const sanitized = sanitizeRunBody(await request.json());
  const ids = { threadId: sanitized.clientThreadId, runId: sanitized.body.runId };

  const day = dayOf(now);
  const testVisitor =
    env.ALLOW_TEST_VISITOR === 'true' ? request.headers.get('x-test-visitor') : null;
  const visitor =
    testVisitor ??
    (await visitorId(secret, request.headers.get('cf-connecting-ip') ?? 'local', day));
  const limits = {
    visitor: Number(env.VISITOR_DAILY_LIMIT) || 25,
    global: Number(env.GLOBAL_DAILY_LIMIT) || 1000,
  };
  const counters = env.GUARD.get(env.GUARD.idFromName(`day:${day}`));
  const health = env.GUARD.get(env.GUARD.idFromName('health'));

  const decision = await counters.consume(visitor, limits, now.getTime());
  const quota: QuotaValue = {
    remaining: decision.remaining,
    limit: limits.visitor,
    resetsAt: resetsAt(now),
  };
  if (!decision.allowed) {
    const items =
      decision.reason === 'visitor' ? dailyLimitItems(quota, now) : restingItems('busy');
    return cannedResponse(cannedEvents(ids, items, quota), headers);
  }
  if (!(await health.attempt(now.getTime()))) {
    ctx.waitUntil(counters.refund(visitor));
    return cannedResponse(cannedEvents(ids, restingItems('unavailable'), quota), headers);
  }

  const { question, previousQuestion, lastFollowUps } = sanitized;
  const gated = !PILLS.has(question) && !lastFollowUps.includes(question);
  const hold = gated
    ? isOnTopic(env, question, previousQuestion).then((on) =>
        on ? null : itemEvents(offTopicItems()),
      )
    : undefined;

  handler ??= buildHandler(env);
  const run = handler;
  const calls: { status?: number } = {};
  const response = await providerCalls.run(calls, () => run(rebuildRequest(request, sanitized)));
  if (!response.body || !response.headers.get('content-type')?.includes('event-stream')) {
    return response;
  }

  const persistentFailure = () => {
    const kind = calls.status === undefined ? undefined : classifyFailure(calls.status);
    return kind === 'credits' || kind === 'auth';
  };
  const afterRun = async (ok: boolean) => {
    if (!ok) await counters.refund(visitor);
    const {
      notify,
      health: next,
      previous,
    } = await health.report(ok ? { ok: true } : { ok: false, status: calls.status }, Date.now());
    if (notify) await sendAlert(env, healthAlert(notify, previous, next));
  };

  const { stream, done } = filterSseStream(response.body, createEventFilter(), {
    clientThreadId: sanitized.clientThreadId,
    afterStart: [quotaEvent(quota)],
    hold,
    onOutcome: (ok) => ctx.waitUntil(afterRun(ok)),
    onError: () => (persistentFailure() ? itemEvents(restingItems('unavailable')) : null),
    fallbackFollowUps: () => {
      const prompts = (personas.find((p) => p.id === sanitized.persona) ?? personas[0])?.prompts;
      return itemEvents(fallbackFollowUpItems(prompts ?? [], sanitized.questions));
    },
    onFinish: (run_) =>
      run_.threadId ? stopRun(run, request.url, run_.threadId, run_.runId) : undefined,
  });
  ctx.waitUntil(done);
  return new Response(stream, response);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/health') return Response.json({ ok: true });

    if (request.method === 'OPTIONS' && pathname === SESSION_PATH) {
      return new Response(null, { status: 204, headers: cors(request, env) });
    }
    handler ??= buildHandler(env);
    if (request.method === 'OPTIONS' && pathname.startsWith(BASE)) return handler(request);
    if (!ALLOWED_ROUTES.has(`${request.method} ${pathname}`)) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    try {
      if (pathname === SESSION_PATH) return await createSession(request, env);
      if (pathname === RUN_PATH) return await guardedRun(request, env, ctx);
    } catch (error) {
      if (error instanceof BadRequest || error instanceof SyntaxError) {
        return json({ error: error.message }, 400, cors(request, env));
      }
      throw error;
    }
    return handler(request);
  },

  /** Daily Cron Trigger: warn Paul before the key's credit runs out. */
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(checkCredit(env));
  },
} satisfies ExportedHandler<Env>;
