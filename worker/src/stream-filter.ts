import { itemEvents } from './canned';

// Filters the AG-UI event stream before it reaches the browser:
// - reasoning events never leave the Worker (the model's private chain of thought);
// - RUN_STARTED's echo of the server-side input is removed;
// - RUN_ERROR carries a generic message: provider errors name the provider and the
//   account's state ("insufficient balance"), which belong in the Worker's logs only;
// - the turn ends as soon as suggestFollowUps has returned: the Worker sends
//   RUN_FINISHED itself and stops the run, so nothing the model produces after the
//   follow-up pills reaches the visitor (or costs more tokens). If the model called it
//   before writing anything, the turn ends after its first text message instead;
// - text written before the first data tool is narration ("I'll pull up…"), written
//   blind: it's held back and only sent if the model never writes its real answer.
//   Text before suggestFollowUps with no data tool (a decline, a greeting) is the answer.

const HIDDEN = /^(REASONING|THINKING)_/;
const CLOSING_TOOL = 'suggestFollowUps';

/** A suggestFollowUps result with at least one question (not an error, not emptied). */
function hasQuestions(content: unknown): boolean {
  try {
    const value = typeof content === 'string' ? JSON.parse(content) : content;
    return Array.isArray(value?.questions) && value.questions.length > 0;
  } catch {
    return false;
  }
}

type AgUiEvent = {
  type?: string;
  input?: unknown;
  toolCallId?: string;
  toolCallName?: string;
  delta?: string;
  content?: unknown;
  threadId?: string;
  runId?: string;
};
export type Decision = 'keep' | 'drop' | 'finish';

const RUN_ERROR = {
  type: 'RUN_ERROR',
  message: 'The agent is unavailable right now.',
  code: 'agent_unavailable',
};

export function createEventFilter() {
  let closingCallId: string | undefined;
  let wroteText = false;
  let closed = false; // follow-ups returned, waiting for the reply's text
  return (event: AgUiEvent): Decision => {
    const type = event.type ?? '';
    if (HIDDEN.test(type)) return 'drop';
    if (type === 'TEXT_MESSAGE_CONTENT' && event.delta?.trim()) wroteText = true;
    if (type === 'TOOL_CALL_START' && event.toolCallName === CLOSING_TOOL) {
      closingCallId = event.toolCallId;
    }
    if (type === 'TOOL_CALL_RESULT' && closingCallId && event.toolCallId === closingCallId) {
      if (wroteText) return 'finish';
      closed = true;
      return 'keep';
    }
    if (closed && type === 'TEXT_MESSAGE_END' && wroteText) return 'finish';
    // Anything but text after the follow-ups (another tool call) is dropped.
    if (closed && type.startsWith('TOOL_CALL_')) return 'drop';
    return 'keep';
  };
}

export type RunIds = { threadId?: string; runId?: string };

/**
 * Applies the filter to an SSE body made of `data: {json}\n\n` frames. On 'finish' the
 * visitor's stream gets a RUN_FINISHED and closes; `onFinish` should stop the run, and
 * the rest of the upstream is drained (never cancelled from outside, which would leave
 * the runtime's thread marked as running). Await `done` (e.g. with ctx.waitUntil).
 *
 * `hold` (the topic gate) is awaited before anything after RUN_STARTED is sent: null
 * lets the run through, a list of events replaces it (and the run is stopped).
 */
