import { createArcheClient, type ArcheClient } from '@/api/archeClient';
import { rememberAccountSession } from '@/api/accountSession';
import { analysisReadingOpen, readAccess, runIfAllowed } from '@/api/featureAccess';

describe('feature access', () => {
  const client: ArcheClient = {
    signIn: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    getSnapshot: jest.fn(),
    putSnapshot: jest.fn(),
    access: jest.fn(async () => ({ allowed: false, reason: 'limit' })),
    submitPurchase: jest.fn(),
    counsel: jest.fn(),
  };

  it('treats a server limit as tomorrow, and a refusal as the subscription', async () => {
    expect(await readAccess(client, 'token', 'counsel_question', '2026-09-26')).toBe('limit');
    (client.access as jest.Mock).mockResolvedValueOnce({ allowed: false, reason: 'premium' });
    expect(await readAccess(client, 'token', 'custom_atom', '2026-09-26')).toBe('premium');
    (client.access as jest.Mock).mockResolvedValueOnce({ allowed: true, reason: 'ok' });
    expect(await readAccess(client, 'token', 'canon', '2026-09-26')).toBeNull();
  });

  it('keeps the full reading until the server closes it', () => {
    expect(analysisReadingOpen(null)).toBe(true);
    expect(analysisReadingOpen('premium')).toBe(false);
  });

  it('runs the action immediately when nobody is signed in', () => {
    rememberAccountSession(null);
    const apply = jest.fn();
    const block = jest.fn();
    runIfAllowed('custom_atom', '2026-09-26', apply, block);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(block).not.toHaveBeenCalled();
  });

  it('does not send a premium flag', async () => {
    const fetchImpl = jest.fn(async (_url: string, init: { body?: string }) => ({
      status: 200,
      json: async () => ({ allowed: true, reason: 'ok' }),
    }));
    const live = createArcheClient('http://api.test', fetchImpl as unknown as typeof fetch);
    await live.access('session-token', 'shadow_mark', '2026-09-26');
    const body = JSON.parse((fetchImpl.mock.calls[0]?.[1] as { body: string }).body) as Record<string, unknown>;
    expect(body).toEqual({ feature: 'shadow_mark', day: '2026-09-26' });
    expect(body).not.toHaveProperty('isPremium');
  });
});
