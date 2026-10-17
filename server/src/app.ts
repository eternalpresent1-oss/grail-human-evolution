import type { AccountStore, Provider } from './store.ts';
import type { VerifiedIdentity } from './identity.ts';
import {
  countShadowMarks,
  decideAccess,
  hasLifeVectorReading,
  isPremiumActive,
  parseFeature,
} from './access.ts';
import { newId } from './memoryStore.ts';
import { bearerToken, hashSessionToken, newSessionToken } from './session.ts';
import { acceptPurchase, type VerifiedPurchase } from './billing.ts';
import { decideSnapshot, preparePayload } from './snapshot.ts';
import {
  parseCounselKind,
  parseCounselLanguage,
  type AskOpenAi,
  type CounselAskInput,
} from './openai.ts';
import type { AccessFeature } from './access.ts';

export interface HttpRequest {
  method: string;
  path: string;
  authorization: string | undefined;
  body: unknown;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}

export interface AppDeps {
  store: AccountStore;
  verify: (provider: Provider, token: string) => Promise<VerifiedIdentity>;
  now: () => Date;
  sessionTtlMs: number;
  appleConfigured: boolean;
  googleConfigured: boolean;
  verifyPurchase?: (store: Provider, token: string) => Promise<VerifiedPurchase>;
  askOpenAi?: AskOpenAi;
}

export function createApp(deps: AppDeps): (request: HttpRequest) => Promise<HttpResponse> {
  return async (request) => {
    try {
      return await route(deps, request);
    } catch {
      return { status: 401, body: { error: 'unauthorized' } };
    }
  };
}

async function route(deps: AppDeps, request: HttpRequest): Promise<HttpResponse> {
  const { method, path } = request;
  if (method === 'GET' && path === '/health') {
    return { status: 200, body: { ok: true } };
  }
  if (method === 'POST' && path === '/v1/auth/apple') {
    return signIn(deps, 'apple', request.body, deps.appleConfigured);
  }
  if (method === 'POST' && path === '/v1/auth/google') {
    return signIn(deps, 'google', request.body, deps.googleConfigured);
  }
  const userId = await requireUser(deps, request.authorization);
  if (userId === null) {
    return { status: 401, body: { error: 'unauthorized' } };
  }
  if (method === 'DELETE' && path === '/v1/session') {
    const token = bearerToken(request.authorization);
    if (token !== null) {
      await deps.store.deleteSession(hashSessionToken(token));
    }
    return { status: 200, body: { ok: true } };
  }
  if (method === 'GET' && path === '/v1/sync') {
    const current = await deps.store.getSnapshot(userId);
    if (current === null) {
      return { status: 200, body: { revision: 0, payload: null, updatedAt: null } };
    }
    return { status: 200, body: publicSnapshot(current) };
  }
  if (method === 'PUT' && path === '/v1/sync') {
    return putSnapshot(deps, userId, request.body);
  }
  if (method === 'DELETE' && path === '/v1/account') {
    await deps.store.deleteAccount(userId, deps.now());
    return { status: 200, body: { ok: true } };
  }
  if (method === 'POST' && path === '/v1/access') {
    return checkAccess(deps, userId, request.body);
  }
  if (method === 'POST' && (path === '/v1/billing/apple' || path === '/v1/billing/google')) {
    const store = path.endsWith('/apple') ? 'apple' : 'google';
    return grantPurchase(deps, userId, store, request.body);
  }
  if (method === 'POST' && path === '/v1/counsel') {
    return askCounsel(deps, userId, request.body);
  }
  return { status: 404, body: { error: 'not_found' } };
}

async function grantPurchase(
  deps: AppDeps,
  userId: string,
  store: Provider,
  body: unknown,
): Promise<HttpResponse> {
  if (body === null || typeof body !== 'object' || Array.isArray(body) || 'isPremium' in body) {
    return { status: 400, body: { error: 'invalid' } };
  }
  if (deps.verifyPurchase === undefined) {
    return { status: 503, body: { error: 'not_configured' } };
  }
  const key = store === 'apple' ? 'signedTransaction' : 'purchaseToken';
  const token = (body as Record<string, unknown>)[key];
  if (typeof token !== 'string' || token.length === 0) {
    return { status: 400, body: { error: 'invalid' } };
  }
  let purchase: VerifiedPurchase;
  try {
    purchase = await deps.verifyPurchase(store, token);
  } catch {
    return { status: 401, body: { error: 'unauthorized' } };
  }
  const accepted = acceptPurchase(store, purchase, deps.now());
  if (accepted === null) {
    return { status: 400, body: { error: 'invalid' } };
  }
  await deps.store.grantSubscription(
    {
      id: newId(),
      userId,
      store,
      productId: accepted.productId,
      status: accepted.status,
      periodEnd: accepted.periodEnd,
      autoRenew: accepted.autoRenew,
    },
    deps.now(),
  );
  return { status: 200, body: { status: accepted.status } };
}

