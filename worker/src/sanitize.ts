import { type PersonaId, personaIds } from '@/content/schema';
import { CANNED_TOOLS, MAX_PROMPT_LENGTH } from '@/shared/agent';

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
  /** Every question in the conversation; the last is the new one. */
  questions: string[];
  /** The visitor's new question, and the one before it (context for the topic gate). */
  question: string;
  previousQuestion?: string;
  /** Follow-ups the agent last suggested; picking one skips the topic gate. */
  lastFollowUps: string[];
};

type ToolCall = { id?: unknown; function?: { name?: unknown; arguments?: unknown } };

const canned = new Set<unknown>(CANNED_TOOLS);

/** Questions from the last suggestFollowUps call in the history. */
function followUpsIn(messages: Message[]): string[] {
  for (const m of [...messages].reverse()) {
    const call = (m.toolCalls as ToolCall[] | undefined)?.find(
      (c) => c.function?.name === 'suggestFollowUps',
    );
    if (!call) continue;
    try {
      const { questions } = JSON.parse(String(call.function?.arguments)) as { questions?: unknown };
      return Array.isArray(questions) ? questions.filter((q) => typeof q === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Cards the Worker sent on its own (off-topic, resting) aren't model tools: drop their
 * calls and results so the model never sees tools it doesn't have.
 */
function withoutCannedCards(messages: Message[]): Message[] {
  const dropped = new Set<unknown>();
  return messages
    .map((m) => {
      if (!Array.isArray(m.toolCalls)) return m;
      const calls = (m.toolCalls as ToolCall[]).filter((c) => {
        if (!canned.has(c.function?.name)) return true;
        dropped.add(c.id);
        return false;
      });
      const { toolCalls: _, ...rest } = m;
      return calls.length > 0 ? { ...rest, toolCalls: calls } : rest;
    })
    .filter((m) => !(m.role === 'tool' && dropped.has(m.toolCallId)))
    .filter((m) => m.role !== 'assistant' || m.toolCalls || String(m.content ?? '').trim());
}

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

  const messages = withoutCannedCards(
    (input.messages as Message[])
      .slice(-MAX_MESSAGES)
      .map(cleanMessage)
      .filter((m): m is Message => m !== null),
  );
  if (messages.at(-1)?.role !== 'user')
    throw new BadRequest('The last message must be from the user');

  const props = (input.forwardedProps ?? {}) as Record<string, unknown>;
  const persona = personaIds.find((id) => id === props.persona) ?? 'visitor';
  const questions = messages.filter((m) => m.role === 'user').map((m) => String(m.content));
  const userTurns = questions.length;

  // Every request carries the whole conversation, so runs don't need server-side thread
  // state. A fresh thread id per run means a run that is still winding down can never
  // block the visitor's next question ("Thread already running").
  return {
    persona,
    userTurns,
    questions,
    question: questions.at(-1) ?? '',
    previousQuestion: questions.at(-2),
    lastFollowUps: followUpsIn(messages),
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
