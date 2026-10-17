import assert from 'node:assert/strict';
import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { test } from 'node:test';

import { createApp, type HttpRequest } from './app.ts';
import { createLocalJWKSet, verifyIdentityToken, type TokenCheck } from './identity.ts';
import { createMemoryStore } from './memoryStore.ts';
import type { Provider } from './store.ts';

const NOW = new Date('2026-09-25T12:00:00.000Z');
const TTL = 30 * 24 * 60 * 60 * 1000;

test('apple token must match issuer and audience', async () => {
  const { jwks, privateKey } = await testKeys();
  const check: TokenCheck = {
    provider: 'apple',
    audience: 'com.grail.humanevolution',
    issuer: 'https://appleid.apple.com',
    jwks,
  };
  const token = await signToken(privateKey, {
    sub: 'apple-user',
    iss: 'https://appleid.apple.com',
    aud: 'com.grail.humanevolution',
    email: 'hidden@privaterelay.appleid.com',
  });
  const identity = await verifyIdentityToken(token, check);
  assert.equal(identity.subject, 'apple-user');
  assert.equal(identity.email, 'hidden@privaterelay.appleid.com');
  const wrong = await signToken(privateKey, {
    sub: 'apple-user',
    iss: 'https://appleid.apple.com',
    aud: 'other.app',
  });
  await assert.rejects(() => verifyIdentityToken(wrong, check));
});

test('sign in, sync, conflict, sign out, delete', async () => {
  const store = createMemoryStore();
  const app = createApp({
    store,
    now: () => NOW,
    sessionTtlMs: TTL,
    appleConfigured: true,
    googleConfigured: true,
    verify: async (provider, token) => {
      const [subject, email] = token.split('|');
      if (subject === undefined || subject.length === 0) {
        throw new Error('bad');
      }
      return { provider, subject, email: email === undefined || email.length === 0 ? null : email };
    },
  });

  const health = await app(call('GET', '/health'));
  assert.equal(health.status, 200);

  const apple = await app(call('POST', '/v1/auth/apple', { identityToken: 'sub-a|a@apple.test' }));
  assert.equal(apple.status, 200);
  const appleBody = apple.body as { token: string; user: { id: string; provider: Provider } };
  assert.equal(appleBody.user.provider, 'apple');

  const again = await app(call('POST', '/v1/auth/apple', { identityToken: 'sub-a|' }));
  assert.equal((again.body as { user: { id: string } }).user.id, appleBody.user.id);

  const auth = `Bearer ${appleBody.token}`;
  const empty = await app(call('GET', '/v1/sync', undefined, auth));
  assert.deepEqual(empty.body, { revision: 0, payload: null, updatedAt: null });

  const saved = await app(
    call(
      'PUT',
      '/v1/sync',
      { revision: 1, payload: { profile: { disciplineScore: 80 }, aiApiKey: 'secret', proofBackgroundUri: 'file://photo' } },
      auth,
    ),
  );
  assert.equal(saved.status, 200);
  const snapshot = (saved.body as { snapshot: { payload: Record<string, unknown> } }).snapshot;
  assert.equal('aiApiKey' in snapshot.payload, false);
  assert.equal('proofBackgroundUri' in snapshot.payload, false);

  const same = await app(call('PUT', '/v1/sync', { revision: 1, payload: { profile: { disciplineScore: 10 } } }, auth));
  assert.equal(same.status, 200);
  assert.deepEqual((same.body as { snapshot: { payload: { profile: { disciplineScore: number } } } }).snapshot.payload.profile, {
    disciplineScore: 80,
  });

  const newer = await app(call('PUT', '/v1/sync', { revision: 2, payload: { profile: { disciplineScore: 90 } } }, auth));
  assert.equal(newer.status, 200);
  const behind = await app(call('PUT', '/v1/sync', { revision: 1, payload: { profile: { disciplineScore: 1 } } }, auth));
  assert.equal(behind.status, 409);

  await store.insertSubscription(
    {
      id: 'sub-row',
      userId: appleBody.user.id,
      store: 'apple',
      productId: 'arche.premium',
      status: 'active',
      periodEnd: null,
      autoRenew: true,
    },
    NOW,
  );

  assert.equal((await app(call('DELETE', '/v1/session', undefined, auth))).status, 200);
  assert.equal((await app(call('GET', '/v1/sync', undefined, auth))).status, 401);

  const fresh = await app(call('POST', '/v1/auth/apple', { identityToken: 'sub-a|' }));
  const freshToken = (fresh.body as { token: string }).token;
  assert.equal((await app(call('DELETE', '/v1/account', undefined, `Bearer ${freshToken}`))).status, 200);
  assert.equal((await app(call('GET', '/v1/sync', undefined, `Bearer ${freshToken}`))).status, 401);
  assert.equal((await store.subscriptionsFor(appleBody.user.id))[0]?.status, 'closed');
  assert.equal((await store.deletions()).length, 1);

  const reborn = await app(call('POST', '/v1/auth/apple', { identityToken: 'sub-a|' }));
  assert.notEqual((reborn.body as { user: { id: string } }).user.id, appleBody.user.id);
});

test('unconfigured provider refuses sign in', async () => {
  const app = createApp({
    store: createMemoryStore(),
    now: () => NOW,
    sessionTtlMs: TTL,
    appleConfigured: false,
    googleConfigured: false,
    verify: async () => {
      throw new Error('unused');
    },
  });
  const response = await app(call('POST', '/v1/auth/google', { idToken: 'token' }));
  assert.equal(response.status, 503);
});

function call(method: string, path: string, body?: unknown, authorization?: string): HttpRequest {
  return { method, path, authorization, body: body ?? null };
}

async function signToken(
  privateKey: CryptoKey,
  claims: { sub: string; iss: string; aud: string; email?: string },
): Promise<string> {
  const claimsBody = claims.email === undefined ? {} : { email: claims.email };
  return new SignJWT(claimsBody)
    .setProtectedHeader({ alg: 'ES256', kid: 'test' })
    .setSubject(claims.sub)
    .setIssuer(claims.iss)
    .setAudience(claims.aud)
    .setExpirationTime('2m')
    .sign(privateKey);
}

async function testKeys(): Promise<{ jwks: TokenCheck['jwks']; privateKey: CryptoKey }> {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = await exportJWK(publicKey);
  const published: JWK = { ...jwk, kid: 'test', alg: 'ES256', use: 'sig' };
  return { jwks: createLocalJWKSet({ keys: [published] }), privateKey };
}
