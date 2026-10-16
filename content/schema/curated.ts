import type { Award, Experience, Project } from './index';

// Curated card copy (`short`, `blurb`, `tags`) is written from résumé text. Each entry
// stores `curatedFrom`: a fingerprint of the source fields at the time the copy was
// last reviewed. When the source changes, the fingerprint no longer matches and
// `pnpm test:content` fails until the copy is re-reviewed and the fingerprint updated.

/** FNV-1a, 32-bit. Not cryptographic; only detects change. Runs anywhere (no node:crypto). */
function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const join = (parts: string[]) => fnv1a(parts.join('␞'));

export function curatedSource(
  entry:
    | { kind: 'experience'; value: Experience }
    | { kind: 'project'; value: Project }
    | { kind: 'award'; value: Award },
): string {
  switch (entry.kind) {
    case 'experience':
      return join([...entry.value.highlights.map((h) => h.text), ...entry.value.stack]);
    case 'project':
      return join([
        entry.value.summary,
        ...entry.value.highlights.map((h) => h.text),
        ...entry.value.stack,
      ]);
    case 'award':
      return join([entry.value.description]);
  }
}
