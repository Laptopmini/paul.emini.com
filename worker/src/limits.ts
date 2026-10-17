// Daily question limits and provider health, as pure functions over plain state. The
// Durable Object in guard-state.ts stores the state; these decide what it means.

export type Limits = { visitor: number; global: number };

export type QuotaDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: 'visitor' | 'global'; remaining: number };

/** UTC day the counters belong to, e.g. "2026-10-17". */
export const dayOf = (now: Date) => now.toISOString().slice(0, 10);

/** Next midnight UTC, when the counters reset. */
export function resetsAt(now: Date): string {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.toISOString();
}

export function decideQuota(
  counts: { visitor: number; global: number },
  limits: Limits,
): QuotaDecision {
  if (counts.visitor >= limits.visitor) return { allowed: false, reason: 'visitor', remaining: 0 };
  const remaining = limits.visitor - counts.visitor - 1;
  if (counts.global >= limits.global) return { allowed: false, reason: 'global', remaining };
  return { allowed: true, remaining };
}

/**
 * Provider health: "up", or "down" since the first failure. Out of credits or a rejected
 * key won't fix itself, so while down for those reasons runs are held back (the visitor
 * sees the resting card) and one probe run is let through every few minutes.
 */
export type FailureKind = 'credits' | 'auth' | 'rate-limit' | 'outage' | 'unknown';

export type Health =
  | { state: 'up'; failures: number }
  | { state: 'down'; kind: FailureKind; status?: number; since: string; lastProbe: string };

export const HEALTHY: Health = { state: 'up', failures: 0 };
export const PROBE_INTERVAL_MS = 5 * 60_000;
/** Rate limits and outages can be a blip: only this many in a row count as down. */
export const TRANSIENT_FAILURES = 3;

export function classifyFailure(status: number): FailureKind {
  if (status === 402) return 'credits';
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate-limit';
  if (status >= 500) return 'outage';
  return 'unknown';
}

const persistent = (kind: FailureKind) => kind === 'credits' || kind === 'auth';

/** Whether a run should reach the model; a held-back run shows the resting card. */
export function shouldAttempt(health: Health, now: Date): boolean {
  if (health.state === 'up' || !persistent(health.kind)) return true;
  return now.getTime() - new Date(health.lastProbe).getTime() >= PROBE_INTERVAL_MS;
}

/**
 * The next health state, and whether Paul should hear about the change. `status` is the
 * provider's HTTP status; a failure without one (say, the model fumbling a tool call)
 * says nothing about the provider and leaves health as it was.
 */
export function afterRun(
  health: Health,
  outcome: { ok: true } | { ok: false; status?: number },
  now: Date,
): { health: Health; notify: 'down' | 'recovered' | null } {
  if (outcome.ok) {
    return { health: HEALTHY, notify: health.state === 'down' ? 'recovered' : null };
  }
  if (outcome.status === undefined) return { health, notify: null };
  const kind = classifyFailure(outcome.status);
  const at = now.toISOString();
  if (health.state === 'down') {
    return { health: { ...health, kind, status: outcome.status, lastProbe: at }, notify: null };
  }
  const failures = health.failures + 1;
  if (!persistent(kind) && failures < TRANSIENT_FAILURES) {
    return { health: { state: 'up', failures }, notify: null };
  }
  return {
    health: { state: 'down', kind, status: outcome.status, since: at, lastProbe: at },
    notify: 'down',
  };
}