async function askCounsel(deps: AppDeps, userId: string, body: unknown): Promise<HttpResponse> {
  if (body === null || typeof body !== 'object' || Array.isArray(body) || 'isPremium' in body) {
    return { status: 400, body: { error: 'invalid' } };
  }
  if (deps.askOpenAi === undefined) {
    return { status: 503, body: { error: 'not_configured' } };
  }
  const record = body as Record<string, unknown>;
  const kind = parseCounselKind(record.kind);
  const language = parseCounselLanguage(record.language);
  const day = record.day;
  const snapshot = record.snapshot;
  if (
    kind === null ||
    language === null ||
    typeof day !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    typeof snapshot !== 'string' ||
    snapshot.length === 0
  ) {
    return { status: 400, body: { error: 'invalid' } };
  }
  const feature: AccessFeature = kind === 'question' ? 'counsel_question' : 'life_vector';
  const prompt = typeof record.prompt === 'string' ? record.prompt : '';
  if (kind === 'question' && prompt.trim().length === 0) {
    return { status: 400, body: { error: 'invalid' } };
  }
  const thread = readThread(record.thread);
  if (thread === null) {
    return { status: 400, body: { error: 'invalid' } };
  }
  const decision = await decideForUser(deps, userId, feature, day);
  if (!decision.allowed) {
    return { status: 403, body: { error: 'forbidden', reason: decision.reason } };
  }
  const askInput: CounselAskInput = {
    kind,
    language,
    snapshot,
    prompt,
    thread,
  };
  let reply: string;
  try {
    reply = (await deps.askOpenAi(askInput)).reply;
  } catch {
    return { status: 502, body: { error: 'unavailable' } };
  }
  await applySpend(deps, userId, day, decision.spend);
  return { status: 200, body: { reply } };
}

async function decideForUser(
  deps: AppDeps,
  userId: string,
  feature: AccessFeature,
  day: string,
): Promise<ReturnType<typeof decideAccess>> {
  const subscriptions = await deps.store.subscriptionsFor(userId);
  const premium = subscriptions.some((row) => isPremiumActive(row.status, row.periodEnd, deps.now()));
  const snapshot = await deps.store.getSnapshot(userId);
  const usage = await deps.store.getUsage(userId, day);
  return decideAccess({
    feature,
    premium,
    shadowMarks: countShadowMarks(snapshot?.payload ?? null),
    hasLifeVector: hasLifeVectorReading(snapshot?.payload ?? null),
    freeLifeVectorUsed: await deps.store.freeLifeVectorUsed(userId),
    questions: usage.questions,
    vectorRefreshes: usage.vectorRefreshes,
  });
}

async function applySpend(
  deps: AppDeps,
  userId: string,
  day: string,
  spend: ReturnType<typeof decideAccess>['spend'],
): Promise<void> {
  if (spend === 'question') {
    await deps.store.addUsage(userId, day, 'question');
  }
  if (spend === 'vector') {
    await deps.store.addUsage(userId, day, 'vector');
  }
  if (spend === 'free_life') {
    await deps.store.markFreeLifeVector(userId);
  }
}

function readThread(value: unknown): CounselAskInput['thread'] | null {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const thread: { role: 'user' | 'assistant'; text: string }[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return null;
    }
    const role = (item as { role?: unknown }).role;
    const text = (item as { text?: unknown }).text;
    if ((role !== 'user' && role !== 'assistant') || typeof text !== 'string') {
      return null;
    }
    thread.push({ role, text });
  }
  return thread;
}

