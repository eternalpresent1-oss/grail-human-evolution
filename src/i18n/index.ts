import { en, type TranslationKey } from '@/i18n/en';
import { type Language } from '@/i18n/language';
import { selectPluralCategory } from '@/i18n/plurals';
import { ru } from '@/i18n/ru';
import { type SurveyQuestionId, type SurveySectionId } from '@/constants/lifeSurvey';
import { type CampaignAdviceId } from '@/types/campaign';
import { type HumanDimensionId, type SeedAtomId, type ShadowCatalogId } from '@/types/grail';

export { LANGUAGES, DEFAULT_LANGUAGE, isLanguage, resolveLanguage } from '@/i18n/language';
export type { Language, LanguagePreference } from '@/i18n/language';
export type { TranslationKey } from '@/i18n/en';

export type TranslationParams = Readonly<Record<string, string | number>>;

type StripSuffix<Key extends string, Suffix extends string> = Key extends `${infer Base}.${Suffix}`
  ? Base
  : never;

/**
 * Keys of countable phrases. A base qualifies only when all four CLDR
 * categories exist, which is what makes `${base}.${category}` a total lookup —
 * there is no runtime fallback to write, and a half-declared plural is a
 * compile error rather than a missing string on screen.
 */
export type PluralKey = StripSuffix<TranslationKey, 'one'> &
  StripSuffix<TranslationKey, 'few'> &
  StripSuffix<TranslationKey, 'many'> &
  StripSuffix<TranslationKey, 'other'>;

export interface Translator {
  (key: TranslationKey, params?: TranslationParams): string;
  /** Resolved language, for the rare caller that has to branch on it. */
  readonly language: Language;
  /** `count` is passed to the template as `{count}` unless `params` overrides it. */
  readonly plural: (key: PluralKey, count: number, params?: TranslationParams) => string;
}

const PLACEHOLDER = /\{(\w+)\}/g;

const DICTIONARIES: Record<Language, Readonly<Record<TranslationKey, string>>> = { en, ru };

/** Translators are cached per language so hooks can use one as a memo dependency. */
const TRANSLATORS = new Map<Language, Translator>();

function interpolate(template: string, params: TranslationParams | undefined): string {
  if (params === undefined) {
    return template;
  }

  return template.replace(PLACEHOLDER, (token: string, name: string) => {
    const value = params[name];
    return value === undefined ? token : String(value);
  });
}

export function createTranslator(language: Language): Translator {
  const cached = TRANSLATORS.get(language);
  if (cached !== undefined) {
    return cached;
  }

  const dictionary = DICTIONARIES[language];

  const translate = (key: TranslationKey, params?: TranslationParams): string =>
    interpolate(dictionary[key], params);

  const translator: Translator = Object.assign(translate, {
    language,
    plural: (key: PluralKey, count: number, params?: TranslationParams): string =>
      interpolate(dictionary[`${key}.${selectPluralCategory(language, count)}`], {
        count,
        ...params,
      }),
  });

  TRANSLATORS.set(language, translator);

  return translator;
}

/** Display name of a vector, e.g. "Ремесло и Карьера". */
export function dimensionNameKey(id: HumanDimensionId): TranslationKey {
  return `dimension.${id}.name`;
}

/** Short form for the octagon axes, where a full name would overrun its ring. */
export function dimensionShortKey(id: HumanDimensionId): TranslationKey {
  return `dimension.${id}.short`;
}

/** One-line reading that opens when a vector is tapped on the octagon. */
export function dimensionBlurbKey(id: HumanDimensionId): TranslationKey {
  return `dimension.${id}.blurb`;
}

/** What belongs on a talent-tree branch for this vector. */
export function talentVectorKey(id: HumanDimensionId): TranslationKey {
  return `talent.vector.${id}`;
}

type LifeCopyBand = 'veryLow' | 'low' | 'mid' | 'high' | 'veryHigh';
type DailyCopyKind = 'done' | 'partial' | 'missed';

/** Body on a life analysis card, keyed by the absolute score band. */
export function analyticsLifeBodyKey(id: HumanDimensionId, band: LifeCopyBand): TranslationKey {
  return `analytics.life.${band}.${id}`;
}

/** Body line for one vector inside a grouped day card. */
export function analyticsDailyBodyKey(id: HumanDimensionId, kind: DailyCopyKind): TranslationKey {
  return `analytics.daily.${kind}.${id}`;
}

export function seedAtomTitleKey(id: SeedAtomId): TranslationKey {
  return `seed.${id}.title`;
}

export function seedAtomInstructionKey(id: SeedAtomId): TranslationKey {
  return `seed.${id}.instruction`;
}

export function shadowTitleKey(id: ShadowCatalogId): TranslationKey {
  return `shadow.${id}.title` as TranslationKey;
}

export function shadowHintKey(id: ShadowCatalogId): TranslationKey {
  return `shadow.${id}.hint` as TranslationKey;
}

export function analyticsShadowBodyKey(id: ShadowCatalogId): TranslationKey {
  return `analytics.shadow.body.${id}` as TranslationKey;
}

export function analyticsShadowHelpKey(id: ShadowCatalogId): TranslationKey {
  return `analytics.shadow.help.${id}` as TranslationKey;
}

export function surveyQuestionKey(id: SurveyQuestionId): TranslationKey {
  return `survey.q.${id}`;
}

export function surveyOptionKey(id: SurveyQuestionId, optionId: string): TranslationKey {
  return `survey.q.${id}.${optionId}` as TranslationKey;
}

export function surveySectionKey(id: SurveySectionId): TranslationKey {
  return `survey.section.${id}`;
}

export function campaignAdviceTitleKey(id: CampaignAdviceId): TranslationKey {
  return `campaign.advice.${id}.title`;
}

export function campaignAdviceInstructionKey(id: CampaignAdviceId): TranslationKey {
  return `campaign.advice.${id}.instruction`;
}

export function disciplineStepTitleKey(id: number): TranslationKey {
  return `discipline.step.${id}.title` as TranslationKey;
}

export function disciplineStepBodyKey(id: number): TranslationKey {
  return `discipline.step.${id}.body` as TranslationKey;
}

export function disciplineStepNeedKey(id: number): TranslationKey {
  return `discipline.step.${id}.need` as TranslationKey;
}
