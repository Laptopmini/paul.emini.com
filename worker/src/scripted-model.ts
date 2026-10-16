import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

// SPIKE ONLY: a key-free model that calls the stub tool once, then answers with
// its result. Exercises the real BuiltInAgent tool loop without an LLM provider.
const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

export function scriptedModel() {
  return new MockLanguageModelV3({
    doStream: async ({ prompt }) => {
      const last = prompt.at(-1);
      const toolResult = last?.role === 'tool' ? last.content[0] : undefined;

      const chunks: LanguageModelV3StreamPart[] = toolResult
        ? [
            { type: 'stream-start', warnings: [] },
            { type: 'text-start', id: 't1' },
            {
              type: 'text-delta',
              id: 't1',
              delta: `Stub tool returned: ${JSON.stringify(
                toolResult.type === 'tool-result' ? toolResult.output : null,
              )}`,
            },
            { type: 'text-end', id: 't1' },
            { type: 'finish', usage, finishReason: { unified: 'stop', raw: 'stop' } },
          ]
        : [
            { type: 'stream-start', warnings: [] },
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'getProfileStub',
              input: JSON.stringify({ field: 'location' }),
            },
            { type: 'finish', usage, finishReason: { unified: 'tool-calls', raw: 'tool_calls' } },
          ];

      return { stream: simulateReadableStream({ chunks }) };
    },
  });
}
