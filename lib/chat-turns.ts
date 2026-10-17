import { formatRelative } from './cards';

// Pure helpers behind the chat view: AG-UI messages → turns, source line, status text.

export type ToolCallLike = { id: string; function: { name: string; arguments: string } };
export type MessageLike =
  | { id: string; role: 'user'; content?: unknown }
  | { id: string; role: 'assistant'; content?: unknown; toolCalls?: ToolCallLike[] }
  | { id: string; role: 'tool'; toolCallId: string; content?: unknown }
  | { id: string; role: string; [key: string]: unknown };

export type TurnItem<T extends ToolCallLike = ToolCallLike, M = MessageLike> =
  | { kind: 'text'; id: string; text: string }
  | { kind: 'tool'; id: string; toolCall: T; toolMessage?: M };

export type Turn = { id: string; prompt: string; items: TurnItem[] };

const textOf = (content: unknown) => (typeof content === 'string' ? content : '');

function parseArgs(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null; // still streaming
  }
}

/** Groups messages into user turns: the prompt, then the agent's text and tool calls in order. */
export function toTurns(messages: readonly MessageLike[]): Turn[] {
  const toolMessages = new Map<string, MessageLike>();
  for (const m of messages) {
    if (m.role === 'tool' && typeof m.toolCallId === 'string') toolMessages.set(m.toolCallId, m);
  }

  const turns: Turn[] = [];
  let shownRecommendations = new Set<string>();
  for (const m of messages) {
    if (m.role === 'user') {
      turns.push({ id: m.id, prompt: textOf(m.content), items: [] });
      shownRecommendations = new Set();
      continue;
    }
    const turn = turns.at(-1);
    if (!turn || m.role !== 'assistant') continue;
    const text = textOf(m.content).trim();
    if (text) turn.items.push({ kind: 'text', id: `${m.id}:text`, text });
    for (const call of (m.toolCalls as ToolCallLike[] | undefined) ?? []) {
      if (call.function.name === 'showRecommendation') {
        const id = parseArgs(call.function.arguments)?.id;
        if (typeof id === 'string') {
          if (shownRecommendations.has(id)) continue;
          shownRecommendations.add(id);
        }
      }
      turn.items.push({
        kind: 'tool',
        id: call.id,
        toolCall: call,
        toolMessage: toolMessages.get(call.id),
      });
    }
  }
  return turns;
}

const isCard = (item: TurnItem) =>
  item.kind === 'tool' && item.toolCall.function.name !== 'suggestFollowUps';

/**
 * Reading order. The agent fetches its cards before it writes about them, but a reply reads
 * better as words first, then the cards behind them: text that follows a run of cards moves
 * ahead of it. While the agent is still working, cards with no text ahead of them yet wait
 * (the status line says what's happening), so streaming text never pushes them down.
 */
export function arrangeItems(items: readonly TurnItem[], working: boolean): TurnItem[] {
  const out: TurnItem[] = [];
  const followUps: TurnItem[] = [];
  let cards: TurnItem[] = [];
  for (const [i, item] of items.entries()) {
    if (item.kind === 'tool' && !isCard(item)) {
      followUps.push(item); // always last, even when the model called it before writing
      continue;
    }
    if (isCard(item)) {
      cards.push(item);
      continue;
    }
    const streaming = working && i === items.length - 1;
    out.push(item, ...(streaming ? [] : cards));
    cards = [];
  }
  if (!working) out.push(...cards);
  return [...out, ...followUps];
}

const GITHUB = new Set(['getContributions']);
const RESUME = new Set([
  'getProfile',
  'getSkills',
  'getExperience',
  'getProjects',
  'getEducation',
  'getCertifications',
  'getAwards',
  'getRecommendations',
  'showRecommendation',
]);

/** "from résumé · synced 2026-10-15", "checked public GitHub · refreshed 6 h ago", or both. */
export function sourceLine(
  toolNames: string[],
  {
    resumeSyncedAt,
    githubFetchedAt,
    now,
  }: { resumeSyncedAt: string; githubFetchedAt: string | null; now: Date },
): string | null {
  const parts: string[] = [];
  if (toolNames.some((n) => RESUME.has(n))) parts.push(`from résumé · synced ${resumeSyncedAt}`);
  if (toolNames.some((n) => GITHUB.has(n))) {
    parts.push(
      githubFetchedAt
        ? `checked public GitHub · refreshed ${formatRelative(githubFetchedAt, now)}`
        : 'checked public GitHub',
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

const STATUS: Record<string, string> = {
  getProfile: 'Pulling up my profile…',
  getSkills: 'Gathering my skills…',
  getExperience: 'Pulling my roles…',
  getProjects: 'Looking up my projects…',
  getContributions: 'Checking public GitHub…',
  getEducation: 'Looking up my education…',
  getCertifications: 'Finding my certifications…',
  getAwards: 'Finding my awards…',
  getRecommendations: 'Reading recommendations…',
  showRecommendation: 'Picking a quote…',
  getSiteArchitecture: 'Looking at how this site was built…',
  draftContactEmail: 'Drafting a note to Paul…',
  suggestFollowUps: 'Wrapping up…',
};

/** What to say while the agent is working: the pending tool, else "Thinking…". */
export function statusText(turn: Turn | undefined): string {
  const pending = turn?.items.findLast((i) => i.kind === 'tool' && !i.toolMessage);
  return pending?.kind === 'tool'
    ? (STATUS[pending.toolCall.function.name] ?? 'Working on it…')
    : 'Thinking…';
}
