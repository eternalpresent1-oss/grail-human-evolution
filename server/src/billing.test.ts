import assert from 'node:assert/strict';
import { test } from 'node:test';

import { acceptPurchase, APPLE_PRODUCT_ID, GOOGLE_PRODUCT_ID } from './billing.ts';
import { createApp, type HttpRequest } from './app.ts';
import { createMemoryStore, newId } from './memoryStore.ts';
import { hashSessionToken } from './session.ts';

const NOW = new Date('2026-09-26T12:00:00.000Z');
const TOKEN = 'token-token-token-token-token-token';

test('accepts the monthly product and rejects a different one', () => {
  const later = new Date('2026-10-26T12:00:00.000Z');
  assert.equal(
    acceptPurchase('apple', { productId: APPLE_PRODUCT_ID, expiresAt: later, autoRenew: true }, NOW)?.status,
    'active',
  );
  assert.equal(
    acceptPurchase('google', { productId: 'other', expiresAt: later, autoRenew: true }, NOW),
    null,
  );
  assert.equal(
    acceptPurchase('google', { productId: GOOGLE_PRODUCT_ID, expiresAt: NOW, autoRenew: false }, NOW)?.status,
    'expired',
  );
});

test('a verified receipt opens premium and a flag from the phone is refused', async () => {
  const store = createMemoryStore();
  const userId = newId();
  await store.insertUser({ id: userId, provider: 'apple', providerSubject: 'sub', email: null }, NOW);
  await store.insertSession(newId(), userId, hashSessionToken(TOKEN), new Date(NOW.getTime() + 60_000), NOW);
  const app = createApp({
    store,
    now: () => NOW,
    sessionTtlMs: 60_000,
    appleConfigured: true,
    googleConfigured: false,
    verify: async () => {
      throw new Error('unused');
    },
    verifyPurchase: async () => ({
      productId: APPLE_PRODUCT_ID,
      expiresAt: new Date('2026-10-26T12:00:00.000Z'),
      autoRenew: true,
    }),
  });
  const flagged = await app(call('/v1/billing/apple', { signedTransaction: 'receipt', isPremium: true }));
  assert.equal(flagged.status, 400);
  const granted = await app(call('/v1/billing/apple', { signedTransaction: 'receipt' }));
  assert.deepEqual(granted.body, { status: 'active' });
  const access = await app(call('/v1/access', { feature: 'custom_atom' }));
  assert.deepEqual(access.body, { allowed: true, reason: 'ok' });
});

test('without a store verifier the receipt is not trusted', async () => {
  const store = createMemoryStore();
  const userId = newId();
  await store.insertUser({ id: userId, provider: 'google', providerSubject: 'sub', email: null }, NOW);
  await store.insertSession(newId(), userId, hashSessionToken(TOKEN), new Date(NOW.getTime() + 60_000), NOW);
  const app = createApp({
    store,
    now: () => NOW,
    sessionTtlMs: 60_000,
    appleConfigured: false,
    googleConfigured: false,
    verify: async () => {
      throw new Error('unused');
    },
  });
  const response = await app(call('/v1/billing/google', { purchaseToken: 'token' }));
  assert.equal(response.status, 503);
});

function call(path: string, body: unknown): HttpRequest {
  return { method: 'POST', path, authorization: `Bearer ${TOKEN}`, body };
}
