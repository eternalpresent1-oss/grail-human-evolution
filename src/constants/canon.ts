import { CANON_SLOT_XP, type HumanDimensionId, type SeedAtomId } from '@/types/grail';

/** Monday = 1 … Saturday = 6. Sunday carries no canon — method day. */
export type CanonWeekday = 1 | 2 | 3 | 4 | 5 | 6;

export interface CanonTemplate {
  readonly seedId: SeedAtomId;
  readonly dimensionId: HumanDimensionId;
  readonly weekdays: readonly CanonWeekday[];
  readonly dualDimensionId?: HumanDimensionId;
  readonly proofRequired: boolean;
  readonly xpReward: number;
}

/**
 * Three slots a week per vector, staggered so a weekday never asks more than
 * four deeds. Saturday rest closes physics and mind together.
 */
export const CANON_TEMPLATES: readonly CanonTemplate[] = [
  {
    seedId: 'physical_morning_mobility',
    dimensionId: 'physical',
    weekdays: [1, 4],
    proofRequired: false,
    xpReward: CANON_SLOT_XP,
  },
  {
    seedId: 'intellect_deep_read',
    dimensionId: 'intellect',
    weekdays: [1, 3, 5],
    proofRequired: false,
    xpReward: CANON_SLOT_XP,
  },
  {
    seedId: 'mind_journal',
    dimensionId: 'mind_psyche',
    weekdays: [2, 5],
    proofRequired: false,
    xpReward: CANON_SLOT_XP,
  },
  {
    seedId: 'drive_cold_start',
    dimensionId: 'drive',
    weekdays: [1, 3, 4],
    proofRequired: false,
    xpReward: CANON_SLOT_XP,
  },
  {
    seedId: 'craft_deep_work',
    dimensionId: 'craft_career',
    weekdays: [2, 4, 5],
    proofRequired: false,
    xpReward: CANON_SLOT_XP,
  },
  {
    seedId: 'wealth_ledger',
    dimensionId: 'wealth',
    weekdays: [2, 3, 6],
    proofRequired: false,
    xpReward: CANON_SLOT_XP,
  },
  {
    seedId: 'social_outreach',
    dimensionId: 'social',
    weekdays: [1, 2, 4],
    proofRequired: false,
    xpReward: CANON_SLOT_XP,
  },
  {
    seedId: 'spirit_gratitude',
    dimensionId: 'spirit',
    weekdays: [3, 5, 6],
    proofRequired: false,
    xpReward: CANON_SLOT_XP,
  },
  {
    seedId: 'canon_rest',
    dimensionId: 'physical',
    dualDimensionId: 'mind_psyche',
    weekdays: [6],
    proofRequired: false,
    xpReward: CANON_SLOT_XP,
  },
];

export const CANON_WEEK_SLOT_COUNT = CANON_TEMPLATES.reduce(
  (total, template) => total + template.weekdays.length,
  0,
);
