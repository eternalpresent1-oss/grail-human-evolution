/**
 * Direct OpenAI from the phone was removed before store builds.
 * Counsellor and life-vector calls go only through the signed-in Arche API.
 */
export const OPENAI_API_KEY = '';

export function resolveOpenAiKey(): string {
  return '';
}
