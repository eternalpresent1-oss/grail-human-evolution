/**
 * OpenAI key for the in-app counsellor.
 *
 * Leave empty so a preview APK does not ship a secret. Paste a key between
 * the quotes only on a private development client, then make a new APK.
 * Do not commit a filled key.
 */
export const OPENAI_API_KEY = '';

export function resolveOpenAiKey(): string {
  return OPENAI_API_KEY.trim();
}
