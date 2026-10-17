import { type Language } from '@/i18n/language';

/**
 * CLDR plural categories. Both shipped languages declare all four so a lookup
 * of `${key}.${category}` is always resolvable — English simply repeats the
 * plural wording in `few`, `many` and `other`.
 */
export type PluralCategory = 'one' | 'few' | 'many' | 'other';

/**
 * Hermes ships no `Intl.PluralRules` (it is listed under "not yet supported"
 * in the Hermes Intl docs, and FormatJS documents the same gap for React
 * Native), so the two rule sets we need are inlined rather than polyfilled.
 * Both follow the CLDR plural rules for cardinal numbers.
 */
export function selectPluralCategory(language: Language, count: number): PluralCategory {
  const value = Math.abs(count);

  // Fractions fall into `other` in both languages: "1.5 атома", "1.5 atoms".
  if (!Number.isInteger(value)) {
    return 'other';
  }

  if (language === 'en') {
    return value === 1 ? 'one' : 'other';
  }

  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'many';
  }
  if (lastDigit === 1) {
    return 'one';
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'few';
  }

  return 'many';
}
