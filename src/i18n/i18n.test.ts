import { en } from '@/i18n/en';
import {
  campaignAdviceInstructionKey,
  campaignAdviceTitleKey,
  createTranslator,
  analyticsDailyBodyKey,
  analyticsLifeBodyKey,
  analyticsShadowBodyKey,
  analyticsShadowHelpKey,
  dimensionBlurbKey,
  talentVectorKey,
  dimensionNameKey,
  dimensionShortKey,
  disciplineStepBodyKey,
  disciplineStepNeedKey,
  disciplineStepTitleKey,
  seedAtomInstructionKey,
  seedAtomTitleKey,
  surveyOptionKey,
  surveyQuestionKey,
} from '@/i18n';
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES, resolveLanguage } from '@/i18n/language';
import { selectPluralCategory } from '@/i18n/plurals';
import { ru } from '@/i18n/ru';
import { SURVEY_QUESTIONS } from '@/constants/lifeSurvey';
import { CAMPAIGN_ADVICE_IDS } from '@/types/campaign';
import { DISCIPLINE_STEP_IDS } from '@/types/discipline';
import { HUMAN_DIMENSION_IDS, SEED_ATOM_IDS, SHADOW_CATALOG_IDS } from '@/types/grail';

describe('dictionaries', () => {
  // The type system already rejects a missing key; this is the cheap guarantee
  // that neither dictionary has drifted with a key the other never declared.
  it('declare exactly the same keys', () => {
    const russianKeys = Object.keys(ru).sort();
    const englishKeys = Object.keys(en).sort();

    expect(englishKeys).toEqual(russianKeys);
  });

  it('leave no string empty', () => {
    const blank = LANGUAGES.flatMap((language) =>
      Object.entries(language === 'ru' ? ru : en)
        .filter(([, value]) => value.trim().length === 0)
        .map(([key]) => `${language}:${key}`),
    );

    expect(blank).toEqual([]);
  });

  it('carries every placeholder of the source text into the translation', () => {
    const placeholders = (value: string): string[] =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

    for (const [key, source] of Object.entries(en)) {
      expect(placeholders(ru[key as keyof typeof en])).toEqual(placeholders(source));
    }
  });

  it('covers every dimension and every seed atom', () => {
    for (const id of HUMAN_DIMENSION_IDS) {
      expect(ru[dimensionNameKey(id)]).toBeTruthy();
      expect(ru[dimensionShortKey(id)]).toBeTruthy();
      expect(ru[dimensionBlurbKey(id)]).toBeTruthy();
      expect(ru[talentVectorKey(id)]).toBeTruthy();
      expect(ru[analyticsLifeBodyKey(id, 'veryLow')]).toBeTruthy();
      expect(ru[analyticsLifeBodyKey(id, 'low')]).toBeTruthy();
      expect(ru[analyticsLifeBodyKey(id, 'mid')]).toBeTruthy();
      expect(ru[analyticsLifeBodyKey(id, 'high')]).toBeTruthy();
      expect(ru[analyticsLifeBodyKey(id, 'veryHigh')]).toBeTruthy();
      expect(ru[analyticsDailyBodyKey(id, 'done')]).toBeTruthy();
      expect(ru[analyticsDailyBodyKey(id, 'partial')]).toBeTruthy();
      expect(ru[analyticsDailyBodyKey(id, 'missed')]).toBeTruthy();
    }

    for (const id of SEED_ATOM_IDS) {
      expect(ru[seedAtomTitleKey(id)]).toBeTruthy();
      expect(ru[seedAtomInstructionKey(id)]).toBeTruthy();
    }

    for (const id of SHADOW_CATALOG_IDS) {
      expect(ru[`shadow.${id}.title`]).toBeTruthy();
      expect(ru[`shadow.${id}.hint`]).toBeTruthy();
      expect(ru[analyticsShadowBodyKey(id)]).toBeTruthy();
      expect(ru[analyticsShadowHelpKey(id)]).toBeTruthy();
    }

    for (const question of SURVEY_QUESTIONS) {
      expect(ru[surveyQuestionKey(question.id)]).toBeTruthy();

      for (const option of question.options) {
        expect(ru[surveyOptionKey(question.id, option.id)]).toBeTruthy();
      }
    }

    for (const id of CAMPAIGN_ADVICE_IDS) {
      expect(ru[campaignAdviceTitleKey(id)]).toBeTruthy();
      expect(ru[campaignAdviceInstructionKey(id)]).toBeTruthy();
    }

    for (const id of DISCIPLINE_STEP_IDS) {
      expect(ru[disciplineStepTitleKey(id)]).toBeTruthy();
      expect(ru[disciplineStepBodyKey(id)]).toBeTruthy();
      expect(ru[disciplineStepNeedKey(id)]).toBeTruthy();
    }
  });
});

