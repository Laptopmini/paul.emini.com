'use client';

import { CopilotKitProvider } from '@copilotkit/react-core/v2';
import { useState } from 'react';
import { AGENT_URL } from '@/lib/agent-config';
import { getSession } from '@/lib/agent-session';
import { AGENT_ID, SESSION_HEADER } from '@/shared/agent';
import { ChatView } from './ChatView';
import { renderers } from './renderers';

/** Every agent request carries the Turnstile-backed session (lib/agent-session.ts). */
const sessionHeaders = async () => ({ [SESSION_HEADER]: await getSession() });

/** The chat, loaded on demand: CopilotKit (headless) + our renderers and views. */
export default function ChatApp({ active }: { active: boolean }) {
  // A new key starts over (human check, runtime info) when the first connection failed.
  const [connection, setConnection] = useState(0);
  return (
    <CopilotKitProvider
      key={connection}
      runtimeUrl={AGENT_URL || undefined}
      agentId={AGENT_ID}
      headers={sessionHeaders}
      renderToolCalls={renderers}
      enableInspector={false}
      showIntelligenceIndicator={false}
    >
      <ChatView active={active} onReconnect={() => setConnection((n) => n + 1)} />
    </CopilotKitProvider>
  );
}