export function filterSseStream(
  body: ReadableStream<Uint8Array>,
  decide: (event: AgUiEvent) => Decision,
  options: {
    onFinish?: (run: RunIds) => Promise<unknown> | undefined;
    /** The visitor's thread id, restored on events that carry the server-side one. */
    clientThreadId?: string;
    /** Sent right after RUN_STARTED (the visitor's quota). */
    afterStart?: object[];
    hold?: Promise<object[] | null>;
    /** How the model run ended, once: answered, or failed with RUN_ERROR. */
    onOutcome?: (ok: boolean) => void;
    /** Events to show instead of a RUN_ERROR (the resting card), or null for the error. */
    onError?: () => object[] | null;
    /**
     * Follow-up questions to show when the model's own are missing or unusable: it
     * finished without calling suggestFollowUps, or the call failed or kept nothing.
     */
    fallbackQuestions?: () => string[];
  } = {},
): { stream: ReadableStream<Uint8Array>; done: Promise<void> } {
  const { onFinish, clientThreadId, afterStart = [], onOutcome } = options;
  let hold = options.hold;
  let reported = false;
  let followUpsCallId: string | undefined;
  const report = (ok: boolean) => {
    if (reported) return;
    reported = true;
    onOutcome?.(ok);
  };
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let buffer = '';
  let run: RunIds = {};
  let open = true;
  // Text frames before the first tool call; set aside as narration if it's a data tool.
  let held: [AgUiEvent, string][] = [];
  let narration: [AgUiEvent, string][] = [];
  let toolSeen = false;
  let answered = false;

  const send = async (frame: string) => {
    if (!open) return;
    try {
      await writer.write(encoder.encode(`${frame}\n\n`));
    } catch {
      open = false; // the visitor left; keep draining so the run ends normally
    }
  };

  const close = async () => {
    if (!open) return;
    open = false;
    await writer.close().catch(() => {});
  };

  const handle = async (frame: string) => {
    const data = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    let event: AgUiEvent | undefined;
    try {
      event = data ? (JSON.parse(data) as AgUiEvent) : undefined;
    } catch {
      event = undefined; // not JSON: pass through untouched
    }
    if (!event) return send(frame);
    if (event.type === 'RUN_STARTED') run = { threadId: event.threadId, runId: event.runId };

    if (hold && event.type !== 'RUN_STARTED') {
      const replacement = await hold;
      hold = undefined;
      if (replacement) {
        for (const e of replacement) await send(`data: ${JSON.stringify(e)}`);
        return end();
      }
    }
    if (event.type === 'RUN_ERROR') {
      report(false);
      const instead = options.onError?.();
      if (!instead) return send(`data: ${JSON.stringify(RUN_ERROR)}`);
      for (const e of instead) await send(`data: ${JSON.stringify(e)}`);
      const threadId = clientThreadId ?? run.threadId;
      await send(`data: ${JSON.stringify({ type: 'RUN_FINISHED', threadId, runId: run.runId })}`);
      return close();
    }
    if (!toolSeen && event.type?.startsWith('TEXT_MESSAGE_')) {
      held.push([event, frame]);
      return;
    }
    if (!toolSeen && event.type === 'TOOL_CALL_START') {
      toolSeen = true;
      if (event.toolCallName === CLOSING_TOOL) {
        for (const [e, f] of held) await forward(e, f);
      } else {
        narration = held;
      }
      held = [];
    }
    if (event.type === 'TOOL_CALL_START' && event.toolCallName === CLOSING_TOOL) {
      followUpsCallId = event.toolCallId;
    }
    if (
      event.type === 'TOOL_CALL_RESULT' &&
      event.toolCallId === followUpsCallId &&
      !hasQuestions(event.content)
    ) {
      const questions = options.fallbackQuestions?.() ?? [];
      if (questions.length > 0) event = { ...event, content: JSON.stringify({ questions }) };
    }
    if (event.type === 'RUN_FINISHED') {
      report(true);
      // No real answer: the held text is better than none.
      for (const [e, f] of toolSeen ? (answered ? [] : narration) : held) await pass(e, f);
      const questions = followUpsCallId ? [] : (options.fallbackQuestions?.() ?? []);
      if (questions.length > 0) {
        const items = [{ kind: 'tool', name: CLOSING_TOOL, result: { questions } } as const];
        for (const e of itemEvents(items)) await send(`data: ${JSON.stringify(e)}`);
      }
    }

    await forward(event, frame);
  };

  const pass = (event: AgUiEvent, frame: string) => {
    if (event.type === 'TEXT_MESSAGE_CONTENT' && event.delta?.trim()) answered = true;
    return send(frame);
  };

  const end = async () => {
    const threadId = clientThreadId ?? run.threadId;
    await send(`data: ${JSON.stringify({ type: 'RUN_FINISHED', threadId, runId: run.runId })}`);
    await close();
    await onFinish?.(run);
  };

  const forward = async (event: AgUiEvent, frame: string) => {
    const decision = decide(event);
    if (decision === 'drop') return;
    // RUN_STARTED echoes the whole (server-side) input: every message plus the session
    // context. The browser already has the conversation, so it's dropped.
    const rewrite =
      (clientThreadId && event.threadId) ||
      event.input !== undefined ||
      event.content !== undefined;
    const { input: _input, ...rest } = event;
    const forClient = rewrite
      ? `data: ${JSON.stringify({ ...rest, ...(clientThreadId && event.threadId ? { threadId: clientThreadId } : {}) })}`
      : frame;
    await pass(event, forClient);
    if (event.type === 'RUN_STARTED') {
      for (const e of afterStart) await send(`data: ${JSON.stringify(e)}`);
    }
    if (decision === 'finish') {
      report(true);
      await end();
    }
  };

  const done = (async () => {
    const reader = body.getReader();
    try {
      for (;;) {
        const { value, done: ended } = await reader.read();
        if (ended) break;
        if (!open) continue; // draining after the visitor's turn ended
        buffer += decoder.decode(value, { stream: true });
        let end = buffer.indexOf('\n\n');
        while (end !== -1 && open) {
          await handle(buffer.slice(0, end));
          buffer = buffer.slice(end + 2);
          end = buffer.indexOf('\n\n');
        }
      }
      buffer += decoder.decode();
      if (open && buffer.trim()) await handle(buffer.trimEnd());
    } finally {
      await close();
    }
  })();

  return { stream: readable, done };
}
