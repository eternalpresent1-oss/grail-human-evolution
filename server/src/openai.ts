import { counselSystemPrompt, lifeVectorPrompt } from './counselPrompt.ts';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 500;
const TEMPERATURE = 0.4;
const MESSAGE_MAX = 800;
const SNAPSHOT_MAX = 40_000;

export type CounselKind = 'question' | 'life_vector';

export interface CounselAskInput {
  kind: CounselKind;
  language: 'ru' | 'en';
  snapshot: string;
  prompt: string;
  thread: readonly { role: 'user' | 'assistant'; text: string }[];
}

export interface CounselAskResult {
  reply: string;
}

export type AskOpenAi = (input: CounselAskInput) => Promise<CounselAskResult>;

export function parseCounselKind(value: unknown): CounselKind | null {
  return value === 'question' || value === 'life_vector' ? value : null;
}

export function parseCounselLanguage(value: unknown): 'ru' | 'en' | null {
  return value === 'ru' || value === 'en' ? value : null;
}

export function buildCounselMessages(input: CounselAskInput): readonly { role: string; content: string }[] {
  const snapshot = input.snapshot.slice(0, SNAPSHOT_MAX);
  const prompt =
    input.kind === 'life_vector'
      ? lifeVectorPrompt(input.language)
      : input.prompt.slice(0, MESSAGE_MAX);
  const history =
    input.kind === 'life_vector'
      ? []
      : input.thread.slice(-12).map((message) => ({
          role: message.role,
          content: message.text.slice(0, MESSAGE_MAX),
        }));
  return [
    { role: 'system', content: counselSystemPrompt(input.language) },
    { role: 'system', content: `SNAPSHOT\n${snapshot}` },
    ...history,
    { role: 'user', content: prompt },
  ];
}

export function createAskOpenAi(apiKey: string, fetchImpl: typeof fetch = fetch): AskOpenAi {
  const key = apiKey.trim();
  return async (input) => {
    if (key.length === 0) {
      throw new Error('not_configured');
    }
    const response = await fetchImpl(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        messages: buildCounselMessages(input),
      }),
    });
    if (!response.ok) {
      throw new Error(`openai_${response.status}`);
    }
    const payload = (await response.json()) as {
      choices?: readonly { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content?.trim() ?? '';
    if (content.length === 0) {
      throw new Error('empty');
    }
    return { reply: content };
  };
}
