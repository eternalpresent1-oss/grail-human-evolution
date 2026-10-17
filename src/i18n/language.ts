/** Languages the app ships dictionaries for. English first, then Russian. */
export const LANGUAGES = ['en', 'ru'] as const;

export type Language = (typeof LANGUAGES)[number];

/**
 * Legacy persisted choice. The UI follows the device; this remains only so old
 * snapshots still migrate.
 */
export type LanguagePreference = Language | 'system';

export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}

/**
 * The phone's locale, or English when the device speaks a language we do not
 * ship. There is no in-app override.
 */
export function resolveLanguage(systemLanguage: Language | null): Language {
  return systemLanguage ?? DEFAULT_LANGUAGE;
}
