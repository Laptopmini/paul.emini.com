'use client';

import {
  UseAgentUpdate,
  useAgent,
  useCopilotKit,
  useRenderToolCall,
} from '@copilotkit/react-core/v2';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CardEnter } from '@/components/cards';
import { ChatDock } from '@/components/landing/ChatDock';
import { DEFAULT_PERSONA, github, meta, personas } from '@/content';
import { personaIds } from '@/content/schema';
import { setTurnstileSlot } from '@/lib/agent-session';
import { takePending, useChatState } from '@/lib/chat-store';
import {
  arrangeItems,
  type MessageLike,
  sourceLine,
  statusText,
  type Turn,
  toTurns,
} from '@/lib/chat-turns';
import { usePersona } from '@/lib/persona-store';
import { QUOTA_EVENT, type QuotaValue } from '@/shared/agent';
import { ChatActions } from './ChatActions';
import { ChatHeader } from './ChatHeader';
import styles from './chat.module.css';
import { FormattedText } from './FormattedText';

const personaOptions = personas.map(({ id, label, hint }) => ({ id, label, hint }));
const READY_TIMEOUT_MS = 10_000;
/** The footnote starts counting down at this many questions left. */
const QUOTA_NOTICE_AT = 5;

function quotaNote(quota: QuotaValue | null): string | null {
  if (!quota || quota.remaining > QUOTA_NOTICE_AT) return null;
  if (quota.remaining === 0) return 'No questions left today';
  return `${quota.remaining} question${quota.remaining === 1 ? '' : 's'} left today`;
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className={styles.user}>
      <span className="sr-only">You: </span>
      {text}
    </div>
  );
}

