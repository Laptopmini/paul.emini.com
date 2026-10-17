import { defineConfig } from 'vitest/config';
import base from './vitest.config';

// Agent evals: real model, through a running dev Worker (`pnpm worker:dev`, or
// EVAL_AGENT_URL). Slow and costs a few cents, so they're a separate command. The model
// varies run to run, so a failing case gets two more tries: a regression fails every
// time, a one-off slip doesn't fail the build.
export default defineConfig({
  ...base,
  test: { include: ['evals/**/*.eval.ts'], testTimeout: 60_000, maxConcurrency: 4, retry: 2 },
});
