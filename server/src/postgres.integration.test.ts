import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { test } from 'node:test';

import { createApp } from './app.ts';
import { createPostgresStore } from './postgresStore.ts';

const NOW = new Date('2026-09-25T12:00:00.000Z');

test('postgres keeps sign-in, snapshot, and deletion', async () => {
  const db = new PGlite();
  const server = new PGLiteSocketServer({
    db,
    port: 54329,
    host: '127.0.0.1',
    maxConnections: 10,
  });
  await server.start();
  const store = await createPostgresStore('postgres://arche:arche@127.0.0.1:54329/arche');
  try {
    const app = createApp({
      store,
      now: () => NOW,
      sessionTtlMs: 60_000,
      appleConfigured: true,
      googleConfigured: false,
      verify: async (provider, token) => ({ provider, subject: token, email: null }),
    });
    const signed = await app({
      method: 'POST',
      path: '/v1/auth/apple',
      authorization: undefined,
      body: { identityToken: 'apple-subject' },
    });
    assert.equal(signed.status, 200);
    const token = (signed.body as { token: string; user: { id: string } }).token;
    const userId = (signed.body as { user: { id: string } }).user.id;
    const auth = `Bearer ${token}`;
    const saved = await app({
      method: 'PUT',
      path: '/v1/sync',
      authorization: auth,
      body: { revision: 1, payload: { profile: { disciplineScore: 80 }, aiApiKey: 'secret' } },
    });
    assert.equal(saved.status, 200);
    const loaded = await app({ method: 'GET', path: '/v1/sync', authorization: auth, body: null });
    const payload = (loaded.body as { payload: Record<string, unknown> }).payload;
    assert.deepEqual(payload.profile, { disciplineScore: 80 });
    assert.equal('aiApiKey' in payload, false);
    await store.insertSubscription(
      {
        id: '11111111-1111-4111-8111-111111111111',
        userId,
        store: 'apple',
        productId: 'arche.premium',
        status: 'active',
        periodEnd: null,
        autoRenew: true,
      },
      NOW,
    );
    const removed = await app({ method: 'DELETE', path: '/v1/account', authorization: auth, body: null });
    assert.equal(removed.status, 200);
    assert.equal((await store.subscriptionsFor(userId))[0]?.status, 'closed');
    assert.equal((await store.deletions()).length, 1);
    assert.equal(await store.findUser('apple', 'apple-subject'), null);
  } finally {
    await store.close();
    await server.stop();
    await db.close();
  }
});
