import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decideAccess } from './access.ts';
import { createApp, type HttpRequest } from './app.ts';
import { createMemoryStore, newId } from './memoryStore.ts';
import { hashSessionToken } from './session.ts';

const NOW = new Date('2026-09-25T12:00:00.000Z');

test('free taste allows canon and one shadow, then asks for premium', () => {
  assert.equal(decideAccess(base('canon')).allowed, true);
  assert.equal(decideAccess(base('shadow_mark')).reason, 'ok');
  assert.equal(decideAccess({ ...base('shadow_mark'), shadowMarks: 1 }).reason, 'premium');
  assert.equal(decideAccess(base('counsel_question')).reason, 'premium');
  assert.equal(decideAccess({ ...base('custom_atom'), premium: true }).reason, 'ok');
});

test('premium counsel stops at 50 questions and 10 vectors', () => {
  const questions = decideAccess({ ...base('counsel_question'), premium: true, questions: 50 });
  const vectors = decideAccess({ ...base('vector_refresh'), premium: true, vectorRefreshes: 10 });
  assert.equal(questions.reason, 'limit');
  assert.equal(vectors.reason, 'limit');
  assert.equal(decideAccess({ ...base('counsel_question'), premium: true, questions: 49 }).spend, 'question');
});

test('the phone cannot send isPremium', async () => {
  const store = createMemoryStore();
  const userId = newId();
  await store.insertUser({ id: userId, provider: 'apple', providerSubject: 'sub', email: null }, NOW);
  const sessionToken = 'token-token-token-token-token-token';
  await store.insertSession(newId(), userId, hashSessionToken(sessionToken), new Date(NOW.getTime() + 60_000), NOW);
  const app = createApp({
    store,
    now: () => NOW,
    sessionTtlMs: 60_000,
    appleConfigured: true,
    googleConfigured: true,
    verify: async () => {
      throw new Error('unused');
    },
  });
  const rejected = await app(call({ feature: 'canon', isPremium: true }));
  assert.equal(rejected.status, 400);
  const allowed = await app(call({ feature: 'canon' }));
  assert.deepEqual(allowed.body, { allowed: true, reason: 'ok' });
  const firstVector = await app(call({ feature: 'life_vector', day: '2026-09-25' }));
  assert.deepEqual(firstVector.body, { allowed: true, reason: 'ok' });
  const secondVector = await app(call({ feature: 'life_vector', day: '2026-09-25' }));
  assert.deepEqual(secondVector.body, { allowed: false, reason: 'premium' });
});

function base(feature: Parameters<typeof decideAccess>[0]['feature']) {
  return {
    feature,
    premium: false,
    shadowMarks: 0,
    hasLifeVector: false,
    freeLifeVectorUsed: false,
    questions: 0,
    vectorRefreshes: 0,
  };
}

function call(body: unknown): HttpRequest {
  return {
    method: 'POST',
    path: '/v1/access',
    authorization: 'Bearer token-token-token-token-token-token',
    body,
  };
}
