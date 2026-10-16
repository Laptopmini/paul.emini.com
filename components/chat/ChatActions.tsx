'use client';

import { createContext, useContext } from 'react';

/** Lets cards inside agent messages ask a follow-up (pills, "Details"). */
export const ChatActions = createContext<{ ask: (prompt: string) => void; busy: boolean }>({
  ask: () => {},
  busy: false,
});

export const useChatActions = () => useContext(ChatActions);
