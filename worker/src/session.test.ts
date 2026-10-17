import { describe, expect, it } from 'vitest';
import { issueSession, SESSION_TTL_MS, verifySession, visitorId } from './session';

const secret = 'test-secret';
const now = Date.UTC(2026, 9, 17, 12);

describe('sessions', () => {
  it('accepts its own tokens until they expire', async () => {
    const token = await issueSession(secret, now);
    expect(await verifySession(secret, token, now + 1000)).toBe(true);
    expect(await verifySession(secret, token, now + SESSION_TTL_MS + 1)).toBe(false);
  });

  it('rejects forged, altered and missing tokens', async () => {
    const token = await issueSession(secret, now);
    const [, signature] = token.split('.');
    expect(await verifySession('other-secret', token, now)).toBe(false);
    expect(await verifySession(secret, `${now + 10 * SESSION_TTL_MS}.${signature}`, now)).toBe(
      false,
    );
    expect(await verifySession(secret, null, now)).toBe(false);
    expect(await verifySession(secret, 'garbage', now)).toBe(false);
  });

  it('hashes visitors per day, without the IP showing', async () => {
    const a = await visitorId(secret, '203.0.113.7', '2026-10-17');
    expect(a).not.toContain('203');
    expect(await visitorId(secret, '203.0.113.7', '2026-10-17')).toBe(a);
    expect(await visitorId(secret, '203.0.113.7', '2026-10-18')).not.toBe(a);
  });
});
