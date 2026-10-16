'use client';

import { CopilotKitProvider } from '@copilotkit/react-core/v2';
import { AGENT_URL } from '@/lib/agent-config';
import { AGENT_ID } from '@/shared/agent';
import { ChatView } from './ChatView';
import { renderers } from './renderers';

/** The chat, loaded on demand: CopilotKit (headless) + our renderers and views. */
export default function ChatApp({ active }: { active: boolean }) {
  return (
    <CopilotKitProvider
      runtimeUrl={AGENT_URL || undefined}
      agentId={AGENT_ID}
      renderToolCalls={renderers}
      enableInspector={false}
      showIntelligenceIndicator={false}
    >
      <ChatView active={active} />
    </CopilotKitProvider>
  );
}