function AgentTurn({
  turn,
  working,
  failed,
  onRetry,
}: {
  turn: Turn;
  working: boolean;
  failed: boolean;
  onRetry: () => void;
}) {
  const renderToolCall = useRenderToolCall();
  const source = sourceLine(
    turn.items.flatMap((i) => (i.kind === 'tool' ? [i.toolCall.function.name] : [])),
    { resumeSyncedAt: meta.resumeSyncedAt, githubFetchedAt: github.fetchedAt, now: new Date() },
  );
  return (
    <article className={styles.agent} aria-label="Paul’s agent">
      <div className={styles.agentHead}>
        <span className={styles.avatar} aria-hidden="true">
          PVM
        </span>
        {source && <span className={styles.source}>{source}</span>}
      </div>
      {arrangeItems(turn.items, working).map((item) =>
        item.kind === 'text' ? (
          <CardEnter key={item.id}>
            <FormattedText text={item.text} />
          </CardEnter>
        ) : (
          <div key={item.id} className={styles.toolSlot}>
            {renderToolCall({
              // AG-UI message objects, passed through untouched.
              toolCall: item.toolCall as Parameters<typeof renderToolCall>[0]['toolCall'],
              toolMessage: item.toolMessage as Parameters<typeof renderToolCall>[0]['toolMessage'],
            })}
          </div>
        ),
      )}
      {working && (
        <p className={styles.working} role="status">
          <span className={styles.dots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          {statusText(turn)}
        </p>
      )}
      {failed && (
        <div className={styles.error} role="alert">
          <p className={styles.text}>I couldn’t answer that one just now.</p>
          <button type="button" className={styles.pill} onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </article>
  );
}

export function ChatView({ active }: { active: boolean }) {
  const { agent, isReady } = useAgent({
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  const { copilotkit } = useCopilotKit();
  const [persona, setPersona] = usePersona(personaIds, DEFAULT_PERSONA);
  const [failedTurn, setFailedTurn] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [quota, setQuota] = useState<QuotaValue | null>(null);
  const { pending } = useChatState();
  const inputRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);

  // Not memoized on agent.messages: addMessage mutates that array in place, so a memo
  // would hide the visitor's question until the reply replaced the array.
  const turns = toTurns(agent.messages as MessageLike[]);
  const running = agent.isRunning;

  const run = useCallback(async () => {
    const turnId = agent.messages.findLast((m) => m.role === 'user')?.id ?? null;
    setFailedTurn(null);
    try {
      await copilotkit.runAgent({ agent, forwardedProps: { persona } });
      // A run that produced nothing at all is a failure from the visitor's point of view.
      const last = toTurns(agent.messages as MessageLike[]).at(-1);
      if (last && last.items.length === 0) setFailedTurn(turnId);
    } catch {
      setFailedTurn(turnId);
    }
  }, [agent, copilotkit, persona]);

  const ask = useCallback(
    (prompt: string) => {
      if (agent.isRunning) return;
      stickToBottom.current = true;
      agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: prompt });
      void run();
    },
    [agent, run],
  );

  // Prompt handed over from the landing (first question, or a later one).
  useEffect(() => {
    if (!pending || !isReady) return;
    const prompt = takePending();
    if (prompt) ask(prompt);
  }, [pending, isReady, ask]);

  useEffect(() => {
    if (isReady) return;
    const timer = window.setTimeout(() => setUnavailable(true), READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isReady]);

  useEffect(() => {
    if (active) inputRef.current?.focus({ preventScroll: true });
  }, [active]);

  // The Worker sends the visitor's questions left today with every run.
  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onCustomEvent: ({ event }) => {
        if (event.name === QUOTA_EVENT) setQuota(event.value as QuotaValue);
      },
    });
    return unsubscribe;
  }, [agent]);

  // Follow the conversation while it grows, unless the visitor scrolls up to read.
  useEffect(() => {
    if (!active) return;
    const onScroll = () => {
      const distance = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      stickToBottom.current = distance < 160;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [active]);

  const contentKey = `${agent.messages.length}:${JSON.stringify(agent.messages.at(-1) ?? '').length}:${running}`;
  useEffect(() => {
    if (!contentKey || !active || !stickToBottom.current) return;
    // The dock is sticky at the end of the page, so the bottom of the page is the
    // newest content sitting just above it.
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [contentKey, active]);

  const lastTurn = turns.at(-1);
  const note = quotaNote(quota);
  const suggestions = (personas.find((p) => p.id === persona) ?? personas[0])?.prompts ?? [];
  return (
    <ChatActions.Provider value={{ ask, busy: running, suggestions }}>
      <div className={styles.chat}>
        <ChatHeader personas={personaOptions} persona={persona} onPersona={setPersona} />
        <main className={styles.main} aria-label="Conversation">
          <h1 className="sr-only">Conversation with Paul’s agent</h1>
          <div role="log" aria-live="polite" aria-busy={running} className={styles.log}>
            {turns.map((turn) => (
              <div key={turn.id} className={styles.turn}>
                <UserBubble text={turn.prompt} />
                <AgentTurn
                  turn={turn}
                  working={running && turn === lastTurn}
                  failed={failedTurn === turn.id && !running}
                  onRetry={() => void run()}
                />
              </div>
            ))}
            {turns.length === 0 && !unavailable && (
              <p className={styles.working} role="status">
                <span className={styles.dots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                Connecting…
              </p>
            )}
            {unavailable && !isReady && (
              <div className={styles.error} role="alert">
                <p className={styles.text}>
                  The agent isn’t reachable right now. Everything on the home page still works, and
                  the résumé is one click away.
                </p>
              </div>
            )}
          </div>
        </main>
        <div className={styles.dockBar}>
          <div className={styles.dockInner}>
            {/* Turnstile shows a challenge here only if Cloudflare asks for one. */}
            <div ref={setTurnstileSlot} className={styles.turnstile} />
            <ChatDock
              onSubmit={ask}
              busy={running || !isReady}
              label="Ask a follow-up"
              placeholder="Ask a follow-up…"
              inputRef={inputRef}
            />
            <p className={styles.footnote}>
              {note && <strong className={styles.quota}>{note} · </strong>}
              It can make mistakes — email Paul for anything that matters.
            </p>
          </div>
        </div>
      </div>
    </ChatActions.Provider>
  );
}
