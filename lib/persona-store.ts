import { useCallback, useSyncExternalStore } from 'react';
import type { PersonaId } from '@/content';

// Persona choice, persisted per visitor. localStorage can be unavailable (private mode,
// blocked storage), so an in-memory value backs it and every access is guarded.

const KEY = 'pvm.persona';
const listeners = new Set<() => void>();
let memory: string | null = null;

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Ids and fallback are passed in (not imported from /content) so this client module
 * doesn't pull every content file into the bundle.
 */
export function usePersona(
  ids: readonly PersonaId[],
  fallback: PersonaId,
): [PersonaId, (id: PersonaId) => void] {
  // Server snapshot is null, so the static HTML always renders the fallback persona.
  const stored = useSyncExternalStore(subscribe, read, () => null);
  const persona = ids.find((id) => id === stored) ?? fallback;

  const setPersona = useCallback((id: PersonaId) => {
    memory = id;
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      // Storage blocked: the in-memory value still applies for this page view.
    }
    for (const listener of listeners) listener();
  }, []);

  return [persona, setPersona];
}
