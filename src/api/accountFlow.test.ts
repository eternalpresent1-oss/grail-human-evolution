import { connectAccount } from '@/api/accountFlow';
import { type ArcheClient } from '@/api/archeClient';

describe('connect account', () => {
  it('uploads the phone when the server has no copy yet', async () => {
    const client = fakeClient({ revision: 0, payload: null }, { revision: 1, payload: { profile: {}, tasks: [] } });
    const connected = await connectAccount(client, 'apple', 'identity', 0, {
      profile: { disciplineScore: 80 },
      tasks: [],
      aiApiKey: 'secret',
    });
    expect(connected.session.revision).toBe(1);
    expect(connected.nextState).toBeNull();
    expect(client.putSnapshot).toHaveBeenCalledWith('token', 1, { profile: { disciplineScore: 80 }, tasks: [] });
  });

  it('applies the server copy when it is newer and keeps the local photo', async () => {
    const client = fakeClient({
      revision: 3,
      payload: { profile: { disciplineScore: 90 }, tasks: [{ id: 'canon' }] },
    });
    const connected = await connectAccount(client, 'google', 'identity', 1, {
      profile: { disciplineScore: 10 },
      tasks: [],
      proofBackgroundUri: 'file://card',
    });
    expect(connected.session.revision).toBe(3);
    expect(connected.nextState).toMatchObject({
      profile: { disciplineScore: 90 },
      proofBackgroundUri: 'file://card',
    });
  });
});

function fakeClient(
  remote: { revision: number; payload: Record<string, unknown> | null },
  saved?: { revision: number; payload: Record<string, unknown> },
): ArcheClient {
  const written = saved ?? { revision: remote.revision, payload: remote.payload ?? {} };
  return {
    signIn: jest.fn(async (provider) => ({ token: 'token', userId: 'user', provider, revision: 0 })),
    signOut: jest.fn(async () => undefined),
    deleteAccount: jest.fn(async () => undefined),
    getSnapshot: jest.fn(async () => remote),
    putSnapshot: jest.fn(async () => written),
    access: jest.fn(async () => ({ allowed: true, reason: 'ok' })),
    submitPurchase: jest.fn(async () => ({ status: 'active' })),
    counsel: jest.fn(async () => ({ reply: 'ok' })),
  };
}
