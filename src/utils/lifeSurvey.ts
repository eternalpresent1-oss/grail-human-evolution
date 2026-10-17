import {
  adultYears,
  SURVEY_BASE_CAP,
  SURVEY_BY_ID,
  SURVEY_DEEP_CAP,
  SURVEY_QUESTION_IDS,
  SURVEY_QUESTIONS,
  type SurveyQuestion,
  type SurveyQuestionId,
  type SurveyTier,
} from '@/constants/lifeSurvey';
import {
  clampPercentScore,
  HUMAN_DIMENSION_IDS,
  type HumanDimensionId,
  type PercentScore,
} from '@/types/grail';

export type SurveyAnswers = Partial<Record<SurveyQuestionId, string>>;

export interface SurveyProgress {
  readonly baseAnswered: number;
  readonly baseTotal: number;
  readonly deepAnswered: number;
  readonly deepTotal: number;
}

export type SurveyScores = Partial<Record<HumanDimensionId, PercentScore>>;

function optionFill(question: SurveyQuestion, optionId: string, age: number): number | null {
  const option = question.options.find((candidate) => candidate.id === optionId);

  if (option === undefined) {
    return null;
  }

  if (!question.ageWeighted || option.units === undefined || question.targetPerYear === undefined) {
    return clampPercentScore(option.fill * 100) / 100;
  }

  const needed = question.targetPerYear * adultYears(age);

  if (needed <= 0) {
    return 0;
  }

  return Math.min(1, option.units / needed);
}

/**
 * Skipped questions drop out of the denominator. A dimension with no answered
 * weight is omitted — applying the survey must not zero an untouched vector.
 */
export function scoreLifeSurvey(answers: SurveyAnswers, age: number): SurveyScores {
  const baseFill: Record<HumanDimensionId, number> = emptySums();
  const baseWeight: Record<HumanDimensionId, number> = emptySums();
  const deepFill: Record<HumanDimensionId, number> = emptySums();
  const deepWeight: Record<HumanDimensionId, number> = emptySums();

  for (const question of SURVEY_QUESTIONS) {
    const optionId = answers[question.id];

    if (optionId === undefined) {
      continue;
    }

    const fill = optionFill(question, optionId, age);

    if (fill === null) {
      continue;
    }

    const fillBucket = question.tier === 'base' ? baseFill : deepFill;
    const weightBucket = question.tier === 'base' ? baseWeight : deepWeight;

    for (const id of HUMAN_DIMENSION_IDS) {
      const weight = question.weights[id];

      if (weight === undefined || weight <= 0) {
        continue;
      }

      fillBucket[id] += fill * weight;
      weightBucket[id] += weight;
    }
  }

  const scores: SurveyScores = {};

  for (const id of HUMAN_DIMENSION_IDS) {
    const base =
      baseWeight[id] > 0 ? (baseFill[id] / baseWeight[id]) * SURVEY_BASE_CAP : 0;
    const deep =
      deepWeight[id] > 0 ? (deepFill[id] / deepWeight[id]) * SURVEY_DEEP_CAP : 0;

    if (baseWeight[id] <= 0 && deepWeight[id] <= 0) {
      continue;
    }

    scores[id] = clampPercentScore(base + deep);
  }

  return scores;
}

export function isSurveyBaseComplete(progress: SurveyProgress): boolean {
  return progress.baseTotal > 0 && progress.baseAnswered === progress.baseTotal;
}

export function surveyProgress(answers: SurveyAnswers): SurveyProgress {
  let baseAnswered = 0;
  let baseTotal = 0;
  let deepAnswered = 0;
  let deepTotal = 0;

  for (const question of SURVEY_QUESTIONS) {
    const answered = answers[question.id] !== undefined;

    if (question.tier === 'base') {
      baseTotal += 1;
      if (answered) {
        baseAnswered += 1;
      }
    } else {
      deepTotal += 1;
      if (answered) {
        deepAnswered += 1;
      }
    }
  }

  return { baseAnswered, baseTotal, deepAnswered, deepTotal };
}

export function setSurveyAnswer(
  answers: SurveyAnswers,
  questionId: SurveyQuestionId,
  optionId: string | undefined,
): SurveyAnswers {
  const question = SURVEY_BY_ID[questionId];

  if (optionId === undefined) {
    const next = { ...answers };
    delete next[questionId];
    return next;
  }

  if (!question.options.some((option) => option.id === optionId)) {
    return answers;
  }

  return { ...answers, [questionId]: optionId };
}

export function isSurveyQuestionAnswered(
  answers: SurveyAnswers,
  questionId: SurveyQuestionId,
): boolean {
  return answers[questionId] !== undefined;
}

export function countTier(tier: SurveyTier): number {
  return SURVEY_QUESTIONS.filter((question) => question.tier === tier).length;
}

function emptySums(): Record<HumanDimensionId, number> {
  return HUMAN_DIMENSION_IDS.reduce(
    (sums, id) => {
      sums[id] = 0;
      return sums;
    },
    {} as Record<HumanDimensionId, number>,
  );
}

export function sanitizeSurveyAnswers(raw: unknown): SurveyAnswers {
  if (raw === null || typeof raw !== 'object') {
    return {};
  }

  const record = raw as Record<string, unknown>;
  const next: SurveyAnswers = {};

  for (const id of SURVEY_QUESTION_IDS) {
    const value = record[id];

    if (typeof value !== 'string') {
      continue;
    }

    if (SURVEY_BY_ID[id].options.some((option) => option.id === value)) {
      next[id] = value;
    }
  }

  return next;
}
