import { ArcheClientError, createArcheClient } from '@/api/archeClient';
import { apiBaseUrl, currentAccountSession } from '@/api/accountSession';
import { type TranslationKey } from '@/i18n';
import { type CounselMessage } from '@/types/counsel';
import { localDateKey } from '@/utils/taskTime';

export class CounselRequestError extends Error {
  override readonly name = 'CounselRequestError';
  readonly key: TranslationKey;

  constructor(key: TranslationKey) {
    super(key);
    this.key = key;
  }
}

export function counselErrorKey(status: number): TranslationKey {
  if (status === 401 || status === 403) {
    return 'counsel.error.unauthorized';
  }

  if (status === 429) {
    return 'counsel.error.rate';
  }

  return 'counsel.error.network';
}

export type CounselChannel = 'server' | 'none';

/** Counsellor and life-vector text only go through the signed-in API — never direct OpenAI from the phone. */
export function counselChannel(): CounselChannel {
  if (apiBaseUrl().length > 0 && currentAccountSession() !== null) {
    return 'server';
  }
  return 'none';
}

export async function requestCounselReply(input: {
  readonly language: 'ru' | 'en';
  readonly snapshot: string;
  readonly thread: readonly CounselMessage[];
  readonly prompt: string;
}): Promise<string> {
  if (counselChannel() === 'none') {
    throw new CounselRequestError('counsel.error.nokey');
  }
  return requestViaServer({
    kind: 'question',
    language: input.language,
    snapshot: input.snapshot,
    prompt: input.prompt,
    thread: input.thread.map((message) => ({ role: message.role, text: message.text })),
  });
}

export async function requestLifeVectorReading(input: {
  readonly language: 'ru' | 'en';
  readonly snapshot: string;
}): Promise<string> {
  if (counselChannel() === 'none') {
    throw new CounselRequestError('counsel.error.nokey');
  }
  return requestViaServer({
    kind: 'life_vector',
    language: input.language,
    snapshot: input.snapshot,
  });
}

async function requestViaServer(input: {
  kind: 'question' | 'life_vector';
  language: 'ru' | 'en';
  snapshot: string;
  prompt?: string;
  thread?: readonly { role: 'user' | 'assistant'; text: string }[];
}): Promise<string> {
  const session = currentAccountSession();
  const base = apiBaseUrl();
  if (session === null || base.length === 0) {
    throw new CounselRequestError('counsel.error.nokey');
  }
  try {
    const result = await createArcheClient(base).counsel(session.token, {
      kind: input.kind,
      day: localDateKey(),
      language: input.language,
      snapshot: input.snapshot,
      ...(input.prompt === undefined ? {} : { prompt: input.prompt }),
      ...(input.thread === undefined ? {} : { thread: input.thread }),
    });
    return result.reply;
  } catch (error) {
    if (error instanceof ArcheClientError) {
      if (error.failure === 'premium') {
        throw new CounselRequestError('access.premium');
      }
      if (error.failure === 'limit') {
        throw new CounselRequestError('access.limit');
      }
      if (error.failure === 'unauthorized') {
        throw new CounselRequestError('counsel.error.unauthorized');
      }
    }
    throw new CounselRequestError('counsel.error.network');
  }
}
