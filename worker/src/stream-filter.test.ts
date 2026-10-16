import { describe, expect, it } from 'vitest';
import { createEventFilter, filterSseStream, type RunIds } from './stream-filter';

const encode = (events: object[]) =>
  new TextEncoder().encode(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''));

function streamOf(bytes: Uint8Array, chunkSize: number, onCancel?: () => void) {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(c) {
      if (i >= bytes.length) return c.close();
      c.enqueue(bytes.slice(i, i + chunkSize));
      i += chunkSize;
    },
    cancel: onCancel,
  });
}

async function run(
  events: object[],
  options: {
    chunkSize?: number;
    onCancel?: () => void;
    onFinish?: (run: RunIds) => undefined;
  } = {},
) {
  const { stream, done } = filterSseStream(
    streamOf(encode(events), options.chunkSize ?? 7, options.onCancel),
    createEventFilter(),
    { onFinish: options.onFinish, clientThreadId: 'client-thread' },
  );
  const out = await new Response(stream).text();
  await done;
  return out
    .split('\n\n')
    .filter(Boolean)
    .map((f) => JSON.parse(f.slice(6)) as { type: string; runId?: string; threadId?: string });
}

describe('event filter', () => {
  it('drops reasoning and ends the visitor’s run right after the follow-ups', async () => {
    let cancelled = false;
    let stopped: RunIds | undefined;
    const events = await run(
      [
        { type: 'RUN_STARTED', threadId: 't', runId: 'r', input: { context: ['session'] } },
        { type: 'REASONING_START' },
        { type: 'REASONING_MESSAGE_CONTENT', delta: 'secret thoughts' },
        { type: 'REASONING_END' },
        { type: 'TEXT_MESSAGE_START' },
        { type: 'TEXT_MESSAGE_END' },
        { type: 'TOOL_CALL_START', toolCallId: 'f', toolCallName: 'suggestFollowUps' },
        { type: 'TOOL_CALL_END', toolCallId: 'f' },
        { type: 'TOOL_CALL_RESULT', toolCallId: 'f' },
        { type: 'TEXT_MESSAGE_START' },
        { type: 'TEXT_MESSAGE_CONTENT', delta: 'I sent you a contact card' },
        { type: 'RUN_FINISHED', threadId: 't', runId: 'r' },
      ],
      {
        onCancel: () => {
          cancelled = true;
        },
        onFinish: (ids) => {
          stopped = ids;
        },
      },
    );
    expect(events.map((e) => e.type)).toEqual([
      'RUN_STARTED',
      'TEXT_MESSAGE_START',
      'TEXT_MESSAGE_END',
      'TOOL_CALL_START',
      'TOOL_CALL_END',
      'TOOL_CALL_RESULT',
      'RUN_FINISHED',
    ]);
    // The visitor sees their own thread id; the runtime's per-run id stays server-side.
    expect(events[0]).toEqual({ type: 'RUN_STARTED', threadId: 'client-thread', runId: 'r' });
    expect(events.at(-1)).toMatchObject({ threadId: 'client-thread', runId: 'r' });
    // The run is stopped through the runtime and the upstream drained, never cancelled
    // from outside (that leaves the runtime's thread marked as running).
    expect(stopped).toEqual({ threadId: 't', runId: 'r' });
    expect(cancelled).toBe(false);
  });

  it('passes everything else through, across arbitrary chunk boundaries', async () => {
    const events = await run(
      [
        { type: 'TOOL_CALL_START', toolCallId: 'a', toolCallName: 'getSkills' },
        { type: 'TOOL_CALL_RESULT', toolCallId: 'a' },
        { type: 'TEXT_MESSAGE_CONTENT', delta: 'ok' },
        { type: 'RUN_FINISHED' },
      ],
      { chunkSize: 1 },
    );
    expect(events.map((e) => e.type)).toEqual([
      'TOOL_CALL_START',
      'TOOL_CALL_RESULT',
      'TEXT_MESSAGE_CONTENT',
      'RUN_FINISHED',
    ]);
  });
});
