import { DurableObject } from 'cloudflare:workers';
import {
  afterRun,
  decideQuota,
  HEALTHY,
  type Health,
  type Limits,
  type QuotaDecision,
  shouldAttempt,
} from './limits';

// Durable Object behind the guardrails. One instance per UTC day ("day:2026-10-17")
// counts questions, per visitor and overall, and deletes itself the day after; the
// "health" instance remembers whether the provider is failing. Durable Objects run one
// request at a time, so the counts can't race.

const GLOBAL = 'global';
const HEALTH = 'health';

export class GuardState extends DurableObject {
  /** Counts the question if it's allowed. */
  async consume(visitor: string, limits: Limits, now: number): Promise<QuotaDecision> {
    const key = `v:${visitor}`;
    const [visitorCount = 0, globalCount = 0] = await Promise.all([
      this.ctx.storage.get<number>(key),
      this.ctx.storage.get<number>(GLOBAL),
    ]);
    const decision = decideQuota({ visitor: visitorCount, global: globalCount }, limits);
    if (decision.allowed) {
      await this.ctx.storage.put({ [key]: visitorCount + 1, [GLOBAL]: globalCount + 1 });
      if ((await this.ctx.storage.getAlarm()) === null) {
        // Delete the day's counters a day later.
        await this.ctx.storage.setAlarm(now + 26 * 60 * 60_000);
      }
    }
    return decision;
  }

  /** Gives a question back when the provider failed to answer it. */
  async refund(visitor: string): Promise<void> {
    const key = `v:${visitor}`;
    const [visitorCount = 0, globalCount = 0] = await Promise.all([
      this.ctx.storage.get<number>(key),
      this.ctx.storage.get<number>(GLOBAL),
    ]);
    await this.ctx.storage.put({
      [key]: Math.max(0, visitorCount - 1),
      [GLOBAL]: Math.max(0, globalCount - 1),
    });
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }

  /** Whether to call the model now (false: show the resting card). */
  async attempt(now: number): Promise<boolean> {
    const health = (await this.ctx.storage.get<Health>(HEALTH)) ?? HEALTHY;
    const go = shouldAttempt(health, new Date(now));
    if (go && health.state === 'down') {
      // This run is the probe; hold the others back until the next interval.
      await this.ctx.storage.put(HEALTH, { ...health, lastProbe: new Date(now).toISOString() });
    }
    return go;
  }

  /** Records how a run went; returns the change Paul should be told about, if any. */
  async report(
    outcome: { ok: true } | { ok: false; status?: number },
    now: number,
  ): Promise<{ notify: 'down' | 'recovered' | null; health: Health; previous: Health }> {
    const health = (await this.ctx.storage.get<Health>(HEALTH)) ?? HEALTHY;
    if (outcome.ok && health.state === 'up' && health.failures === 0) {
      return { notify: null, health, previous: health }; // the common case: no write
    }
    const next = afterRun(health, outcome, new Date(now));
    await this.ctx.storage.put(HEALTH, next.health);
    return { notify: next.notify, health: next.health, previous: health };
  }
}
