import { HUMAN_DIMENSION_IDS, type HumanDimensionId } from '@/types/grail';

export const SURVEY_BASE_CAP = 65;
export const SURVEY_DEEP_CAP = 35;
/** Years after this count as adult life for volume questions. */
export const SURVEY_ADULT_ONSET = 14;
export const SURVEY_MIN_ADULT_YEARS = 8;

export type SurveyTier = 'base' | 'deep';

export const SURVEY_QUESTION_IDS = [
  'phys_sport',
  'phys_activity',
  'phys_sleep',
  'rest_recovery',
  'int_books',
  'int_study',
  'int_docs',
  'mind_journal',
  'mind_stress',
  'mind_still',
  'drive_promises',
  'drive_routine',
  'drive_start',
  'craft_years',
  'craft_depth',
  'craft_create',
  'wealth_account',
  'wealth_impulse',
  'wealth_build',
  'social_family',
  'social_friends',
  'social_live',
  'spirit_practice',
  'spirit_books',
  'spirit_temple',
  'leisure_quality',
  'phys_compete',
  'phys_endurance',
  'int_teach',
  'int_degree',
  'mind_therapy',
  'mind_daily_sit',
  'drive_crisis',
  'drive_lead',
  'craft_business',
  'craft_mentor',
  'wealth_employees',
  'wealth_compound',
  'social_community',
  'social_repair',
  'spirit_lineage',
  'spirit_vow',
] as const;

export type SurveyQuestionId = (typeof SURVEY_QUESTION_IDS)[number];

export type SurveySectionId = HumanDimensionId | 'rest';

export interface SurveyOption {
  readonly id: string;
  /** 0–1 fill for habit questions. Ignored when `units` is set. */
  readonly fill: number;
  /** Absolute amount for age-weighted volume questions. */
  readonly units?: number;
}

export type SurveyWeights = Partial<Record<HumanDimensionId, number>>;

export interface SurveyQuestion {
  readonly id: SurveyQuestionId;
  readonly tier: SurveyTier;
  readonly section: SurveySectionId;
  readonly ageWeighted: boolean;
  /** Units per adult-year that fill the question to 1. */
  readonly targetPerYear?: number;
  readonly weights: SurveyWeights;
  readonly options: readonly SurveyOption[];
}

const HABIT = [
  { id: 'none', fill: 0 },
  { id: 'rare', fill: 0.25 },
  { id: 'some', fill: 0.5 },
  { id: 'often', fill: 0.75 },
  { id: 'daily', fill: 1 },
] as const;

const BOOKS = [
  { id: 'none', fill: 0, units: 5 },
  { id: 'little', fill: 0.25, units: 15 },
  { id: 'some', fill: 0.5, units: 40 },
  { id: 'much', fill: 0.75, units: 70 },
  { id: 'life', fill: 1, units: 150 },
] as const;

const YEARS = [
  { id: 'none', fill: 0, units: 0 },
  { id: 'little', fill: 0.25, units: 1 },
  { id: 'some', fill: 0.5, units: 4 },
  { id: 'much', fill: 0.75, units: 10 },
  { id: 'life', fill: 1, units: 20 },
] as const;

const DEPTH = [
  { id: 'none', fill: 0 },
  { id: 'tried', fill: 0.3 },
  { id: 'held', fill: 0.6 },
  { id: 'taught', fill: 0.85 },
  { id: 'master', fill: 1 },
] as const;

const SCALE5 = [
  { id: 'one', fill: 0.2 },
  { id: 'two', fill: 0.4 },
  { id: 'three', fill: 0.6 },
  { id: 'four', fill: 0.8 },
  { id: 'five', fill: 1 },
] as const;

const DEGREE = [
  { id: 'none', fill: 0 },
  { id: 'bachelor', fill: 0.25 },
  { id: 'magister', fill: 0.5 },
  { id: 'candidate', fill: 0.75 },
  { id: 'doctor', fill: 1 },
] as const;

const VOW = [
  { id: 'short', fill: 0 },
  { id: 'skipped', fill: 0.25 },
  { id: 'broke', fill: 0.5 },
  { id: 'kept', fill: 0.75 },
  { id: 'inspired', fill: 1 },
] as const;

