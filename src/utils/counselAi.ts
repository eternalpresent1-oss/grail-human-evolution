import { ArcheClientError, createArcheClient } from '@/api/archeClient';
import { apiBaseUrl, currentAccountSession } from '@/api/accountSession';
import { type TranslationKey } from '@/i18n';
import { COUNSEL_MESSAGE_MAX, type CounselMessage } from '@/types/counsel';
import { counselSystemPrompt, lifeVectorPrompt } from '@/utils/grailSnapshot';
import { resolveOpenAiKey } from '@/config/openaiKey';
import { localDateKey } from '@/utils/taskTime';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

export class CounselRequestError extends Error {
  override readonly name = 'CounselRequestError';
  readonly key: TranslationKey;

  constructor(key: TranslationKey) {
    super(key);
    this.key = key;
  }
}

interface ChatCompletionResponse {
  readonly choices?: readonly {
    readonly message?: { readonly content?: string };
  }[];
}

function extractContent(payload: ChatCompletionResponse): string | null {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return null;
  }

  const trimmed = content.trim();
  return trimmed.length === 0 ? null : trimmed;
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

export type CounselChannel = 'server' | 'local' | 'none';

export function counselChannel(): CounselChannel {
  if (apiBaseUrl().length > 0 && currentAccountSession() !== null) {
    return 'server';
  }
  if (resolveOpenAiKey().length > 0) {
    return 'local';
  }
  return 'none';
}

export async function requestCounselReply(input: {
  readonly language: 'ru' | 'en';
  readonly snapshot: string;
  readonly thread: readonly CounselMessage[];
  readonly prompt: string;
}): Promise<string> {
  const channel = counselChannel();
  if (channel === 'none') {
    throw new CounselRequestError('counsel.error.nokey');
  }
  if (channel === 'server') {
    return requestViaServer({
      kind: 'question',
      language: input.language,
      snapshot: input.snapshot,
      prompt: input.prompt,
      thread: input.thread.map((message) => ({ role: message.role, text: message.text })),
    });
  }
  return requestViaOpenAi(input);
}

export async function requestLifeVectorReading(input: {
  readonly language: 'ru' | 'en';
  readonly snapshot: string;
}): Promise<string> {
  const channel = counselChannel();
  if (channel === 'none') {
    throw new CounselRequestError('counsel.error.nokey');
  }
  if (channel === 'server') {
    return requestViaServer({
      kind: 'life_vector',
      language: input.language,
      snapshot: input.snapshot,
    });
  }
  return requestViaOpenAi({
    ...input,
    thread: [],
    prompt: lifeVectorPrompt(input.language),
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

async function requestViaOpenAi(input: {
  readonly language: 'ru' | 'en';
  readonly snapshot: string;
  readonly thread: readonly CounselMessage[];
  readonly prompt: string;
}): Promise<string> {
  const key = resolveOpenAiKey();
  if (key.length === 0) {
    throw new CounselRequestError('counsel.error.nokey');
  }

  const history = input.thread.slice(-12).map((message) => ({
    role: message.role,
    content: message.text,
  }));

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          { role: 'system', content: counselSystemPrompt(input.language) },
          {
            role: 'system',
            content: `SNAPSHOT\n${input.snapshot}`,
          },
          ...history,
          { role: 'user', content: input.prompt.slice(0, COUNSEL_MESSAGE_MAX) },
        ],
      }),
    });
  } catch {
    throw new CounselRequestError('counsel.error.network');
  }

  if (!response.ok) {
    throw new CounselRequestError(counselErrorKey(response.status));
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = extractContent(payload);

  if (content === null) {
    throw new CounselRequestError('counsel.error.empty');
  }

  return content;
}
