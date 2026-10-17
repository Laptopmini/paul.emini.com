import { AsyncLocalStorage } from 'node:async_hooks';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { mockModel } from './mock-model';

// The model behind the agent: OpenRouter (dedicated key with a spend cap and a model
// allow-list), or `mock`, a scripted model for local UI work and e2e tests. Keys are
// Worker secrets (local: forwarded from the shell).

export type ProviderEnv = {
  LLM_PROVIDER?: string;
  /** An OpenRouter model id. The prod key only allows the models on its guardrail. */
  LLM_MODEL?: string;
  OPENROUTER_API_KEY?: string;
};

type ProviderId = 'openrouter' | 'mock';

const DEFAULT_MODEL = 'minimax/minimax-m3';

/**
 * The provider's last error status during the current run, for health tracking and
 * alerts. Each run's request handling executes inside `providerCalls.run(...)`.
 */
export const providerCalls = new AsyncLocalStorage<{ status?: number }>();

function recordingStatus(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await inner(input, init);
    const store = providerCalls.getStore();
    if (store && !response.ok) store.status = response.status;
    return response;
  };
}

/** Merges extra fields into every JSON request body. */
export function withJsonBody(extra: Record<string, unknown>): typeof fetch {
  return async (input, init) => {
    if (init?.body && typeof init.body === 'string') {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      return fetch(input, { ...init, body: JSON.stringify({ ...body, ...extra }) });
    }
    return fetch(input, init);
  };
}

export function resolveProvider(env: ProviderEnv): ProviderId {
  const id = (env.LLM_PROVIDER ?? 'openrouter').toLowerCase();
  if (id === 'openrouter' || id === 'mock') return id;
  throw new Error(`Unknown LLM_PROVIDER "${env.LLM_PROVIDER}"`);
}

export function createModel(env: ProviderEnv): LanguageModel {
  if (resolveProvider(env) === 'mock') return mockModel();
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set');
  return createOpenAICompatible({
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: env.OPENROUTER_API_KEY,
    includeUsage: true,
    headers: { 'HTTP-Referer': 'https://paul.emini.com', 'X-Title': 'paul.emini.com' },
    // Keep reasoning out of the visible text; OpenRouter returns it separately.
    fetch: recordingStatus(withJsonBody({ reasoning: { exclude: true } })),
  }).chatModel(env.LLM_MODEL || DEFAULT_MODEL);
}
