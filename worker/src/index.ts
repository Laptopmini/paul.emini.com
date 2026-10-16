import { BuiltInAgent, CopilotRuntime, createCopilotRuntimeHandler } from '@copilotkit/runtime/v2';
import { personas, recommendations } from '@/content';
import { AGENT_ID } from '@/shared/agent';
import { SYSTEM_PROMPT, sessionContext } from './prompt';
import { createModel, type ProviderEnv } from './provider';
import { BadRequest, sanitizeRunBody } from './sanitize';
import { createEventFilter, filterSseStream } from './stream-filter';
import { createTools } from './tools';

export type Env = ProviderEnv & {
  /** Comma-separated origins allowed to call the agent. */
  ALLOWED_ORIGINS?: string;
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

/**
 * Only what the chat needs. The runtime also serves thread listing/inspection routes;
 * with an in-memory runner those could expose other visitors' conversations.
 */
const ALLOWED_ROUTES = new Set([`GET ${BASE}/info`, `POST ${RUN_PATH}`]);

let handler: ((request: Request) => Promise<Response>) | undefined;

function buildHandler(env: Env) {
  const origins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const runtime = new CopilotRuntime({
    agents: {
      [AGENT_ID]: new BuiltInAgent({
        model: createModel(env),
        prompt: SYSTEM_PROMPT,
        tools: createTools(recommendations),
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

async function sanitizeRun(
  request: Request,
): Promise<{ request: Request; clientThreadId: string }> {
  const { body, persona, userTurns, clientThreadId } = sanitizeRunBody(await request.json());
  const personaDef = personas.find((p) => p.id === persona) ?? personas[0];
  if (personaDef) {
    body.context = [
      sessionContext({
        persona: personaDef,
        userTurns,
        today: new Date().toISOString().slice(0, 10),
      }),
    ];
  }
  return {
    clientThreadId,
    request: new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    }),
  };
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/health') return Response.json({ ok: true });

    handler ??= buildHandler(env);
    if (request.method === 'OPTIONS' && pathname.startsWith(BASE)) return handler(request);
    if (!ALLOWED_ROUTES.has(`${request.method} ${pathname}`)) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (pathname === RUN_PATH) {
      try {
        const sanitized = await sanitizeRun(request);
        const response = await handler(sanitized.request);
        if (!response.body || !response.headers.get('content-type')?.includes('event-stream')) {
          return response;
        }
        const run = handler;
        const { stream, done } = filterSseStream(response.body, createEventFilter(), {
          clientThreadId: sanitized.clientThreadId,
          onFinish: (ids) =>
            ids.threadId ? stopRun(run, request.url, ids.threadId, ids.runId) : undefined,
        });
        ctx.waitUntil(done);
        return new Response(stream, response);
      } catch (error) {
        if (error instanceof BadRequest || error instanceof SyntaxError) {
          return Response.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    }
    return handler(request);
  },
} satisfies ExportedHandler<Env>;
