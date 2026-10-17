import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import type {
  AccountStore,
  DeletionRecord,
  Provider,
  SessionRecord,
  SnapshotRecord,
  SubscriptionRecord,
  UserRecord,
} from './store.ts';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');

export async function createPostgresStore(databaseUrl: string): Promise<AccountStore> {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  await pool.query(readFileSync(schemaPath, 'utf8'));

  return {
    async findUser(provider: Provider, providerSubject: string): Promise<UserRecord | null> {
      const result = await pool.query<{ id: string; provider: Provider; provider_subject: string; email: string | null }>(
        'SELECT id, provider, provider_subject, email FROM users WHERE provider = $1 AND provider_subject = $2',
        [provider, providerSubject],
      );
      const row = result.rows[0];
      return row === undefined ? null : toUser(row);
    },
    async insertUser(user: UserRecord, createdAt: Date): Promise<void> {
      await pool.query(
        'INSERT INTO users (id, provider, provider_subject, email, created_at) VALUES ($1, $2, $3, $4, $5)',
        [user.id, user.provider, user.providerSubject, user.email, createdAt],
      );
    },
    async updateEmail(userId: string, email: string): Promise<void> {
      await pool.query('UPDATE users SET email = $2 WHERE id = $1', [userId, email]);
    },
    async insertSession(id, userId, tokenHash, expiresAt, createdAt): Promise<void> {
      await pool.query(
        'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
        [id, userId, tokenHash, expiresAt, createdAt],
      );
    },
    async findSession(tokenHash: string): Promise<SessionRecord | null> {
      const result = await pool.query<{ user_id: string; expires_at: Date }>(
        'SELECT user_id, expires_at FROM sessions WHERE token_hash = $1',
        [tokenHash],
      );
      const row = result.rows[0];
      return row === undefined ? null : { userId: row.user_id, expiresAt: row.expires_at };
    },
    async deleteSession(tokenHash: string): Promise<void> {
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    },
    async getSnapshot(userId: string): Promise<SnapshotRecord | null> {
      const result = await pool.query<{ revision: string; payload: Record<string, unknown>; updated_at: Date }>(
        'SELECT revision, payload, updated_at FROM profile_snapshots WHERE user_id = $1',
        [userId],
      );
      const row = result.rows[0];
      if (row === undefined) {
        return null;
      }
      return {
        userId,
        revision: Number(row.revision),
        payload: row.payload,
        updatedAt: row.updated_at,
      };
    },
    async saveSnapshot(record: SnapshotRecord): Promise<void> {
      await pool.query(
        `INSERT INTO profile_snapshots (user_id, revision, payload, updated_at)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (user_id) DO UPDATE SET revision = EXCLUDED.revision, payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
        [record.userId, record.revision, JSON.stringify(record.payload), record.updatedAt],
      );
    },
    async insertSubscription(record: SubscriptionRecord, updatedAt: Date): Promise<void> {
      await pool.query(
        `INSERT INTO subscriptions (id, user_id, store, product_id, status, period_end, auto_renew, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [record.id, record.userId, record.store, record.productId, record.status, record.periodEnd, record.autoRenew, updatedAt],
      );
    },
    async grantSubscription(record: SubscriptionRecord, updatedAt: Date): Promise<void> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE subscriptions SET status = 'expired', updated_at = $3 WHERE user_id = $1 AND store = $2 AND status = 'active'`,
          [record.userId, record.store, updatedAt],
        );
        await client.query(
          `INSERT INTO subscriptions (id, user_id, store, product_id, status, period_end, auto_renew, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [record.id, record.userId, record.store, record.productId, record.status, record.periodEnd, record.autoRenew, updatedAt],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async subscriptionsFor(userId: string): Promise<readonly SubscriptionRecord[]> {
      const result = await pool.query<{
        id: string;
        user_id: string;
        store: Provider;
        product_id: string;
        status: string;
        period_end: Date | null;
        auto_renew: boolean;
      }>('SELECT id, user_id, store, product_id, status, period_end, auto_renew FROM subscriptions WHERE user_id = $1', [
        userId,
      ]);
      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        store: row.store,
        productId: row.product_id,
        status: row.status,
        periodEnd: row.period_end,
        autoRenew: row.auto_renew,
      }));
    },
    async deletions(): Promise<readonly DeletionRecord[]> {
      const result = await pool.query<{ user_id: string; requested_at: Date; finished_at: Date }>(
        'SELECT user_id, requested_at, finished_at FROM deletions',
      );
      return result.rows.map((row) => ({
        userId: row.user_id,
        requestedAt: row.requested_at,
        finishedAt: row.finished_at,
      }));
    },
    async deleteAccount(userId: string, at: Date): Promise<void> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'INSERT INTO deletions (id, user_id, requested_at, finished_at) VALUES (gen_random_uuid(), $1, $2, $2)',
          [userId, at],
        );
        await client.query(`UPDATE subscriptions SET status = 'closed', updated_at = $2 WHERE user_id = $1`, [userId, at]);
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async getUsage(userId: string, day: string): Promise<{ questions: number; vectorRefreshes: number }> {
      const result = await pool.query<{ questions: number; vector_refreshes: number }>(
        'SELECT questions, vector_refreshes FROM ai_usage WHERE user_id = $1 AND day = $2',
        [userId, day],
      );
      const row = result.rows[0];
      return row === undefined
        ? { questions: 0, vectorRefreshes: 0 }
        : { questions: row.questions, vectorRefreshes: row.vector_refreshes };
    },
    async addUsage(userId: string, day: string, kind: 'question' | 'vector'): Promise<void> {
      const questions = kind === 'question' ? 1 : 0;
      const vectors = kind === 'vector' ? 1 : 0;
      await pool.query(
        `INSERT INTO ai_usage (user_id, day, questions, vector_refreshes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, day) DO UPDATE
         SET questions = ai_usage.questions + EXCLUDED.questions,
             vector_refreshes = ai_usage.vector_refreshes + EXCLUDED.vector_refreshes`,
        [userId, day, questions, vectors],
      );
    },
    async freeLifeVectorUsed(userId: string): Promise<boolean> {
      const result = await pool.query<{ free_life_vector_used: boolean }>(
        'SELECT free_life_vector_used FROM users WHERE id = $1',
        [userId],
      );
      return result.rows[0]?.free_life_vector_used === true;
    },
    async markFreeLifeVector(userId: string): Promise<void> {
      await pool.query('UPDATE users SET free_life_vector_used = true WHERE id = $1', [userId]);
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

function toUser(row: { id: string; provider: Provider; provider_subject: string; email: string | null }): UserRecord {
  return {
    id: row.id,
    provider: row.provider,
    providerSubject: row.provider_subject,
    email: row.email,
  };
}
