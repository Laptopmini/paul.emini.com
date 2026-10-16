import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotRuntimeHandler,
  defineTool,
} from '@copilotkit/runtime/v2';
import { z } from 'zod';
import { scriptedModel } from './scripted-model';

// SPIKE: proves the CopilotKit runtime runs on Cloudflare Workers with a server tool.
// Replace with the real agent (tools over /content, provider adapter) in Phase 5.

const getProfileStub = defineTool({
  name: 'getProfileStub',
  description: 'Returns a stub profile field.',
  parameters: z.object({ field: z.enum(['location', 'name']) }),
  execute: async ({ field }) => ({
    field,
    value: field === 'location' ? 'San Francisco, CA' : 'Paul‑Valentin Mini',
  }),
});

function buildHandler() {
  const runtime = new CopilotRuntime({
    agents: {
      default: new BuiltInAgent({ model: scriptedModel(), tools: [getProfileStub], maxSteps: 3 }),
    },
  });
  return createCopilotRuntimeHandler({
    runtime,
    basePath: '/api/copilotkit',
    cors: true,
    activateChannels: false,
  });
}

let handler: ReturnType<typeof buildHandler> | undefined;

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/health') return Response.json({ ok: true });
    handler ??= buildHandler();
    return handler(request);
  },
} satisfies ExportedHandler;