export const SURVEY_QUESTIONS: readonly SurveyQuestion[] = [
  {
    id: 'phys_sport',
    tier: 'base',
    section: 'physical',
    ageWeighted: true,
    targetPerYear: 0.35,
    weights: { physical: 0.7, drive: 0.3 },
    options: YEARS,
  },
  {
    id: 'phys_activity',
    tier: 'base',
    section: 'physical',
    ageWeighted: false,
    weights: { physical: 0.75, wealth: 0.25 },
    options: HABIT,
  },
  {
    id: 'phys_sleep',
    tier: 'base',
    section: 'physical',
    ageWeighted: false,
    weights: { physical: 0.75, mind_psyche: 0.25 },
    options: HABIT,
  },
  {
    id: 'rest_recovery',
    tier: 'base',
    section: 'rest',
    ageWeighted: false,
    weights: { physical: 0.7, mind_psyche: 0.3 },
    options: HABIT,
  },
  {
    id: 'int_books',
    tier: 'base',
    section: 'intellect',
    ageWeighted: true,
    targetPerYear: 5,
    weights: { intellect: 0.8, mind_psyche: 0.1, spirit: 0.1 },
    options: BOOKS,
  },
  {
    id: 'int_study',
    tier: 'base',
    section: 'intellect',
    ageWeighted: false,
    weights: { intellect: 0.55, craft_career: 0.25, wealth: 0.2 },
    options: HABIT,
  },
  {
    id: 'int_docs',
    tier: 'base',
    section: 'intellect',
    ageWeighted: false,
    weights: { intellect: 0.85, mind_psyche: 0.15 },
    options: HABIT,
  },
  {
    id: 'mind_journal',
    tier: 'base',
    section: 'mind_psyche',
    ageWeighted: false,
    weights: { mind_psyche: 0.55, intellect: 0.45 },
    options: HABIT,
  },
  {
    id: 'mind_stress',
    tier: 'base',
    section: 'mind_psyche',
    ageWeighted: false,
    weights: { mind_psyche: 0.5, drive: 0.5 },
    options: HABIT,
  },
  {
    id: 'mind_still',
    tier: 'base',
    section: 'mind_psyche',
    ageWeighted: false,
    weights: { mind_psyche: 0.45, craft_career: 0.15, spirit: 0.4 },
    options: HABIT,
  },
  {
    id: 'drive_promises',
    tier: 'base',
    section: 'drive',
    ageWeighted: false,
    weights: { drive: 0.7, social: 0.3 },
    options: HABIT,
  },
  {
    id: 'drive_routine',
    tier: 'base',
    section: 'drive',
    ageWeighted: false,
    weights: { drive: 0.6, physical: 0.2, mind_psyche: 0.2 },
    options: HABIT,
  },
  {
    id: 'drive_start',
    tier: 'base',
    section: 'drive',
    ageWeighted: false,
    weights: { drive: 0.5, craft_career: 0.5 },
    options: HABIT,
  },
  {
    id: 'craft_years',
    tier: 'base',
    section: 'craft_career',
    ageWeighted: true,
    targetPerYear: 0.4,
    weights: { craft_career: 0.85, intellect: 0.15 },
    options: YEARS,
  },
  {
    id: 'craft_depth',
    tier: 'base',
    section: 'craft_career',
    ageWeighted: false,
    weights: { craft_career: 0.6, drive: 0.4 },
    options: DEPTH,
  },
  {
    id: 'craft_create',
    tier: 'base',
    section: 'craft_career',
    ageWeighted: false,
    weights: { craft_career: 0.7, wealth: 0.3 },
    options: HABIT,
  },
  {
    id: 'wealth_account',
    tier: 'base',
    section: 'wealth',
    ageWeighted: false,
    weights: { wealth: 0.9, drive: 0.1 },
    options: HABIT,
  },
  {
    id: 'wealth_impulse',
    tier: 'base',
    section: 'wealth',
    ageWeighted: false,
    weights: { wealth: 0.65, mind_psyche: 0.35 },
    options: HABIT,
  },
  {
    id: 'wealth_build',
    tier: 'base',
    section: 'wealth',
    ageWeighted: false,
    weights: { wealth: 0.75, craft_career: 0.25 },
    options: DEPTH,
  },
  {
    id: 'social_family',
    tier: 'base',
    section: 'social',
    ageWeighted: false,
    weights: { social: 0.5, spirit: 0.3, drive: 0.2 },
    options: HABIT,
  },
  {
    id: 'social_friends',
    tier: 'base',
    section: 'social',
    ageWeighted: false,
    weights: { social: 1 },
    options: HABIT,
  },
  {
    id: 'social_live',
    tier: 'base',
    section: 'social',
    ageWeighted: false,
    weights: { social: 0.85, mind_psyche: 0.15 },
    options: HABIT,
  },
  {
    id: 'spirit_practice',
    tier: 'base',
    section: 'spirit',
    ageWeighted: false,
    weights: { spirit: 0.85, physical: 0.15 },
    options: HABIT,
  },
  {
    id: 'spirit_books',
    tier: 'base',
    section: 'spirit',
    ageWeighted: false,
    weights: { spirit: 0.55, intellect: 0.45 },
    options: HABIT,
  },
  {
    id: 'spirit_temple',
    tier: 'base',
    section: 'spirit',
    ageWeighted: false,
    weights: { spirit: 0.4, social: 0.4, wealth: 0.2 },
    options: HABIT,
  },
  {
    id: 'leisure_quality',
    tier: 'base',
    section: 'rest',
    ageWeighted: false,
    weights: { mind_psyche: 0.25, spirit: 0.65, social: 0.1 },
    options: HABIT,
  },
  {
    id: 'phys_compete',
    tier: 'deep',
    section: 'physical',
    ageWeighted: false,
    weights: { physical: 0.7, drive: 0.3 },
    options: DEPTH,
  },
  {
    id: 'phys_endurance',
    tier: 'deep',
    section: 'physical',
    ageWeighted: false,
    weights: { physical: 0.8, drive: 0.2 },
    options: SCALE5,
  },
  {
    id: 'int_teach',
    tier: 'deep',
    section: 'intellect',
    ageWeighted: false,
    weights: { intellect: 0.6, social: 0.4 },
    options: DEPTH,
  },
  {
    id: 'int_degree',
    tier: 'deep',
    section: 'intellect',
    ageWeighted: false,
    weights: { intellect: 0.8, craft_career: 0.2 },
    options: DEGREE,
  },
  {
    id: 'mind_therapy',
    tier: 'deep',
    section: 'mind_psyche',
    ageWeighted: false,
    weights: { mind_psyche: 0.7, spirit: 0.3 },
    options: DEPTH,
  },
  {
    id: 'mind_daily_sit',
    tier: 'deep',
    section: 'mind_psyche',
    ageWeighted: false,
    weights: { mind_psyche: 0.6, spirit: 0.4 },
    options: HABIT,
  },
  {
    id: 'drive_crisis',
    tier: 'deep',
    section: 'drive',
    ageWeighted: false,
    weights: { drive: 0.7, mind_psyche: 0.3 },
    options: DEPTH,
  },
  {
    id: 'drive_lead',
    tier: 'deep',
    section: 'drive',
    ageWeighted: false,
    weights: { drive: 0.6, social: 0.4 },
    options: DEPTH,
  },
  {
    id: 'craft_business',
    tier: 'deep',
    section: 'craft_career',
    ageWeighted: false,
    weights: { craft_career: 0.5, wealth: 0.3, drive: 0.2 },
    options: DEPTH,
  },
  {
    id: 'craft_mentor',
    tier: 'deep',
    section: 'craft_career',
    ageWeighted: false,
    weights: { craft_career: 0.6, social: 0.4 },
    options: DEPTH,
  },
  {
    id: 'wealth_employees',
    tier: 'deep',
    section: 'wealth',
    ageWeighted: false,
    weights: { wealth: 0.5, craft_career: 0.3, social: 0.2 },
    options: DEPTH,
  },
  {
    id: 'wealth_compound',
    tier: 'deep',
    section: 'wealth',
    ageWeighted: true,
    targetPerYear: 0.25,
    weights: { wealth: 0.8, drive: 0.2 },
    options: YEARS,
  },
  {
    id: 'social_community',
    tier: 'deep',
    section: 'social',
    ageWeighted: false,
    weights: { social: 0.7, spirit: 0.3 },
    options: DEPTH,
  },
  {
    id: 'social_repair',
    tier: 'deep',
    section: 'social',
    ageWeighted: false,
    weights: { social: 0.6, spirit: 0.4 },
    options: DEPTH,
  },
  {
    id: 'spirit_lineage',
    tier: 'deep',
    section: 'spirit',
    ageWeighted: false,
    weights: { spirit: 0.8, intellect: 0.2 },
    options: DEPTH,
  },
  {
    id: 'spirit_vow',
    tier: 'deep',
    section: 'spirit',
    ageWeighted: false,
    weights: { spirit: 0.7, drive: 0.3 },
    options: VOW,
  },
];

