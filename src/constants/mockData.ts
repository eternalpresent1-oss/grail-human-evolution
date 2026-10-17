import {
  computeCharacterLevel,
  HUMAN_DIMENSION_IDS,
  type AtomizedTask,
  type HumanDimension,
  type HumanDimensionId,
  type SeedAtomId,
  type UserProfile,
} from '@/types/grail';
import { approximateBirthDateFromAge, computeAge } from '@/utils/birthDate';
import { dropCanonBefore, generateCanonWeek } from '@/utils/canonWeek';
import { createEmptyXpJournal, createStoppedLifeClocks } from '@/utils/lifeScore';
import { localDateKey, weekMondayOf } from '@/utils/taskTime';

/**
 * Age the baseline profile assumes until the user sets a real date of birth.
 * Stored as a date so the level keeps up with them; flagged approximate so
 * Settings asks for the exact one.
 */
const ASSUMED_AGE = 28;

interface DimensionSeed {
  score: number;
  isGated: boolean;
}

const DIMENSION_SEEDS: Record<HumanDimensionId, DimensionSeed> = {
  physical: { score: 0, isGated: false },
  intellect: { score: 0, isGated: false },
  mind_psyche: { score: 0, isGated: false },
  drive: { score: 0, isGated: false },
  craft_career: { score: 0, isGated: true },
  wealth: { score: 0, isGated: false },
  social: { score: 0, isGated: false },
  spirit: { score: 0, isGated: false },
};

function createDimension(id: HumanDimensionId): HumanDimension {
  const seed = DIMENSION_SEEDS[id];
  return {
    id,
    score: seed.score,
    isGated: seed.isGated,
  };
}

function createDimensions(): Record<HumanDimensionId, HumanDimension> {
  return HUMAN_DIMENSION_IDS.reduce(
    (dimensions, id) => {
      dimensions[id] = createDimension(id);
      return dimensions;
    },
    {} as Record<HumanDimensionId, HumanDimension>,
  );
}

/** Fresh baseline profile. A factory, so a reset never shares mutable state. */
export function createInitialProfile(): UserProfile {
  const dimensions = createDimensions();
  const birthDate = approximateBirthDateFromAge(ASSUMED_AGE);

  return {
    id: 'user-baseline',
    name: '',
    birthDate,
    isBirthDateApproximate: true,
    characterLevel: computeCharacterLevel(computeAge(birthDate), dimensions),
    disciplineScore: 50,
    currentStreak: 0,
    dimensions,
    xpJournal: createEmptyXpJournal(),
    promiseJournal: {},
    canonWeekStart: weekMondayOf(localDateKey()),
    firstOpenOn: localDateKey(),
    lifeClockStarted: createStoppedLifeClocks(),
    lastDecayDate: localDateKey(),
    careerCeiling: 50,
    careerFloor: 0,
    careerWallPinned: false,
  };
}

interface SeedAtom {
  /** Persisted task id. Stable across releases — migrations key on it. */
  readonly id: string;
  readonly seedId: SeedAtomId;
  readonly dimensionId: HumanDimensionId;
  readonly proofRequired: boolean;
  readonly timeDeadline: string;
}

/**
 * The starting roster. Titles and briefings are not here: they are authored
 * copy and live in the dictionary under `seed.<seedId>.*`.
 */
export const SEED_ATOMS: readonly SeedAtom[] = [
  {
    id: 'task-physical-morning-mobility',
    seedId: 'physical_morning_mobility',
    dimensionId: 'physical',
    proofRequired: false,
    timeDeadline: '08:00',
  },
  {
    id: 'task-intellect-deep-read',
    seedId: 'intellect_deep_read',
    dimensionId: 'intellect',
    proofRequired: false,
    timeDeadline: '12:00',
  },
  {
    id: 'task-mind-journal',
    seedId: 'mind_journal',
    dimensionId: 'mind_psyche',
    proofRequired: false,
    timeDeadline: '12:00',
  },
  {
    id: 'task-drive-cold-start',
    seedId: 'drive_cold_start',
    dimensionId: 'drive',
    proofRequired: false,
    timeDeadline: '08:00',
  },
  {
    id: 'task-craft-deep-work',
    seedId: 'craft_deep_work',
    dimensionId: 'craft_career',
    proofRequired: false,
    timeDeadline: '14:30',
  },
  {
    id: 'task-wealth-ledger',
    seedId: 'wealth_ledger',
    dimensionId: 'wealth',
    proofRequired: false,
    timeDeadline: '20:00',
  },
  {
    id: 'task-social-outreach',
    seedId: 'social_outreach',
    dimensionId: 'social',
    proofRequired: false,
    timeDeadline: '20:00',
  },
  {
    id: 'task-spirit-gratitude',
    seedId: 'spirit_gratitude',
    dimensionId: 'spirit',
    proofRequired: false,
    timeDeadline: '20:00',
  },
];

/**
 * Fresh canon of this week, starting today. Earlier weekdays keep their
 * slots in the template but do not land on the desk and are not moved
 * onto today — those days read as an empty chronicle.
 */
export function createInitialTasks(): AtomizedTask[] {
  const today = localDateKey();
  return dropCanonBefore(generateCanonWeek(weekMondayOf(today)), today);
}
