import { profile } from '@/content';
import {
  type CannedTool,
  type ContactResult,
  QUOTA_EVENT,
  type QuotaValue,
  type RestingResult,
} from '@/shared/agent';

// Replies the Worker sends without calling the model (guardrails), as AG-UI events the
// chat renders like any other turn.

type Item =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; name: CannedTool | 'draftContactEmail' | 'suggestFollowUps'; result: unknown };

export const quotaEvent = (value: QuotaValue) => ({ type: 'CUSTOM', name: QUOTA_EVENT, value });

const sse = (events: object[]) =>
  new TextEncoder().encode(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''));

/** A whole canned run: RUN_STARTED, the quota, the items, RUN_FINISHED. */
export function cannedEvents(
  ids: { threadId: string; runId: string },
  items: Item[],
  quota?: QuotaValue,
): object[] {
  return [
    { type: 'RUN_STARTED', ...ids },
    ...(quota ? [quotaEvent(quota)] : []),
    ...itemEvents(items),
    { type: 'RUN_FINISHED', ...ids },
  ];
}

/** The items as one assistant message: text and tool calls with their results. */
export function itemEvents(items: Item[]): object[] {
  const messageId = crypto.randomUUID();
  const events: object[] = [];
  for (const item of items) {
    if (item.kind === 'text') {
      events.push(
        { type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' },
        { type: 'TEXT_MESSAGE_CONTENT', messageId, delta: item.text },
        { type: 'TEXT_MESSAGE_END', messageId },
      );
      continue;
    }
    const toolCallId = crypto.randomUUID();
    events.push(
      { type: 'TOOL_CALL_START', toolCallId, toolCallName: item.name, parentMessageId: messageId },
      { type: 'TOOL_CALL_ARGS', toolCallId, delta: '{}' },
      { type: 'TOOL_CALL_END', toolCallId },
      {
        type: 'TOOL_CALL_RESULT',
        messageId: crypto.randomUUID(),
        toolCallId,
        role: 'tool',
        content: JSON.stringify(item.result),
      },
    );
  }
  return events;
}

export function cannedResponse(events: object[], headers: HeadersInit): Response {
  const response = new Response(sse(events), { headers });
  response.headers.set('content-type', 'text/event-stream');
  response.headers.set('cache-control', 'no-cache');
  return response;
}

function hoursUntil(iso: string, now: Date): number {
  return Math.max(1, Math.round((new Date(iso).getTime() - now.getTime()) / 3_600_000));
}

/** The visitor used up today's questions: hand over to email. */
export function dailyLimitItems(quota: QuotaValue, now: Date): Item[] {
  const hours = hoursUntil(quota.resetsAt, now);
  const contact: ContactResult = {
    email: profile.email,
    subject: 'Hello from paul.emini.com',
    draft: 'Hi Paul — I was chatting with the agent on your site, and I’d love to talk more.',
  };
  return [
    {
      kind: 'text',
      text: `That’s all the questions I can answer today (they reset in about ${hours} hour${hours === 1 ? '' : 's'}). The real me is happy to keep going, though: send me a note.`,
    },
    { kind: 'tool', name: 'draftContactEmail', result: contact },
  ];
}

export const offTopicItems = (): Item[] => [{ kind: 'tool', name: 'offTopicRedirect', result: {} }];

/** Follow-ups when the model's own are missing or unusable: the persona's prompts not asked yet. */
export const unaskedPrompts = (prompts: string[], asked: string[]) =>
  prompts.filter((p) => !asked.includes(p)).slice(0, 3);

export const restingItems = (reason: RestingResult['reason']): Item[] => [
  { kind: 'tool', name: 'agentResting', result: { reason } satisfies RestingResult },
];
