import {
  SURVEY_BASE_CAP,
  SURVEY_DEEP_CAP,
  SURVEY_QUESTION_IDS,
  SURVEY_QUESTIONS,
  surveyWeightSum,
} from '@/constants/lifeSurvey';
import { HUMAN_DIMENSION_IDS } from '@/types/grail';
import { scoreLifeSurvey, surveyProgress } from '@/utils/lifeSurvey';

describe('survey catalog', () => {
  it('keeps every question id unique and listed', () => {
    const ids = SURVEY_QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...SURVEY_QUESTION_IDS]);
  });

  it('gives every answer weights that sum to 1', () => {
    for (const question of SURVEY_QUESTIONS) {
      expect(surveyWeightSum(question.weights)).toBeCloseTo(1, 8);
    }
  });

  it('balances base-tier weight across the eight vectors within 10%', () => {
    const column = HUMAN_DIMENSION_IDS.reduce(
      (sums, id) => {
        sums[id] = 0;
        return sums;
      },
      {} as Record<(typeof HUMAN_DIMENSION_IDS)[number], number>,
    );

    for (const question of SURVEY_QUESTIONS) {
      if (question.tier !== 'base') {
        continue;
      }

      for (const id of HUMAN_DIMENSION_IDS) {
        column[id] += question.weights[id] ?? 0;
      }
    }

    const values = HUMAN_DIMENSION_IDS.map((id) => column[id] ?? 0);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

    for (const value of values) {
      expect(Math.abs(value - mean) / mean).toBeLessThanOrEqual(0.1);
    }
  });
});

describe('scoreLifeSurvey', () => {
  it('omits a vector that received no answers', () => {
    const scores = scoreLifeSurvey({ phys_sport: 'life' }, 28);

    expect(scores.physical).toBeGreaterThan(0);
    expect(scores.wealth).toBeUndefined();
  });

  it('caps a perfect base pass at 65 without deep answers', () => {
    const answers = Object.fromEntries(
      SURVEY_QUESTIONS.filter((question) => question.tier === 'base').map((question) => [
        question.id,
        question.options[question.options.length - 1]?.id ?? 'daily',
      ]),
    );

    const scores = scoreLifeSurvey(answers, 28);

    for (const id of HUMAN_DIMENSION_IDS) {
      expect(scores[id]).toBeCloseTo(SURVEY_BASE_CAP, 5);
    }
  });

  it('lets deep answers push a vector toward 100', () => {
    const answers = {
      phys_sport: 'life',
      phys_activity: 'daily',
      phys_sleep: 'daily',
      rest_recovery: 'daily',
      phys_compete: 'master',
      phys_endurance: 'five',
    } as const;

    const scores = scoreLifeSurvey(answers, 28);

    expect(scores.physical).toBeGreaterThan(SURVEY_BASE_CAP);
    expect(scores.physical).toBeLessThanOrEqual(SURVEY_BASE_CAP + SURVEY_DEEP_CAP);
  });

  it('treats the same book count as heavier at 20 than at 45', () => {
    const young = scoreLifeSurvey({ int_books: 'some' }, 20);
    const older = scoreLifeSurvey({ int_books: 'some' }, 45);

    expect(young.intellect ?? 0).toBeGreaterThan(older.intellect ?? 0);
  });

  it('does not age-adjust a habit', () => {
    const young = scoreLifeSurvey({ spirit_practice: 'daily' }, 20);
    const older = scoreLifeSurvey({ spirit_practice: 'daily' }, 45);

    expect(young.spirit).toBeCloseTo(older.spirit ?? 0, 8);
  });
});

describe('surveyProgress', () => {
  it('counts base and deep separately', () => {
    expect(surveyProgress({})).toEqual({
      baseAnswered: 0,
      baseTotal: 26,
      deepAnswered: 0,
      deepTotal: 16,
    });

    expect(surveyProgress({ phys_sport: 'some', phys_compete: 'held' }).baseAnswered).toBe(1);
    expect(surveyProgress({ phys_sport: 'some', phys_compete: 'held' }).deepAnswered).toBe(1);
  });
});
