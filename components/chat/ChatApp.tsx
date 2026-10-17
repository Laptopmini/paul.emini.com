'use client';

import { CopilotKitProvider } from '@copilotkit/react-core/v2';
import { AGENT_URL } from '@/lib/agent-config';
import { getSession } from '@/lib/agent-session';
import { AGENT_ID, SESSION_HEADER } from '@/shared/agent';
import { ChatView } from './ChatView';
import { renderers } from './renderers';

/** Every agent request carries the Turnstile-backed session (lib/agent-session.ts). */
const sessionHeaders = async () => ({ [SESSION_HEADER]: await getSession() });

/** The chat, loaded on demand: CopilotKit (headless) + our renderers and views. */
export default function ChatApp({ active }: { active: boolean }) {
  return (
    <CopilotKitProvider
      runtimeUrl={AGENT_URL || undefined}
      agentId={AGENT_ID}
      headers={sessionHeaders}
      renderToolCalls={renderers}
      enableInspector={false}
      showIntelligenceIndicator={false}
    >
      <ChatView active={active} />
    </CopilotKitProvider>
  );
}
