export type Provider = 'apple' | 'google';

export interface UserRecord {
  id: string;
  provider: Provider;
  providerSubject: string;
  email: string | null;
}

export interface SessionRecord {
  userId: string;
  expiresAt: Date;
}

export interface SnapshotRecord {
  userId: string;
  revision: number;
  payload: Record<string, unknown>;
  updatedAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  store: Provider;
  productId: string;
  status: string;
  periodEnd: Date | null;
  autoRenew: boolean;
}

export interface DeletionRecord {
  userId: string;
  requestedAt: Date;
  finishedAt: Date;
}

export interface AccountStore {
  findUser(provider: Provider, providerSubject: string): Promise<UserRecord | null>;
  insertUser(user: UserRecord, createdAt: Date): Promise<void>;
  updateEmail(userId: string, email: string): Promise<void>;
  insertSession(id: string, userId: string, tokenHash: string, expiresAt: Date, createdAt: Date): Promise<void>;
  findSession(tokenHash: string): Promise<SessionRecord | null>;
  deleteSession(tokenHash: string): Promise<void>;
  getSnapshot(userId: string): Promise<SnapshotRecord | null>;
  saveSnapshot(record: SnapshotRecord): Promise<void>;
  insertSubscription(record: SubscriptionRecord, updatedAt: Date): Promise<void>;
  grantSubscription(record: SubscriptionRecord, updatedAt: Date): Promise<void>;
  subscriptionsFor(userId: string): Promise<readonly SubscriptionRecord[]>;
  deletions(): Promise<readonly DeletionRecord[]>;
  deleteAccount(userId: string, at: Date): Promise<void>;
  getUsage(userId: string, day: string): Promise<{ questions: number; vectorRefreshes: number }>;
  addUsage(userId: string, day: string, kind: 'question' | 'vector'): Promise<void>;
  freeLifeVectorUsed(userId: string): Promise<boolean>;
  markFreeLifeVector(userId: string): Promise<void>;
  close(): Promise<void>;
}
