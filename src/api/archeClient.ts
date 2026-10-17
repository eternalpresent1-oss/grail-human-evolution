export type AuthProvider = 'apple' | 'google';

export interface AccountSession {
  token: string;
  userId: string;
  provider: AuthProvider;
  revision: number;
}

export interface RemoteSnapshot {
  revision: number;
  payload: Record<string, unknown> | null;
}

export type ClientFailure = 'unavailable' | 'unauthorized' | 'invalid' | 'conflict' | 'premium' | 'limit';

export class ArcheClientError extends Error {
  constructor(readonly failure: ClientFailure) {
    super(failure);
  }
}

export interface ArcheClient {
  signIn(provider: AuthProvider, identityToken: string): Promise<AccountSession>;
  signOut(token: string): Promise<void>;
  deleteAccount(token: string): Promise<void>;
  getSnapshot(token: string): Promise<RemoteSnapshot>;
  putSnapshot(token: string, revision: number, payload: Record<string, unknown>): Promise<RemoteSnapshot>;
  access(token: string, feature: string, day: string): Promise<{ allowed: boolean; reason: string }>;
  submitPurchase(token: string, store: AuthProvider, receipt: string): Promise<{ status: string }>;
  counsel(
    token: string,
    input: {
      kind: 'question' | 'life_vector';
      day: string;
      language: 'ru' | 'en';
      snapshot: string;
      prompt?: string;
      thread?: readonly { role: 'user' | 'assistant'; text: string }[];
    },
  ): Promise<{ reply: string }>;
}

interface FetchResponse {
  status: number;
  json(): Promise<unknown>;
}

export function createArcheClient(baseUrl: string, fetchImpl: typeof fetch = fetch): ArcheClient {
  const root = baseUrl.replace(/\/$/, '');

  return {
    async signIn(provider, identityToken) {
      const path = provider === 'apple' ? '/v1/auth/apple' : '/v1/auth/google';
      const body = provider === 'apple' ? { identityToken } : { idToken: identityToken };
      const payload = await request(root, fetchImpl, path, { method: 'POST', body });
      const token = readString(payload, 'token');
      const user = readObject(payload, 'user');
      const userId = user === null ? null : readString(user, 'id');
      if (token === null || userId === null) {
        throw new ArcheClientError('invalid');
      }
      return { token, userId, provider, revision: 0 };
    },
    async signOut(token) {
      await request(root, fetchImpl, '/v1/session', { method: 'DELETE', token });
    },
    async deleteAccount(token) {
      await request(root, fetchImpl, '/v1/account', { method: 'DELETE', token });
    },
    async getSnapshot(token) {
      return readSnapshot(await request(root, fetchImpl, '/v1/sync', { method: 'GET', token }));
    },
    async putSnapshot(token, revision, payload) {
      return readSnapshot(
        await request(root, fetchImpl, '/v1/sync', { method: 'PUT', token, body: { revision, payload } }),
      );
    },
    async access(token, feature, day) {
      const payload = await request(root, fetchImpl, '/v1/access', {
        method: 'POST',
        token,
        body: { feature, day },
      });
      if (payload === null || typeof payload !== 'object') {
        throw new ArcheClientError('invalid');
      }
      const record = payload as { allowed?: unknown; reason?: unknown };
      return {
        allowed: record.allowed === true,
        reason: typeof record.reason === 'string' ? record.reason : 'premium',
      };
    },
    async submitPurchase(token, store, receipt) {
      const path = store === 'apple' ? '/v1/billing/apple' : '/v1/billing/google';
      const body = store === 'apple' ? { signedTransaction: receipt } : { purchaseToken: receipt };
      const payload = await request(root, fetchImpl, path, { method: 'POST', token, body });
      const status = readString(payload, 'status');
      if (status === null) {
        throw new ArcheClientError('invalid');
      }
      return { status };
    },
    async counsel(token, input) {
      const payload = await request(root, fetchImpl, '/v1/counsel', {
        method: 'POST',
        token,
        body: {
          kind: input.kind,
          day: input.day,
          language: input.language,
          snapshot: input.snapshot,
          ...(input.prompt === undefined ? {} : { prompt: input.prompt }),
          ...(input.thread === undefined ? {} : { thread: input.thread }),
        },
      });
      const reply = readString(payload, 'reply');
      if (reply === null) {
        throw new ArcheClientError('invalid');
      }
      return { reply };
    },
  };
}

async function request(
  root: string,
  fetchImpl: typeof fetch,
  path: string,
  input: { method: string; token?: string; body?: unknown },
): Promise<unknown> {
  if (root.length === 0) {
    throw new ArcheClientError('unavailable');
  }
  let response: FetchResponse;
  try {
    response = (await fetchImpl(`${root}${path}`, {
      method: input.method,
      headers: {
        'content-type': 'application/json',
        ...(input.token === undefined ? {} : { authorization: `Bearer ${input.token}` }),
      },
      body: input.body === undefined ? null : JSON.stringify(input.body),
    })) as FetchResponse;
  } catch {
    throw new ArcheClientError('unavailable');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (response.status === 401) {
    throw new ArcheClientError('unauthorized');
  }
  if (response.status === 403) {
    const reason = readString(payload, 'reason');
    throw new ArcheClientError(reason === 'limit' ? 'limit' : 'premium');
  }
  if (response.status === 409) {
    const error = new ArcheClientError('conflict');
    (error as ArcheClientError & { snapshot?: RemoteSnapshot }).snapshot = readSnapshot(payload);
    throw error;
  }
  if (response.status < 200 || response.status >= 300) {
    throw new ArcheClientError('unavailable');
  }
  return payload;
}

function readSnapshot(payload: unknown): RemoteSnapshot {
  const revision = readNumber(payload, 'revision');
  if (revision === null) {
    const wrapped = readObject(payload, 'snapshot');
    const wrappedRevision = wrapped === null ? null : readNumber(wrapped, 'revision');
    if (wrapped === null || wrappedRevision === null) {
      throw new ArcheClientError('invalid');
    }
    return { revision: wrappedRevision, payload: readPayload(wrapped) };
  }
  return { revision, payload: readPayload(payload as Record<string, unknown>) };
}

function readPayload(record: Record<string, unknown>): Record<string, unknown> | null {
  const payload = record.payload;
  if (payload === null) {
    return null;
  }
  if (payload === undefined || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ArcheClientError('invalid');
  }
  return payload as Record<string, unknown>;
}

function readObject(value: unknown, key: string): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const entry = (value as Record<string, unknown>)[key];
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }
  return entry as Record<string, unknown>;
}

function readString(value: unknown, key: string): string | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const entry = (value as Record<string, unknown>)[key];
  return typeof entry === 'string' && entry.length > 0 ? entry : null;
}

function readNumber(value: unknown, key: string): number | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const entry = (value as Record<string, unknown>)[key];
  return typeof entry === 'number' ? entry : null;
}

export function conflictSnapshot(error: unknown): RemoteSnapshot | null {
  if (!(error instanceof ArcheClientError) || error.failure !== 'conflict') {
    return null;
  }
  const snapshot = (error as ArcheClientError & { snapshot?: RemoteSnapshot }).snapshot;
  return snapshot ?? null;
}
