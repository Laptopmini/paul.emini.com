import { describe, expect, it } from 'vitest';
import {
  afterRun,
  decideQuota,
  HEALTHY,
  type Health,
  PROBE_INTERVAL_MS,
  resetsAt,
  shouldAttempt,
} from './limits';

const limits = { visitor: 25, global: 1000 };
const now = new Date('2026-10-17T15:30:00Z');

describe('decideQuota', () => {
  it('counts down the visitor’s questions', () => {
    expect(decideQuota({ visitor: 0, global: 0 }, limits)).toEqual({
      allowed: true,
      remaining: 24,
    });
    expect(decideQuota({ visitor: 24, global: 10 }, limits)).toEqual({
      allowed: true,
      remaining: 0,
    });
  });

  it('stops the visitor at the limit, and everyone at the global cap', () => {
    expect(decideQuota({ visitor: 25, global: 10 }, limits)).toMatchObject({
      allowed: false,
      reason: 'visitor',
    });
    expect(decideQuota({ visitor: 3, global: 1000 }, limits)).toMatchObject({
      allowed: false,
      reason: 'global',
      remaining: 21,
    });
  });

  it('resets at the next midnight UTC', () => {
    expect(resetsAt(now)).toBe('2026-10-18T00:00:00.000Z');
  });
});

describe('provider health', () => {
  it('goes down at once when out of credits, and tells Paul once', () => {
    const first = afterRun(HEALTHY, { ok: false, status: 402 }, now);
    expect(first.notify).toBe('down');
    expect(first.health).toMatchObject({ state: 'down', kind: 'credits', status: 402 });
    expect(afterRun(first.health, { ok: false, status: 402 }, now).notify).toBeNull();
  });

  it('ignores a blip: rate limits and outages count after three in a row', () => {
    let health: Health = HEALTHY;
    const notes: (string | null)[] = [];
    for (let i = 0; i < 3; i++) {
      const next = afterRun(health, { ok: false, status: 503 }, now);
      notes.push(next.notify);
      health = next.health;
    }
    expect(notes).toEqual([null, null, 'down']);
    expect(afterRun({ state: 'up', failures: 2 }, { ok: true }, now)).toEqual({
      health: HEALTHY,
      notify: null,
    });
  });

  it('leaves health alone when a failure has no provider status', () => {
    expect(afterRun(HEALTHY, { ok: false }, now)).toEqual({ health: HEALTHY, notify: null });
  });

  it('reports the recovery', () => {
    const down = afterRun(HEALTHY, { ok: false, status: 401 }, now).health;
    expect(afterRun(down, { ok: true }, now)).toEqual({ health: HEALTHY, notify: 'recovered' });
  });

  it('holds runs back while out of credits, letting a probe through every few minutes', () => {
    const down = afterRun(HEALTHY, { ok: false, status: 402 }, now).health;
    expect(shouldAttempt(down, new Date(now.getTime() + 60_000))).toBe(false);
    expect(shouldAttempt(down, new Date(now.getTime() + PROBE_INTERVAL_MS))).toBe(true);
    const outage = afterRun({ state: 'up', failures: 2 }, { ok: false, status: 500 }, now).health;
    expect(shouldAttempt(outage, now)).toBe(true);
  });
});
