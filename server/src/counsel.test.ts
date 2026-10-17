import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApp, type HttpRequest } from './app.ts';
import { createMemoryStore, newId } from './memoryStore.ts';
import { hashSessionToken } from './session.ts';

const NOW = new Date('2026-09-27T12:00:00.000Z');
const TOKEN = 'token-token-token-token-token-token';

test('counsel refuses a premium flag and spends only after a reply', async () => {
  const store = createMemoryStore();
  const userId = newId();
  await store.insertUser({ id: userId, provider: 'google', providerSubject: 'sub', email: null }, NOW);
  await store.insertSession(newId(), userId, hashSessionToken(TOKEN), new Date(NOW.getTime() + 60_000), NOW);
  await store.insertSubscription(
    {
      id: newId(),
      userId,
      store: 'google',
      productId: 'arche_premium_monthly',
      status: 'active',
      periodEnd: new Date('2026-10-27T12:00:00.000Z'),
      autoRenew: true,
    },
    NOW,
  );
  let calls = 0;
  const app = createApp({
    store,
    now: () => NOW,
    sessionTtlMs: 60_000,
    appleConfigured: false,
    googleConfigured: true,
    verify: async () => {
      throw new Error('unused');
    },
    askOpenAi: async () => {
      calls += 1;
      return { reply: 'Three clear steps.' };
    },
  });
  const flagged = await app(
    call({ kind: 'question', day: '2026-09-27', language: 'en', snapshot: 'octagon', prompt: 'Hi', isPremium: true }),
  );
  assert.equal(flagged.status, 400);
  const answered = await app(
    call({ kind: 'question', day: '2026-09-27', language: 'en', snapshot: 'octagon', prompt: 'Hi', thread: [] }),
  );
  assert.equal(answered.status, 200);
  assert.deepEqual(answered.body, { reply: 'Three clear steps.' });
  assert.equal(calls, 1);
  const usage = await store.getUsage(userId, '2026-09-27');
  assert.equal(usage.questions, 1);
});

test('free counsel is refused and a missing model key is not configured', async () => {
  const store = createMemoryStore();
  const userId = newId();
  await store.insertUser({ id: userId, provider: 'apple', providerSubject: 'sub', email: null }, NOW);
  await store.insertSession(newId(), userId, hashSessionToken(TOKEN), new Date(NOW.getTime() + 60_000), NOW);
  const withModel = createApp({
    store,
    now: () => NOW,
    sessionTtlMs: 60_000,
    appleConfigured: true,
    googleConfigured: false,
    verify: async () => {
      throw new Error('unused');
    },
    askOpenAi: async () => ({ reply: 'no' }),
  });
  const denied = await withModel(
    call({ kind: 'question', day: '2026-09-27', language: 'en', snapshot: 'octagon', prompt: 'Hi' }),
  );
  assert.equal(denied.status, 403);
  assert.deepEqual(denied.body, { error: 'forbidden', reason: 'premium' });
  const withoutModel = createApp({
    store,
    now: () => NOW,
    sessionTtlMs: 60_000,
    appleConfigured: true,
    googleConfigured: false,
    verify: async () => {
      throw new Error('unused');
    },
  });
  const response = await withoutModel(
    call({ kind: 'life_vector', day: '2026-09-27', language: 'ru', snapshot: 'octagon' }),
  );
  assert.equal(response.status, 503);
});

function call(body: unknown): HttpRequest {
  return { method: 'POST', path: '/v1/counsel', authorization: `Bearer ${TOKEN}`, body };
}