export const SURVEY_BY_ID: Record<SurveyQuestionId, SurveyQuestion> = SURVEY_QUESTIONS.reduce(
  (map, question) => {
    map[question.id] = question;
    return map;
  },
  {} as Record<SurveyQuestionId, SurveyQuestion>,
);

export const SURVEY_SECTION_ORDER: readonly SurveySectionId[] = [
  'physical',
  'intellect',
  'mind_psyche',
  'drive',
  'craft_career',
  'wealth',
  'social',
  'spirit',
  'rest',
];

export function isSurveyQuestionId(value: string): value is SurveyQuestionId {
  return SURVEY_QUESTION_IDS.some((id) => id === value);
}

export function adultYears(age: number): number {
  return Math.max(SURVEY_MIN_ADULT_YEARS, age - SURVEY_ADULT_ONSET);
}

export function surveyQuestionsInSection(
  section: SurveySectionId,
  tier?: SurveyTier,
): readonly SurveyQuestion[] {
  return SURVEY_QUESTIONS.filter(
    (question) => question.section === section && (tier === undefined || question.tier === tier),
  );
}

export function surveyWeightSum(weights: SurveyWeights): number {
  return HUMAN_DIMENSION_IDS.reduce((sum, id) => sum + (weights[id] ?? 0), 0);
}
