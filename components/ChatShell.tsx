'use client';

import { lazy, type ReactNode, Suspense } from 'react';
import { useChatState } from '@/lib/chat-store';

const ChatApp = lazy(() => import('@/components/chat/ChatApp'));

/**
 * Hosts the server-rendered landing and, once a question is asked, the chat. Both stay
 * mounted so Back/forward and asking again keep the conversation.
 */
export function ChatShell({ children }: { children: ReactNode }) {
  const { view, started } = useChatState();
  return (
    <>
      <div hidden={view === 'chat'}>{children}</div>
      {started && (
        <div hidden={view !== 'chat'}>
          <Suspense fallback={null}>
            <ChatApp active={view === 'chat'} />
          </Suspense>
        </div>
      )}
    </>
  );
}
