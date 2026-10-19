import type { LanguageModelV3Prompt, LanguageModelV3StreamPart } from '@ai-sdk/provider';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import type { ToolName } from '@/shared/agent';

// LLM_PROVIDER=mock: a key-free, deterministic model for local UI work and e2e tests.
// It picks tools from keywords in the last question, then says one line and suggests
// follow-ups, exercising the same tool loop and cards as the real model.

type Call = { name: ToolName; args: Record<string, unknown> };

const PLANS: [RegExp, Call[], string][] = [
  [
    /skill/i,
    [{ name: 'getSkills', args: { highlight: ['React', 'TypeScript'] } }],
    'Here’s where I’m strongest.',
  ],
  [
    /unified journey|case study|something you led/i,
    [{ name: 'getCaseStudy', args: { id: 'unified-journey' } }],
    'Here’s the project I’m proudest of.',
  ],
  [
    /recent experience|latest role/i,
    [{ name: 'getExperience', args: { latest: true } }],
    'Most recently I was at SmartThings.',
  ],
  [/experience|career|roles?/i, [{ name: 'getExperience', args: {} }], 'Here’s my path so far.'],
  [
    /lately|projects?|ralph|rag/i,
    [{ name: 'getProjects', args: { recent: 2 } }],
    'Two projects stand out.',
  ],
  [
    /open source|contribut|github/i,
    [{ name: 'getContributions', args: { limit: 3 } }],
    'Here’s my recent open-source activity.',
  ],
  [/certif|course/i, [{ name: 'getCertifications', args: {} }], 'Here are my certifications.'],
  [/award/i, [{ name: 'getAwards', args: {} }], 'Here’s an award I’m proud of.'],
  [/educat|degree|school/i, [{ name: 'getEducation', args: {} }], 'Here’s my education.'],
  [
    /say about|recommend/i,
    [
      { name: 'getRecommendations', args: {} },
      {
        name: 'showRecommendation',
        args: {
          id: 'luc-julia',
          excerpt:
            'Responding to our rapid innovation, he always managed to provide elegant solutions to hard engineering and user experience problems.',
        },
      },
    ],
    'Here’s what a former manager said.',
  ],
  [
    /reach|contact|hire|hiring|email/i,
    [{ name: 'draftContactEmail', args: { topicSummary: 'Frontend + AI role' } }],
    'Happy to connect.',
  ],
  [
    /built|architecture/i,
    [{ name: 'getSiteArchitecture', args: {} }],
    'It’s a static Next.js site with an agent on Cloudflare Workers.',
  ],
];

const FOLLOW_UPS: Call = {
  name: 'suggestFollowUps',
  args: { questions: ['What are your top skills?', 'What have you been up to lately?'] },
};

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

function lastUserText(prompt: LanguageModelV3Prompt): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const m = prompt[i];
    if (m?.role === 'user') {
      return m.content.map((p) => (p.type === 'text' ? p.text : '')).join(' ');
    }
  }
  return '';
}

function toolResultsSinceLastUser(prompt: LanguageModelV3Prompt): number {
  let n = 0;
  for (let i = prompt.length - 1; i >= 0 && prompt[i]?.role !== 'user'; i--) {
    if (prompt[i]?.role === 'tool') n++;
  }
  return n;
}

export function mockModel() {
  return new MockLanguageModelV3({
    doStream: async ({ prompt }) => {
      const question = lastUserText(prompt);
      const match = PLANS.find(([re]) => re.test(question));
      const plan = [...(match?.[1] ?? []), FOLLOW_UPS];
      const line = match?.[2] ?? 'I’m here to talk about my work and background. Try one of these:';
      const step = toolResultsSinceLastUser(prompt);
      const chunks: LanguageModelV3StreamPart[] = [{ type: 'stream-start', warnings: [] }];

      const next = plan[step];
      if (next) {
        if (next.name === 'suggestFollowUps') {
          // Unique per stream: the runtime reuses provider text ids as message ids.
          const id = crypto.randomUUID();
          chunks.push(
            { type: 'text-start', id },
            { type: 'text-delta', id, delta: line },
            { type: 'text-end', id },
          );
        }
        chunks.push(
          {
            type: 'tool-call',
            toolCallId: `call_${crypto.randomUUID()}`,
            toolName: next.name,
            input: JSON.stringify(next.args),
          },
          { type: 'finish', usage, finishReason: { unified: 'tool-calls', raw: 'tool_calls' } },
        );
      } else {
        chunks.push({ type: 'finish', usage, finishReason: { unified: 'stop', raw: 'stop' } });
      }
      return { stream: simulateReadableStream({ chunks, chunkDelayInMs: 15 }) };
    },
  });
}
