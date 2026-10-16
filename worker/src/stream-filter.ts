// Filters the AG-UI event stream before it reaches the browser:
// - reasoning events never leave the Worker (the model's private chain of thought);
// - RUN_STARTED's echo of the server-side input is removed;
// - the turn ends as soon as suggestFollowUps has returned: the Worker sends
//   RUN_FINISHED itself and cancels the model stream, so nothing the model produces
//   after the follow-up pills reaches the visitor (or costs more tokens).

const HIDDEN = /^(REASONING|THINKING)_/;
const CLOSING_TOOL = 'suggestFollowUps';

type AgUiEvent = {
  type?: string;
  input?: unknown;
  toolCallId?: string;
  toolCallName?: string;
  threadId?: string;
  runId?: string;
};
export type Decision = 'keep' | 'drop' | 'finish';

export function createEventFilter() {
  let closingCallId: string | undefined;
  return (event: AgUiEvent): Decision => {
    const type = event.type ?? '';
    if (HIDDEN.test(type)) return 'drop';
    if (type === 'TOOL_CALL_START' && event.toolCallName === CLOSING_TOOL) {
      closingCallId = event.toolCallId;
    }
    if (type === 'TOOL_CALL_RESULT' && closingCallId && event.toolCallId === closingCallId) {
      return 'finish';
    }
    return 'keep';
  };
}

export type RunIds = { threadId?: string; runId?: string };

/**
 * Applies the filter to an SSE body made of `data: {json}\n\n` frames. On 'finish' the
 * visitor's stream gets a RUN_FINISHED and closes; `onFinish` should stop the run, and
 * the rest of the upstream is drained (never cancelled from outside, which would leave
 * the runtime's thread marked as running). Await `done` (e.g. with ctx.waitUntil).
 */
export function filterSseStream(
  body: ReadableStream<Uint8Array>,
  decide: (event: AgUiEvent) => Decision,
  options: {
    onFinish?: (run: RunIds) => Promise<unknown> | undefined;
    /** The visitor's thread id, restored on events that carry the server-side one. */
    clientThreadId?: string;
  } = {},
): { stream: ReadableStream<Uint8Array>; done: Promise<void> } {
  const { onFinish, clientThreadId } = options;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let buffer = '';
  let run: RunIds = {};
  let open = true;

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

    const decision = decide(event);
    if (decision === 'drop') return;
    // RUN_STARTED echoes the whole (server-side) input: every message plus the session
    // context. The browser already has the conversation, so it's dropped.
    const rewrite = (clientThreadId && event.threadId) || event.input !== undefined;
    const { input: _input, ...rest } = event;
    const forClient = rewrite
      ? `data: ${JSON.stringify({ ...rest, ...(clientThreadId && event.threadId ? { threadId: clientThreadId } : {}) })}`
      : frame;
    await send(forClient);
    if (decision === 'finish') {
      const threadId = clientThreadId ?? run.threadId;
      await send(`data: ${JSON.stringify({ type: 'RUN_FINISHED', threadId, runId: run.runId })}`);
      await close();
      await onFinish?.(run);
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
