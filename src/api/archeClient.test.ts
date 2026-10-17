import { ArcheClientError, conflictSnapshot, createArcheClient } from '@/api/archeClient';

function jsonResponse(status: number, body: unknown): Response {
  return { status, json: async () => body } as Response;
}

describe('arche client', () => {
  it('signs in and reads the session', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(200, { token: 'session-token', user: { id: 'user-1', provider: 'apple' } }),
    );
    const client = createArcheClient('http://api.test', fetchImpl);
    const session = await client.signIn('apple', 'identity');
    expect(session).toEqual({ token: 'session-token', userId: 'user-1', provider: 'apple', revision: 0 });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/v1/auth/apple',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('refuses when the server address is empty', async () => {
    const client = createArcheClient('');
    await expect(client.signIn('google', 'token')).rejects.toEqual(new ArcheClientError('unavailable'));
  });

  it('returns the server snapshot on a revision conflict', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(409, { error: 'conflict', snapshot: { revision: 4, payload: { profile: { disciplineScore: 80 } } } }),
    );
    const client = createArcheClient('http://api.test/', fetchImpl);
    let caught: unknown;
    try {
      await client.putSnapshot('session-token', 1, { profile: {} });
    } catch (error) {
      caught = error;
    }
    expect(conflictSnapshot(caught)).toEqual({ revision: 4, payload: { profile: { disciplineScore: 80 } } });
  });

  it('sends the store receipt and never a premium flag', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(200, { status: 'active' }));
    const client = createArcheClient('http://api.test', fetchImpl);
    await expect(client.submitPurchase('session-token', 'google', 'purchase-token')).resolves.toEqual({
      status: 'active',
    });
    expect(fetchImpl).toHaveBeenCalled();
    const [, requestInit] = fetchImpl.mock.calls[0] as unknown as [string, { body?: string }];
    const body = JSON.parse(String(requestInit.body)) as Record<string, unknown>;
    expect(body).toEqual({ purchaseToken: 'purchase-token' });
    expect(body).not.toHaveProperty('isPremium');
  });
});