describe('selectPluralCategory', () => {
  it('picks the three Russian integer forms', () => {
    expect(selectPluralCategory('ru', 1)).toBe('one');
    expect(selectPluralCategory('ru', 21)).toBe('one');
    expect(selectPluralCategory('ru', 2)).toBe('few');
    expect(selectPluralCategory('ru', 34)).toBe('few');
    expect(selectPluralCategory('ru', 5)).toBe('many');
    expect(selectPluralCategory('ru', 11)).toBe('many');
    expect(selectPluralCategory('ru', 14)).toBe('many');
    expect(selectPluralCategory('ru', 111)).toBe('many');
    expect(selectPluralCategory('ru', 0)).toBe('many');
  });

  it('picks the two English forms', () => {
    expect(selectPluralCategory('en', 1)).toBe('one');
    expect(selectPluralCategory('en', 0)).toBe('other');
    expect(selectPluralCategory('en', 21)).toBe('other');
  });

  it('sends fractions to other in both languages', () => {
    expect(selectPluralCategory('ru', 1.5)).toBe('other');
    expect(selectPluralCategory('en', 1.5)).toBe('other');
  });
});

describe('createTranslator', () => {
  const ruT = createTranslator('ru');
  const enT = createTranslator('en');

  it('is cached per language, so it can be a memo dependency', () => {
    expect(createTranslator('ru')).toBe(ruT);
    expect(createTranslator('en')).not.toBe(ruT);
  });

  it('substitutes placeholders by name', () => {
    expect(ruT('atom.instruction.default', { title: 'Зарядка' })).toBe(
      'Выполни атом «Зарядка» полностью. Без замены, без переноса, без театра.',
    );
    expect(enT('atom.instruction.default', { title: 'Зарядка' })).toBe(
      'Complete the atom “Зарядка” fully. No substitute, no postponement, no theatre.',
    );
  });

  it('leaves an unknown placeholder visible rather than printing undefined', () => {
    expect(ruT('atom.instruction.default')).toBe(
      'Выполни атом «{title}» полностью. Без замены, без переноса, без театра.',
    );
  });

  it('declines the Russian noun by count and keeps English on two forms', () => {
    expect(ruT.plural('settings.data.age', 1)).toBe('Возраст: 1 год');
    expect(ruT.plural('settings.data.age', 22)).toBe('Возраст: 22 года');
    expect(ruT.plural('settings.data.age', 28)).toBe('Возраст: 28 лет');
    expect(enT.plural('settings.data.age', 1)).toBe('Age: 1 year');
    expect(enT.plural('settings.data.age', 28)).toBe('Age: 28 years');
  });

  it('pluralizes the vector badge on the size of the list', () => {
    const badge = (total: number): string =>
      ruT.plural('atomizer.badge', total, {
        completed: 1,
        total,
      });

    expect(badge(1)).toBe('1 из 1');
    expect(badge(2)).toBe('1 из 2');
    expect(badge(8)).toBe('1 из 8');
  });

  it('exposes the resolved language', () => {
    expect(ruT.language).toBe('ru');
    expect(enT.language).toBe('en');
  });
});

describe('resolveLanguage', () => {
  it('follows the device locale', () => {
    expect(resolveLanguage('en')).toBe('en');
    expect(resolveLanguage('ru')).toBe('ru');
  });

  it('falls back to English when the phone speaks neither', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(LANGUAGES[0]).toBe('en');
    expect(resolveLanguage(null)).toBe('en');
  });
});

describe('isLanguage', () => {
  it('accepts only the shipped languages', () => {
    expect(isLanguage('ru')).toBe(true);
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('de')).toBe(false);
  });
});
