'use client';

import { createContext, useContext } from 'react';

/**
 * Lets cards inside agent messages ask a follow-up (pills, "Details"). `suggestions` are
 * the current persona's prompts, for the off-topic redirect.
 */
export const ChatActions = createContext<{
  ask: (prompt: string) => void;
  busy: boolean;
  suggestions: string[];
}>({ ask: () => {}, busy: false, suggestions: [] });

export const useChatActions = () => useContext(ChatActions);
