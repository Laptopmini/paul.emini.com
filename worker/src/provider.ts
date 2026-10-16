import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { mockModel } from './mock-model';

// Provider adapter (brief §7): one interface, MiniMax primary, OpenRouter fallback,
// chosen by env; `mock` is a scripted model for local UI work and e2e tests. Keys are Worker secrets (local: forwarded from the shell).

export type ProviderEnv = {
  LLM_PROVIDER?: string;
  LLM_MODEL?: string;
  MINIMAX_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
};

type ProviderId = 'minimax' | 'openrouter' | 'mock';

const DEFAULT_MODELS: Record<Exclude<ProviderId, 'mock'>, string> = {
  minimax: 'MiniMax-M3',
  openrouter: 'minimax/minimax-m3',
};

/**
 * MiniMax returns reasoning inline as <think>…</think> unless asked to split it out;
 * with `reasoning_split` it arrives as `reasoning_content`, which the AI SDK treats as
 * reasoning (never shown to visitors).
 */
function withJsonBody(extra: Record<string, unknown>): typeof fetch {
  return async (input, init) => {
    if (init?.body && typeof init.body === 'string') {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      return fetch(input, { ...init, body: JSON.stringify({ ...body, ...extra }) });
    }
    return fetch(input, init);
  };
}

export function resolveProvider(env: ProviderEnv): ProviderId {
  const id = (env.LLM_PROVIDER ?? 'minimax').toLowerCase();
  if (id === 'minimax' || id === 'openrouter' || id === 'mock') return id;
  throw new Error(`Unknown LLM_PROVIDER "${env.LLM_PROVIDER}"`);
}

export function createModel(env: ProviderEnv): LanguageModel {
  const provider = resolveProvider(env);
  if (provider === 'mock') return mockModel();
  const model = env.LLM_MODEL || DEFAULT_MODELS[provider];

  if (provider === 'minimax') {
    if (!env.MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY is not set');
    return createOpenAICompatible({
      name: 'minimax',
      baseURL: 'https://api.minimax.io/v1',
      apiKey: env.MINIMAX_API_KEY,
      includeUsage: true,
      fetch: withJsonBody({ reasoning_split: true }),
    }).chatModel(model);
  }

  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set');
  return createOpenAICompatible({
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: env.OPENROUTER_API_KEY,
    includeUsage: true,
    headers: { 'HTTP-Referer': 'https://paul.emini.com', 'X-Title': 'paul.emini.com' },
    // Keep reasoning out of the visible text; OpenRouter returns it separately.
    fetch: withJsonBody({ reasoning: { exclude: true } }),
  }).chatModel(model);
}
