import { describe, expect, it } from 'vitest';
import {
  arrangeItems,
  type MessageLike,
  sourceLine,
  statusText,
  type TurnItem,
  toTurns,
} from './chat-turns';

const call = (id: string, name: string, args: object | string = {}) => ({
  id,
  type: 'function',
  function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) },
});

describe('toTurns', () => {
  it('groups text and tool calls under each prompt, pairing tool results', () => {
    const messages: MessageLike[] = [
      { id: 'u1', role: 'user', content: 'Skills?' },
      { id: 'a1', role: 'assistant', content: '', toolCalls: [call('c1', 'getSkills')] },
      { id: 't1', role: 'tool', toolCallId: 'c1', content: '{"ids":["ai-ml"]}' },
      {
        id: 'a2',
        role: 'assistant',
        content: 'Here you go.',
        toolCalls: [call('c2', 'suggestFollowUps')],
      },
      { id: 'u2', role: 'user', content: 'More' },
    ];
    const turns = toTurns(messages);
    expect(turns.map((t) => t.prompt)).toEqual(['Skills?', 'More']);
    expect(
      turns[0]?.items.map((i) => (i.kind === 'text' ? i.text : i.toolCall.function.name)),
    ).toEqual(['getSkills', 'Here you go.', 'suggestFollowUps']);
    expect(turns[0]?.items[0]).toMatchObject({ toolMessage: { id: 't1' } });
    expect(turns[1]?.items).toEqual([]);
  });

  it('shows each recommendation once per turn', () => {
    const rec = (id: string, who: string) =>
      call(id, 'showRecommendation', { id: who, excerpt: 'x' });
    const turns = toTurns([
      { id: 'u', role: 'user', content: 'What do people say?' },
      {
        id: 'a',
        role: 'assistant',
        toolCalls: [rec('1', 'sandra'), rec('2', 'derek'), rec('3', 'sandra')],
      },
    ]);
    expect(turns[0]?.items.map((i) => i.id)).toEqual(['1', '2']);
  });

  it('keeps a tool call whose arguments are still streaming', () => {
    const turns = toTurns([
      { id: 'u', role: 'user', content: 'q' },
      { id: 'a', role: 'assistant', toolCalls: [call('1', 'showRecommendation', '{"id":"san')] },
    ]);
    expect(turns[0]?.items).toHaveLength(1);
  });
});

describe('sourceLine', () => {
  const meta = {
    resumeSyncedAt: '2026-10-15',
    githubFetchedAt: '2026-10-16T06:00:00Z',
    now: new Date('2026-10-16T12:00:00Z'),
  };

  it('names the sources the turn used', () => {
    expect(sourceLine(['getExperience', 'suggestFollowUps'], meta)).toBe(
      'from résumé · synced 2026-10-15',
    );
    expect(sourceLine(['getContributions'], meta)).toBe(
      'checked public GitHub · refreshed 6 h ago',
    );
    expect(sourceLine(['getContributions'], { ...meta, githubFetchedAt: null })).toBe(
      'checked public GitHub',
    );
    expect(sourceLine(['suggestFollowUps'], meta)).toBeNull();
  });
});

describe('statusText', () => {
  it('describes the pending tool', () => {
    const [turn] = toTurns([
      { id: 'u', role: 'user', content: 'q' },
      { id: 'a', role: 'assistant', toolCalls: [call('1', 'getExperience')] },
    ]);
    expect(statusText(turn)).toBe('Pulling my roles…');
    expect(statusText(undefined)).toBe('Thinking…');
  });
});

describe('arrangeItems', () => {
  const text = (id: string): TurnItem => ({ kind: 'text', id, text: id });
  const tool = (id: string, name = 'getProjects'): TurnItem => ({
    kind: 'tool',
    id,
    toolCall: call(id, name),
  });
  const ids = (items: TurnItem[]) => items.map((i) => i.id);

  it('puts the text ahead of the cards it follows, follow-ups last', () => {
    const items = [tool('a'), tool('b'), text('t'), tool('f', 'suggestFollowUps')];
    expect(ids(arrangeItems(items, false))).toEqual(['t', 'a', 'b', 'f']);
    expect(ids(arrangeItems(items, true))).toEqual(['t', 'a', 'b', 'f']);
  });

  it('keeps leading text first and moves later text ahead of its cards', () => {
    const items = [text('t1'), tool('a'), text('t2'), tool('f', 'suggestFollowUps')];
    expect(ids(arrangeItems(items, false))).toEqual(['t1', 't2', 'a', 'f']);
    expect(ids(arrangeItems([text('t1'), tool('a')], false))).toEqual(['t1', 'a']);
  });

  it('holds cards back while their text is still on its way', () => {
    expect(ids(arrangeItems([tool('a')], true))).toEqual([]);
    expect(ids(arrangeItems([tool('a'), text('t')], true))).toEqual(['t']);
    expect(ids(arrangeItems([tool('a')], false))).toEqual(['a']);
  });
});
