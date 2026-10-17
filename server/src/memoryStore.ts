import { randomUUID } from 'node:crypto';

import type {
  AccountStore,
  DeletionRecord,
  Provider,
  SessionRecord,
  SnapshotRecord,
  SubscriptionRecord,
  UserRecord,
} from './store.ts';

export function createMemoryStore(): AccountStore {
  const users = new Map<string, UserRecord>();
  const sessions = new Map<string, SessionRecord & { tokenHash: string }>();
  const snapshots = new Map<string, SnapshotRecord>();
  const subscriptions: SubscriptionRecord[] = [];
  const deletionRows: DeletionRecord[] = [];
  const usage = new Map<string, { questions: number; vectorRefreshes: number }>();
  const freeLife = new Set<string>();

  return {
    async findUser(provider: Provider, providerSubject: string): Promise<UserRecord | null> {
      for (const user of users.values()) {
        if (user.provider === provider && user.providerSubject === providerSubject) {
          return user;
        }
      }
      return null;
    },
    async insertUser(user: UserRecord): Promise<void> {
      users.set(user.id, user);
    },
    async updateEmail(userId: string, email: string): Promise<void> {
      const user = users.get(userId);
      if (user !== undefined) {
        users.set(userId, { ...user, email });
      }
    },
    async insertSession(_id, userId, tokenHash, expiresAt): Promise<void> {
      sessions.set(tokenHash, { userId, expiresAt, tokenHash });
    },
    async findSession(tokenHash: string): Promise<SessionRecord | null> {
      const session = sessions.get(tokenHash);
      if (session === undefined) {
        return null;
      }
      return { userId: session.userId, expiresAt: session.expiresAt };
    },
    async deleteSession(tokenHash: string): Promise<void> {
      sessions.delete(tokenHash);
    },
    async getSnapshot(userId: string): Promise<SnapshotRecord | null> {
      return snapshots.get(userId) ?? null;
    },
    async saveSnapshot(record: SnapshotRecord): Promise<void> {
      snapshots.set(record.userId, record);
    },
    async insertSubscription(record: SubscriptionRecord, _updatedAt?: Date): Promise<void> {
      subscriptions.push(record);
    },
    async grantSubscription(record: SubscriptionRecord, _updatedAt?: Date): Promise<void> {
      for (let index = 0; index < subscriptions.length; index += 1) {
        const row = subscriptions[index];
        if (row !== undefined && row.userId === record.userId && row.store === record.store && row.status === 'active') {
          subscriptions[index] = { ...row, status: 'expired' };
        }
      }
      subscriptions.push(record);
    },
    async subscriptionsFor(userId: string): Promise<readonly SubscriptionRecord[]> {
      return subscriptions.filter((row) => row.userId === userId);
    },
    async deletions(): Promise<readonly DeletionRecord[]> {
      return deletionRows;
    },
    async deleteAccount(userId: string, at: Date): Promise<void> {
      deletionRows.push({ userId, requestedAt: at, finishedAt: at });
      for (let index = 0; index < subscriptions.length; index += 1) {
        const row = subscriptions[index];
        if (row !== undefined && row.userId === userId) {
          subscriptions[index] = { ...row, status: 'closed' };
        }
      }
      for (const [hash, session] of sessions) {
        if (session.userId === userId) {
          sessions.delete(hash);
        }
      }
      snapshots.delete(userId);
      users.delete(userId);
      freeLife.delete(userId);
      for (const key of usage.keys()) {
        if (key.startsWith(`${userId}:`)) {
          usage.delete(key);
        }
      }
    },
    async getUsage(userId: string, day: string): Promise<{ questions: number; vectorRefreshes: number }> {
      return usage.get(`${userId}:${day}`) ?? { questions: 0, vectorRefreshes: 0 };
    },
    async addUsage(userId: string, day: string, kind: 'question' | 'vector'): Promise<void> {
      const key = `${userId}:${day}`;
      const current = usage.get(key) ?? { questions: 0, vectorRefreshes: 0 };
      usage.set(key, {
        questions: current.questions + (kind === 'question' ? 1 : 0),
        vectorRefreshes: current.vectorRefreshes + (kind === 'vector' ? 1 : 0),
      });
    },
    async freeLifeVectorUsed(userId: string): Promise<boolean> {
      return freeLife.has(userId);
    },
    async markFreeLifeVector(userId: string): Promise<void> {
      freeLife.add(userId);
    },
    async close(): Promise<void> {},
  };
}

export function newId(): string {
  return randomUUID();
}
