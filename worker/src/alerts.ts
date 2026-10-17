import type { FailureKind, Health } from './limits';

// Push notifications to Paul through ntfy (brief §7, owner alerts). NTFY_URL is the full
// topic URL (a secret: anyone with it can read the topic); NTFY_TOKEN is optional, for a
// protected topic. Without NTFY_URL nothing is sent. Messages never include keys,
// prompts or visitor text.

export type AlertEnv = { NTFY_URL?: string; NTFY_TOKEN?: string; OPENROUTER_API_KEY?: string };

type Alert = { title: string; message: string; priority: 'default' | 'high'; tags: string };

export async function sendAlert(env: AlertEnv, alert: Alert): Promise<void> {
  if (!env.NTFY_URL) return;
  await fetch(env.NTFY_URL, {
    method: 'POST',
    body: alert.message,
    headers: {
      Title: alert.title,
      Priority: alert.priority,
      Tags: alert.tags,
      ...(env.NTFY_TOKEN ? { Authorization: `Bearer ${env.NTFY_TOKEN}` } : {}),
    },
  }).catch(() => {});
}

const WHY: Record<FailureKind, string> = {
  credits: 'OpenRouter is out of credits or the key hit its spend cap',
  auth: 'OpenRouter rejected the API key',
  'rate-limit': 'OpenRouter is rate-limiting the agent',
  outage: 'OpenRouter is failing (server errors)',
  unknown: 'OpenRouter returned an error',
};

export function healthAlert(change: 'down' | 'recovered', previous: Health, next: Health): Alert {
  if (change === 'down' && next.state === 'down') {
    return {
      title: 'paul.emini.com agent is down',
      message: `${WHY[next.kind]} (HTTP ${next.status ?? '?'}). Visitors see the resting card${
        next.kind === 'credits' || next.kind === 'auth' ? '; retrying every 5 minutes' : ''
      }.`,
      priority: 'high',
      tags: 'warning',
    };
  }
  const since = previous.state === 'down' ? ` (down since ${previous.since.slice(0, 16)}Z)` : '';
  return {
    title: 'paul.emini.com agent recovered',
    message: `Answering again${since}.`,
    priority: 'default',
    tags: 'white_check_mark',
  };
}

/** Daily check (Cron Trigger): warns before the key's credit runs out. */
export async function checkCredit(env: AlertEnv, warnBelow = 0.2): Promise<void> {
  if (!env.OPENROUTER_API_KEY) return;
  const response = await fetch('https://openrouter.ai/api/v1/key', {
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
  });
  if (!response.ok) {
    await sendAlert(env, {
      title: 'paul.emini.com credit check failed',
      message: `OpenRouter answered HTTP ${response.status} to the daily key check.`,
      priority: 'high',
      tags: 'warning',
    });
    return;
  }
  const { data } = (await response.json()) as {
    data?: { limit?: number | null; limit_remaining?: number | null };
  };
  const limit = data?.limit;
  const remaining = data?.limit_remaining;
  if (typeof limit !== 'number' || typeof remaining !== 'number' || limit <= 0) return;
  if (remaining / limit >= warnBelow) return;
  await sendAlert(env, {
    title: 'paul.emini.com credit running low',
    message: `$${remaining.toFixed(2)} of $${limit.toFixed(2)} left on the agent's OpenRouter key.`,
    priority: 'high',
    tags: 'moneybag',
  });
}