async function checkAccess(deps: AppDeps, userId: string, body: unknown): Promise<HttpResponse> {
  if (body === null || typeof body !== 'object' || Array.isArray(body) || 'isPremium' in body) {
    return { status: 400, body: { error: 'invalid' } };
  }
  const feature = parseFeature((body as { feature?: unknown }).feature);
  const day = (body as { day?: unknown }).day;
  if (feature === null) {
    return { status: 400, body: { error: 'invalid' } };
  }
  const needsDay = feature === 'counsel_question' || feature === 'vector_refresh' || feature === 'life_vector';
  if (needsDay && (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day))) {
    return { status: 400, body: { error: 'invalid' } };
  }
  const usageDay = typeof day === 'string' ? day : '1970-01-01';
  const decision = await decideForUser(deps, userId, feature, usageDay);
  if (decision.allowed) {
    await applySpend(deps, userId, usageDay, decision.spend);
  }
  return { status: 200, body: { allowed: decision.allowed, reason: decision.reason } };
}

async function signIn(
  deps: AppDeps,
  provider: Provider,
  body: unknown,
  configured: boolean,
): Promise<HttpResponse> {
  if (!configured) {
    return { status: 503, body: { error: 'not_configured' } };
  }
  const token = identityToken(provider, body);
  if (token === null) {
    return { status: 400, body: { error: 'invalid' } };
  }
  const identity = await deps.verify(provider, token);
  if (identity.provider !== provider) {
    return { status: 401, body: { error: 'unauthorized' } };
  }
  const now = deps.now();
  let user = await deps.store.findUser(provider, identity.subject);
  if (user === null) {
    user = {
      id: newId(),
      provider,
      providerSubject: identity.subject,
      email: identity.email,
    };
    await deps.store.insertUser(user, now);
  } else if (identity.email !== null && identity.email !== user.email) {
    await deps.store.updateEmail(user.id, identity.email);
  }
  const sessionToken = newSessionToken();
  await deps.store.insertSession(
    newId(),
    user.id,
    hashSessionToken(sessionToken),
    new Date(now.getTime() + deps.sessionTtlMs),
    now,
  );
  return { status: 200, body: { token: sessionToken, user: { id: user.id, provider } } };
}

async function putSnapshot(deps: AppDeps, userId: string, body: unknown): Promise<HttpResponse> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, body: { error: 'invalid' } };
  }
  const revision = (body as { revision?: unknown }).revision;
  const payload = preparePayload((body as { payload?: unknown }).payload);
  if (typeof revision !== 'number' || payload === null) {
    return { status: 400, body: { error: 'invalid' } };
  }
  const current = await deps.store.getSnapshot(userId);
  const decision = decideSnapshot(
    current === null
      ? null
      : {
          revision: current.revision,
          payload: current.payload,
          updatedAt: current.updatedAt.toISOString(),
        },
    revision,
    payload,
    deps.now(),
  );
  if (decision === null) {
    return { status: 400, body: { error: 'invalid' } };
  }
  if (decision.kind === 'saved') {
    await deps.store.saveSnapshot({
      userId,
      revision: decision.snapshot.revision,
      payload: decision.snapshot.payload,
      updatedAt: new Date(decision.snapshot.updatedAt),
    });
  }
  const status = decision.kind === 'conflict' ? 409 : 200;
  const error = decision.kind === 'conflict' ? { error: 'conflict' } : {};
  return { status, body: { ...error, snapshot: decision.snapshot } };
}

async function requireUser(deps: AppDeps, authorization: string | undefined): Promise<string | null> {
  const token = bearerToken(authorization);
  if (token === null) {
    return null;
  }
  const session = await deps.store.findSession(hashSessionToken(token));
  if (session === null || session.expiresAt.getTime() <= deps.now().getTime()) {
    if (session !== null) {
      await deps.store.deleteSession(hashSessionToken(token));
    }
    return null;
  }
  return session.userId;
}

function identityToken(provider: Provider, body: unknown): string | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  const key = provider === 'apple' ? 'identityToken' : 'idToken';
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function publicSnapshot(record: { revision: number; payload: Record<string, unknown>; updatedAt: Date }): {
  revision: number;
  payload: Record<string, unknown>;
  updatedAt: string;
} {
  return {
    revision: record.revision,
    payload: record.payload,
    updatedAt: record.updatedAt.toISOString(),
  };
}
