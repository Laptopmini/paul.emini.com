import { type PersonaId, personaIds } from '@/content/schema';
import { MAX_PROMPT_LENGTH } from '@/shared/agent';

// The runtime puts the request's `context` and `state` into the system prompt and
// accepts tool definitions from the client. None of that is trusted here: the body is
// rebuilt so only conversation messages and a validated persona id get through.

const MAX_MESSAGES = 60;
const MAX_MESSAGE_CHARS = 8_000;

type Message = { id?: unknown; role?: unknown; content?: unknown; [key: string]: unknown };

export type RunBody = {
  threadId: string;
  runId: string;
  messages: Message[];
  tools: [];
  context: { description: string; value: string }[];
  state: Record<string, never>;
  forwardedProps: Record<string, never>;
};

export type Sanitized = {
  body: RunBody;
  /** The visitor's thread id; `body.threadId` is a fresh server-side id per run. */
  clientThreadId: string;
  persona: PersonaId;
  userTurns: number;
};

export class BadRequest extends Error {}

function asString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function cleanMessage(m: Message): Message | null {
  if (m.role === 'user') {
    const content = asString(m.content, MAX_PROMPT_LENGTH).trim();
    return content ? { id: m.id, role: 'user', content } : null;
  }
  if (m.role === 'assistant') {
    return {
      id: m.id,
      role: 'assistant',
      content: asString(m.content, MAX_MESSAGE_CHARS),
      ...(Array.isArray(m.toolCalls) ? { toolCalls: m.toolCalls } : {}),
    };
  }
  if (m.role === 'tool') {
    return {
      id: m.id,
      role: 'tool',
      toolCallId: m.toolCallId,
      content: asString(m.content, MAX_MESSAGE_CHARS),
    };
  }
  return null; // system, developer, reasoning, activity: dropped.
}

export function sanitizeRunBody(raw: unknown): Sanitized {
  if (!raw || typeof raw !== 'object') throw new BadRequest('Expected a JSON object');
  const input = raw as Record<string, unknown>;
  const threadId = asString(input.threadId, 100);
  const runId = asString(input.runId, 100);
  if (!threadId || !runId) throw new BadRequest('threadId and runId are required');
  if (!Array.isArray(input.messages)) throw new BadRequest('messages must be an array');

  const messages = (input.messages as Message[])
    .slice(-MAX_MESSAGES)
    .map(cleanMessage)
    .filter((m): m is Message => m !== null);
  if (messages.at(-1)?.role !== 'user')
    throw new BadRequest('The last message must be from the user');

  const props = (input.forwardedProps ?? {}) as Record<string, unknown>;
  const persona = personaIds.find((id) => id === props.persona) ?? 'visitor';
  const userTurns = messages.filter((m) => m.role === 'user').length;

  // Every request carries the whole conversation, so runs don't need server-side thread
  // state. A fresh thread id per run means a run that is still winding down can never
  // block the visitor's next question ("Thread already running").
  return {
    persona,
    userTurns,
    clientThreadId: threadId,
    body: {
      threadId: crypto.randomUUID(),
      runId,
      messages,
      tools: [],
      context: [],
      state: {},
      forwardedProps: {},
    },
  };
}
