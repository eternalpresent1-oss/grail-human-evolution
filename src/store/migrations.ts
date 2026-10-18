import { createInitialProfile, createInitialTasks, SEED_ATOMS } from '@/constants/mockData';
import { isLanguage, seedAtomTitleKey, type LanguagePreference } from '@/i18n';
import { ru } from '@/i18n/ru';
import {
  clampPercentScore,
  HUMAN_DIMENSION_IDS,
  type AtomContent,
  type AtomizedTask,
  type AtomRitualState,
  type HumanDimension,
  type HumanDimensionId,
  type OctagonViewMode,
  type SeedAtomId,
  type ShadowEvent,
  type UserProfile,
} from '@/types/grail';
import { generateCanonWeek } from '@/utils/canonWeek';
import { anchorFirstOpen } from '@/utils/firstOpen';
import { approximateBirthDateFromAge, isPlausibleBirthDate, parseBirthDate } from '@/utils/birthDate';
import {
  coupleCraftWealthDimensions,
  createEmptyXpJournal,
  createStoppedLifeClocks,
  journalHasXp,
} from '@/utils/lifeScore';
import { sanitizeSurveyAnswers, scoreLifeSurvey, type SurveyAnswers } from '@/utils/lifeSurvey';
import { profileAge, withDerivedScores } from '@/utils/profile';
import { ceilingAboveScore, resolveCareerCeiling, resolveCareerFloor } from '@/utils/careerGate';
import { sanitizeCampaigns } from '@/utils/campaign';
import { sanitizeDriveLine } from '@/utils/driveLine';
import { sanitizeMethodSignals } from '@/utils/methodSignals';
import { localDateKey, weekMondayOf } from '@/utils/taskTime';
import { type Campaign } from '@/types/campaign';
import { defaultMethodSignals, type MethodSignals } from '@/types/methodSignals';
import { type TalentNode } from '@/types/talent';
import { type CounselMessage } from '@/types/counsel';
import { type Achievement } from '@/types/achievement';
import { type DisciplineStepId } from '@/types/discipline';
import { sanitizeTalents } from '@/utils/talent';
import { sanitizeAchievements } from '@/utils/achievements';
import { sanitizeDisciplineCompleted } from '@/utils/disciplineTree';
import {
  sanitizeApiKey,
  sanitizeCounselThread,
  sanitizeLifeVectorReading,
  sanitizeProofUri,
} from '@/utils/grailSnapshot';
import { type WeekFieldMarks } from '@/utils/methodWeek';

/**
 * 1 — XP pools replaced directly mutated scores.
 * 2 — nothing translatable is persisted any more: dimension labels are gone,
 *     atom text is either a seed id or the user's own words, and the frozen
 *     `age` number became a date of birth.
 * 3 — life score is a slow weekly-norm average; the journal replaces XP pools
 *     and the life/daily ceiling maps.
 * 4 — life clocks are per-vector: a dimension ages only after its first absorb.
 * 5 — life survey answers live beside the profile and survive a progress wipe.
 * 6 — weekly canon roster, shadow events, promise journal for discipline.
 * 7 — identity: profession timeline, creed, motive engines. Spirit canon branches.
 * 8 — identity dropped; one free-text line: what drives the essence.
 * 9 — one active goal. Horizon is the user's; vectors and
 *     methods are a draft until taken.
 * 10 — method signals (morning / evening / Sunday) and one school plus one book.
 * 11 — school and book dropped. Method clocks stay.
 * 12 — dated method signals, talent tree, proof background, counsel thread.
 * 13 — achievements ledger.
 * 14 — repeating career ceiling after each confirmed breakthrough.
 * 15 — decay back to 50% pins the career wall again.
 * 16 — every career wall writes +1% and pins again if the score returns.
 * 17 — Tree of Discipline on the goal; language follows the system only.
 * 18 — button sounds, ambient flute, and a one-shot pulse on the tree icon after a goal is created.
 * 19 — lotus breath practice; a five-minute sit can lift spirit and the body once a day.
 * 20 — canon no longer asks for proof.
 * 21 — the chronicle starts on the first launch: no canon, and no earlier week, before that day.
 * 22 — a finished survey keeps its Craft score, and the career wall is the next step above it.
 * 23 — Sunday Method of the week stores Was/Became field marks (Sun–Sat weeks).
 */
export const STORAGE_VERSION = 23;

export interface PersistedGrailState {
  profile: UserProfile;
  tasks: readonly AtomizedTask[];
  viewMode: OctagonViewMode;
  language: LanguagePreference;
  surveyAnswers: SurveyAnswers;
  surveyApplied: boolean;
  shadowEvents: readonly ShadowEvent[];
  driveLine: string;
  campaigns: readonly Campaign[];
  methodSignals: MethodSignals;
  talents: readonly TalentNode[];
  proofBackgroundUri: string;
  aiApiKey: string;
  counselThread: readonly CounselMessage[];
  lifeVectorReading: string;
  achievements: readonly Achievement[];
  disciplineCompleted: readonly DisciplineStepId[];
  soundEnabled: boolean;
  musicEnabled: boolean;
  disciplineBeacon: boolean;
  breathAwardedOn: string;
  /** Sunday-keyed end-of-week field snapshots for Method of the week. */
  weekFieldMarks: WeekFieldMarks;
}

type PreV12State = Omit<
  PersistedGrailState,
  | 'talents'
  | 'proofBackgroundUri'
  | 'aiApiKey'
  | 'counselThread'
  | 'lifeVectorReading'
  | 'achievements'
  | 'disciplineCompleted'
  | 'soundEnabled'
  | 'musicEnabled'
  | 'disciplineBeacon'
  | 'breathAwardedOn'
  | 'weekFieldMarks'
>;

export function createBaselineState(): PersistedGrailState {
  return {
    profile: createInitialProfile(),
    tasks: createInitialTasks(),
    viewMode: 'daily',
    // Language always follows the phone after v17.
    language: 'system',
    surveyAnswers: {},
    surveyApplied: false,
    shadowEvents: [],
    driveLine: '',
    campaigns: [],
    methodSignals: defaultMethodSignals(),
    talents: [],
    proofBackgroundUri: '',
    aiApiKey: '',
    counselThread: [],
    lifeVectorReading: '',
    achievements: [],
    disciplineCompleted: [],
    soundEnabled: true,
    musicEnabled: true,
    disciplineBeacon: false,
    breathAwardedOn: '',
    weekFieldMarks: {},
  };
}

/** The briefing a pre-v2 build generated and saved when the user gave none. */
function legacyDefaultInstruction(title: string): string {
  return `Выполни атом «${title}» полностью. Без замены, без переноса, без театра.`;
}

const SEED_ID_BY_TASK_ID = new Map<string, SeedAtomId>(
  SEED_ATOMS.map((seed) => [seed.id, seed.seedId]),
);

/**
 * Second way in: a snapshot written before the atom ids settled still carries
 * the Russian seed titles verbatim, and those are authored copy we own. Keyed
 * with the vector too, so a user atom that happens to share a title is left
 * alone as the user's own words.
 */
const SEED_ID_BY_TITLE = new Map<string, SeedAtomId>(
  SEED_ATOMS.map((seed) => [`${seed.dimensionId}:${ru[seedAtomTitleKey(seed.seedId)]}`, seed.seedId]),
);

interface LegacyDimension {
  readonly baseScore?: number;
  readonly xp?: number;
  readonly score?: number;
  readonly isGated?: boolean;
  readonly decayRate?: number;
}

interface LegacyProfile {
  readonly id?: string;
  readonly name?: string;
  readonly age?: number;
  readonly birthDate?: string;
  readonly isBirthDateApproximate?: boolean;
  readonly disciplineScore?: number;
  readonly currentStreak?: number;
  readonly dimensions?: Partial<Record<HumanDimensionId, LegacyDimension>>;
  readonly lastDecayDate?: string;
  readonly xpJournal?: UserProfile['xpJournal'];
  readonly lifeClockStarted?: boolean | Record<HumanDimensionId, boolean>;
}

interface LegacyTask {
  readonly id?: string;
  readonly title?: string;
  readonly instruction?: string;
  readonly content?: AtomContent;
  readonly dimensionId?: HumanDimensionId;
  readonly ritualState?: AtomRitualState;
  readonly isCompleted?: boolean;
  readonly isNonNegotiable?: boolean;
  readonly proofRequired?: boolean;
  readonly xpReward?: number;
  readonly timeDeadline?: string;
  readonly isOverdue?: boolean;
}

interface LegacyState {
  readonly profile?: LegacyProfile;
  readonly tasks?: readonly LegacyTask[];
  readonly viewMode?: OctagonViewMode;
  readonly language?: string;
}

/**
 * Rebuilds a persisted snapshot field by field rather than spreading it, so
 * dropped keys — `label`, `age`, `baseScore`, `xp`, the ceiling maps, the
 * pre-translated atom text — cannot survive an upgrade, and junk in storage
 * cannot leak into a typed state.
 */
export function migratePersistedState(persisted: unknown, version: number): PersistedGrailState {
  if (version >= STORAGE_VERSION) {
    return persisted as PersistedGrailState;
  }

  const upgraded =
    version >= 21
      ? (persisted as PersistedGrailState)
      : anchorFirstOpen(
          clearCanonProof(withAtmosphere(upgradePersistedState(persisted, version))),
          localDateKey(),
        );

  return withWeekFieldMarks(liftSurveyCareer(upgraded));
}

function withWeekFieldMarks(state: PersistedGrailState): PersistedGrailState {
  if (state.weekFieldMarks !== undefined && typeof state.weekFieldMarks === 'object') {
    return state;
  }

  return { ...state, weekFieldMarks: {} };
}

function liftSurveyCareer(state: PersistedGrailState): PersistedGrailState {
  if (!state.surveyApplied || state.profile.careerFloor > 0 || state.profile.careerWallPinned) {
    return state;
  }

  const scores = scoreLifeSurvey(state.surveyAnswers, profileAge(state.profile));
  const scored = HUMAN_DIMENSION_IDS.reduce(
    (next, id) => {
      const current = state.profile.dimensions[id];
      const value = scores[id];
      next[id] = value === undefined || current === undefined ? current : { ...current, score: value };
      return next;
    },
    {} as Record<HumanDimensionId, HumanDimension>,
  );
  const craftScore = coupleCraftWealthDimensions(scored).craft_career.score;
  const stored = state.profile.dimensions.craft_career.score;
  if (craftScore <= stored) {
    return state;
  }

  const careerCeiling = Math.max(state.profile.careerCeiling, ceilingAboveScore(craftScore));
  const derived = withDerivedScores({
    ...state.profile,
    careerCeiling,
    careerFloor: 0,
    careerWallPinned: false,
    dimensions: {
      ...state.profile.dimensions,
      craft_career: { ...state.profile.dimensions.craft_career, score: craftScore },
    },
  });

  return {
    ...state,
    profile: {
      ...derived,
      careerCeiling,
      careerFloor: 0,
      careerWallPinned: false,
      dimensions: {
        ...derived.dimensions,
        craft_career: { ...derived.dimensions.craft_career, score: craftScore },
      },
    },
  };
}

function withAtmosphere(state: PersistedGrailState): PersistedGrailState {
  return {
    ...state,
    soundEnabled: state.soundEnabled !== false,
    musicEnabled: state.musicEnabled !== false,
    disciplineBeacon: state.disciplineBeacon === true,
    breathAwardedOn: typeof state.breathAwardedOn === 'string' ? state.breathAwardedOn : '',
  };
}

function clearCanonProof(state: PersistedGrailState): PersistedGrailState {
  if (!state.tasks.some((task) => task.kind === 'canon' && task.proofRequired)) {
    return state;
  }

  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.kind === 'canon' ? { ...task, proofRequired: false } : task,
    ),
  };
}

function upgradePersistedState(persisted: unknown, version: number): PersistedGrailState {
  if (version === 20 || version === 19 || version === 18 || version === 17) {
    return persisted as PersistedGrailState;
  }

  if (version === 16) {
    return migrateV16ToV17(persisted);
  }

  if (version === 15) {
    return migrateV15ToV16(persisted);
  }

  if (version === 14) {
    return migrateV14ToV15(persisted);
  }

  if (version === 13) {
    return migrateV13ToV14(persisted);
  }

  if (version === 12) {
    return migrateV12ToV13(persisted);
  }

  if (version === 11) {
    return migrateV11ToV12(persisted);
  }

  if (version === 10) {
    return migrateV10ToV11(persisted);
  }

  if (version === 9) {
    return migrateV10ToV11(migrateV9ToV10(persisted));
  }

  if (version === 8) {
    return migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(persisted)));
  }

  if (version === 7) {
    return migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(persisted))));
  }

  if (version === 6) {
    return migrateV10ToV11(
      migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(persisted)))),
    );
  }

  if (version === 5) {
    return migrateV10ToV11(
      migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(persisted))))),
    );
  }

  if (version === 4) {
    return migrateV10ToV11(
      migrateV9ToV10(
        migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(persisted))))),
      ),
    );
  }

  if (version === 3) {
    return migrateV10ToV11(
      migrateV9ToV10(
        migrateV8ToV9(
          migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(persisted))))),
        ),
      ),
    );
  }

  return migrateV10ToV11(
    migrateV9ToV10(
      migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(migrateLegacyToV5(persisted))))),
    ),
  );
}

function migrateLegacyToV5(persisted: unknown): Omit<
  PersistedGrailState,
  | 'shadowEvents'
  | 'soundEnabled'
  | 'musicEnabled'
  | 'disciplineBeacon'
  | 'breathAwardedOn'
  | 'weekFieldMarks'
> & {
  shadowEvents?: readonly ShadowEvent[];
} {
  const legacy = persisted as LegacyState | null;
  const legacyProfile = legacy?.profile;

  if (legacyProfile === undefined) {
    return createBaselineState();
  }

  const baseline = createInitialProfile();
  const birth = migrateBirthDate(legacyProfile, baseline);
  const weekStart = weekMondayOf(localDateKey());

  const profile = withDerivedScores({
    id: legacyProfile.id ?? baseline.id,
    name: typeof legacyProfile.name === 'string' ? legacyProfile.name : baseline.name,
    birthDate: birth.birthDate,
    isBirthDateApproximate: birth.isBirthDateApproximate,
    characterLevel: baseline.characterLevel,
    disciplineScore: clampPercentScore(legacyProfile.disciplineScore ?? baseline.disciplineScore),
    currentStreak: legacyProfile.currentStreak ?? baseline.currentStreak,
    dimensions: migrateDimensions(legacyProfile, baseline),
    xpJournal: createEmptyXpJournal(),
    promiseJournal: {},
    canonWeekStart: weekStart,
    lifeClockStarted: createStoppedLifeClocks(),
    lastDecayDate: legacyProfile.lastDecayDate ?? baseline.lastDecayDate,
    careerCeiling: baseline.careerCeiling,
    careerFloor: 0,
    careerWallPinned: false,
  } satisfies UserProfile);

  const tasks = legacy?.tasks?.flatMap(migrateTask);

  return {
    profile,
    tasks: tasks === undefined || tasks.length === 0 ? createInitialTasks() : tasks,
    viewMode: legacy?.viewMode ?? 'daily',
    // Everyone who already has a snapshot has been reading Russian: following
    // the phone locale here would silently flip their app to English.
    language: legacy?.language !== undefined && isLanguage(legacy.language) ? legacy.language : 'ru',
    surveyAnswers: {},
    surveyApplied: false,
    shadowEvents: [],
    driveLine: '',
    campaigns: [],
    methodSignals: defaultMethodSignals(),
    talents: [],
    proofBackgroundUri: '',
    aiApiKey: '',
    counselThread: [],
    lifeVectorReading: '',
    achievements: [],
    disciplineCompleted: [],
  };
}

/**
 * v3 stored a single boolean. Preserve the journal and scores; start only the
 * vectors that already have journalled XP so untouched axes stay frozen.
 */
function migrateV3ToV4(persisted: unknown): PreV12State {
  const legacy = persisted as Partial<PersistedGrailState> | null;
  const profile = legacy?.profile;

  if (profile === undefined) {
    return createBaselineState();
  }

  const journal = profile.xpJournal ?? createEmptyXpJournal();
  const previous = (profile as LegacyProfile).lifeClockStarted;
  const clocks = createStoppedLifeClocks();

  if (previous === true) {
    for (const id of HUMAN_DIMENSION_IDS) {
      clocks[id] = journalHasXp(journal, id);
    }
  } else if (typeof previous === 'object' && previous !== null) {
    for (const id of HUMAN_DIMENSION_IDS) {
      clocks[id] = previous[id] === true;
    }
  }

  return {
    profile: withDerivedScores({
      ...profile,
      xpJournal: journal,
      lifeClockStarted: clocks,
    }),
    tasks: legacy?.tasks ?? createInitialTasks(),
    viewMode: legacy?.viewMode ?? 'daily',
    language:
      legacy?.language !== undefined && isLanguage(legacy.language) ? legacy.language : 'ru',
    surveyAnswers: {},
    surveyApplied: false,
    shadowEvents: [],
    driveLine: '',
    campaigns: [],
    methodSignals: defaultMethodSignals(),
  };
}

function migrateV4ToV5(persisted: unknown): PreV12State {
  const legacy = persisted as Partial<PersistedGrailState> | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return {
    profile: legacy.profile,
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language:
      legacy.language !== undefined && isLanguage(legacy.language) ? legacy.language : 'ru',
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: [],
    driveLine: '',
    campaigns: [],
    methodSignals: defaultMethodSignals(),
  };
}

function migrateV5ToV6(persisted: unknown): PreV12State {
  const legacy = persisted as Partial<PersistedGrailState> | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  const weekStart = weekMondayOf(localDateKey());
  const baseline = createInitialProfile();
  const previous = legacy.profile;
  const customs = (legacy.tasks ?? []).flatMap((task) => {
    if (!isPreservedCustom(task)) {
      return [];
    }

    return [{ ...task, kind: 'custom' as const }];
  });

  return {
    profile: withDerivedScores({
      id: previous.id ?? baseline.id,
      name: previous.name,
      birthDate: previous.birthDate,
      isBirthDateApproximate: previous.isBirthDateApproximate,
      characterLevel: previous.characterLevel,
      disciplineScore: previous.disciplineScore,
      currentStreak: previous.currentStreak,
      dimensions: previous.dimensions,
      xpJournal: previous.xpJournal ?? createEmptyXpJournal(),
      promiseJournal: {},
      canonWeekStart: weekStart,
      lifeClockStarted: previous.lifeClockStarted ?? createStoppedLifeClocks(),
      lastDecayDate: previous.lastDecayDate ?? baseline.lastDecayDate,
      careerCeiling: resolveCareerCeiling(previous),
    }),
    tasks: [...generateCanonWeek(weekStart), ...customs],
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(legacy.language, 'ru'),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: '',
    campaigns: [],
    methodSignals: defaultMethodSignals(),
  };
}

function migrateV6ToV7(persisted: unknown): PreV12State {
  const legacy = persisted as Partial<PersistedGrailState> | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return {
    profile: legacy.profile,
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(legacy.language, 'ru'),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: '',
    campaigns: [],
    methodSignals: defaultMethodSignals(),
  };
}

function migrateV7ToV8(persisted: unknown): PreV12State {
  const legacy = persisted as Partial<PersistedGrailState> | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return {
    profile: legacy.profile,
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(legacy.language, 'ru'),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: [],
    methodSignals: defaultMethodSignals(),
  };
}

function migrateV8ToV9(persisted: unknown): PreV12State {
  const legacy = persisted as Partial<PersistedGrailState> | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return {
    profile: legacy.profile,
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(legacy.language, 'ru'),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: sanitizeCampaigns(legacy.campaigns),
    methodSignals: defaultMethodSignals(),
  };
}

function migrateV9ToV10(persisted: unknown): PreV12State {
  const legacy = persisted as Partial<PersistedGrailState> | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return {
    profile: legacy.profile,
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(legacy.language, 'ru'),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: sanitizeCampaigns(legacy.campaigns),
    methodSignals: sanitizeMethodSignals(legacy.methodSignals),
  };
}

function migrateV10ToV11(persisted: unknown): PersistedGrailState {
  const legacy = persisted as Partial<PersistedGrailState> | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return migrateV11ToV12({
    profile: legacy.profile,
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(legacy.language, 'ru'),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: sanitizeCampaigns(legacy.campaigns),
    methodSignals: sanitizeMethodSignals(legacy.methodSignals),
  });
}

function migrateV11ToV12(persisted: unknown): PersistedGrailState {
  const legacy = persisted as (Partial<PersistedGrailState> & Record<string, unknown>) | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return migrateV12ToV13({
    profile: legacy.profile,
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(
      typeof legacy.language === 'string' ? legacy.language : undefined,
      'ru',
    ),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: sanitizeCampaigns(legacy.campaigns),
    methodSignals: sanitizeMethodSignals(legacy.methodSignals),
    talents: sanitizeTalents(legacy.talents),
    proofBackgroundUri: sanitizeProofUri(legacy.proofBackgroundUri) ?? '',
    aiApiKey: sanitizeApiKey(legacy.aiApiKey),
    counselThread: sanitizeCounselThread(legacy.counselThread),
    lifeVectorReading: sanitizeLifeVectorReading(legacy.lifeVectorReading),
  });
}

function migrateV12ToV13(persisted: unknown): PersistedGrailState {
  const legacy = persisted as (Partial<PersistedGrailState> & Record<string, unknown>) | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return migrateV13ToV14({
    profile: legacy.profile,
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(
      typeof legacy.language === 'string' ? legacy.language : undefined,
      'ru',
    ),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: sanitizeCampaigns(legacy.campaigns),
    methodSignals: sanitizeMethodSignals(legacy.methodSignals),
    talents: sanitizeTalents(legacy.talents),
    proofBackgroundUri: sanitizeProofUri(legacy.proofBackgroundUri) ?? '',
    aiApiKey: sanitizeApiKey(legacy.aiApiKey),
    counselThread: sanitizeCounselThread(legacy.counselThread),
    lifeVectorReading: sanitizeLifeVectorReading(legacy.lifeVectorReading),
    achievements: sanitizeAchievements(legacy.achievements),
  });
}

function migrateV13ToV14(persisted: unknown): PersistedGrailState {
  const legacy = persisted as (Partial<PersistedGrailState> & Record<string, unknown>) | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return migrateV14ToV15({
    profile: withDerivedScores({
      ...legacy.profile,
      careerCeiling: resolveCareerCeiling(legacy.profile),
    }),
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(
      typeof legacy.language === 'string' ? legacy.language : undefined,
      'ru',
    ),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: sanitizeCampaigns(legacy.campaigns),
    methodSignals: sanitizeMethodSignals(legacy.methodSignals),
    talents: sanitizeTalents(legacy.talents),
    proofBackgroundUri: sanitizeProofUri(legacy.proofBackgroundUri) ?? '',
    aiApiKey: sanitizeApiKey(legacy.aiApiKey),
    counselThread: sanitizeCounselThread(legacy.counselThread),
    lifeVectorReading: sanitizeLifeVectorReading(legacy.lifeVectorReading),
    achievements: sanitizeAchievements(legacy.achievements),
  });
}

function migrateV14ToV15(persisted: unknown): PersistedGrailState {
  const legacy = persisted as (Partial<PersistedGrailState> & Record<string, unknown>) | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  const profile = legacy.profile;

  return migrateV15ToV16({
    profile: withDerivedScores({
      ...profile,
      careerCeiling: resolveCareerCeiling(profile),
      careerWallPinned: profile.careerWallPinned === true,
    }),
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(
      typeof legacy.language === 'string' ? legacy.language : undefined,
      'ru',
    ),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: sanitizeCampaigns(legacy.campaigns),
    methodSignals: sanitizeMethodSignals(legacy.methodSignals),
    talents: sanitizeTalents(legacy.talents),
    proofBackgroundUri: sanitizeProofUri(legacy.proofBackgroundUri) ?? '',
    aiApiKey: sanitizeApiKey(legacy.aiApiKey),
    counselThread: sanitizeCounselThread(legacy.counselThread),
    lifeVectorReading: sanitizeLifeVectorReading(legacy.lifeVectorReading),
    achievements: sanitizeAchievements(legacy.achievements),
  });
}

function migrateV15ToV16(persisted: unknown): PersistedGrailState {
  const legacy = persisted as (Partial<PersistedGrailState> & Record<string, unknown>) | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  const profile = legacy.profile;

  return migrateV16ToV17({
    profile: withDerivedScores({
      ...profile,
      careerCeiling: resolveCareerCeiling(profile),
      careerFloor: resolveCareerFloor(profile),
      careerWallPinned: profile.careerWallPinned === true,
    }),
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: migrateLanguage(
      typeof legacy.language === 'string' ? legacy.language : undefined,
      'ru',
    ),
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: sanitizeCampaigns(legacy.campaigns),
    methodSignals: sanitizeMethodSignals(legacy.methodSignals),
    talents: sanitizeTalents(legacy.talents),
    proofBackgroundUri: sanitizeProofUri(legacy.proofBackgroundUri) ?? '',
    aiApiKey: sanitizeApiKey(legacy.aiApiKey),
    counselThread: sanitizeCounselThread(legacy.counselThread),
    lifeVectorReading: sanitizeLifeVectorReading(legacy.lifeVectorReading),
    achievements: sanitizeAchievements(legacy.achievements),
  });
}

function migrateV16ToV17(persisted: unknown): PersistedGrailState {
  const legacy = persisted as (Partial<PersistedGrailState> & Record<string, unknown>) | null;

  if (legacy?.profile === undefined) {
    return createBaselineState();
  }

  return {
    profile: legacy.profile,
    tasks: legacy.tasks ?? createInitialTasks(),
    viewMode: legacy.viewMode ?? 'daily',
    language: 'system',
    surveyAnswers: sanitizeSurveyAnswers(legacy.surveyAnswers),
    surveyApplied: legacy.surveyApplied === true,
    shadowEvents: Array.isArray(legacy.shadowEvents) ? legacy.shadowEvents : [],
    driveLine: sanitizeDriveLine(legacy.driveLine),
    campaigns: sanitizeCampaigns(legacy.campaigns),
    methodSignals: sanitizeMethodSignals(legacy.methodSignals),
    talents: sanitizeTalents(legacy.talents),
    proofBackgroundUri: sanitizeProofUri(legacy.proofBackgroundUri) ?? '',
    aiApiKey: sanitizeApiKey(legacy.aiApiKey),
    counselThread: sanitizeCounselThread(legacy.counselThread),
    lifeVectorReading: sanitizeLifeVectorReading(legacy.lifeVectorReading),
    achievements: sanitizeAchievements(legacy.achievements),
    disciplineCompleted: sanitizeDisciplineCompleted(legacy.disciplineCompleted),
    soundEnabled: true,
    musicEnabled: true,
    disciplineBeacon: false,
    breathAwardedOn: '',
    weekFieldMarks: {},
  };
}

function isPreservedCustom(task: AtomizedTask): boolean {
  if (task.kind === 'canon' || task.id.startsWith('canon:')) {
    return false;
  }

  if (task.content.source === 'seed' && SEED_ID_BY_TASK_ID.has(task.id)) {
    return false;
  }

  return task.content.source === 'custom';
}

function migrateLanguage(
  value: string | undefined,
  fallback: LanguagePreference,
): LanguagePreference {
  if (value === 'system') {
    return 'system';
  }

  if (value !== undefined && isLanguage(value)) {
    return value;
  }

  return fallback;
}

function migrateBirthDate(
  legacyProfile: LegacyProfile,
  baseline: UserProfile,
): { birthDate: string; isBirthDateApproximate: boolean } {
  const stored = legacyProfile.birthDate;
  const parsed = stored === undefined ? null : parseBirthDate(stored);

  if (stored !== undefined && parsed !== null && isPlausibleBirthDate(parsed)) {
    return {
      birthDate: stored,
      isBirthDateApproximate: legacyProfile.isBirthDateApproximate === true,
    };
  }

  if (typeof legacyProfile.age === 'number' && Number.isFinite(legacyProfile.age)) {
    return {
      birthDate: approximateBirthDateFromAge(legacyProfile.age),
      isBirthDateApproximate: true,
    };
  }

  return { birthDate: baseline.birthDate, isBirthDateApproximate: true };
}

/**
 * Pre-v3 snapshots stored a derived or mutated `score`. That value is the
 * starting life reading. XP pools, bases and ceiling maps are dropped — the
 * journal starts empty so the first midnight does not pull the field toward 0.
 */
function migrateDimensions(
  legacyProfile: LegacyProfile,
  baseline: UserProfile,
): Record<HumanDimensionId, HumanDimension> {
  return HUMAN_DIMENSION_IDS.reduce(
    (next, id) => {
      const legacy = legacyProfile.dimensions?.[id];
      const fallback = baseline.dimensions[id] ?? { id, score: 0, isGated: false };

      next[id] = {
        id,
        score: clampPercentScore(legacy?.score ?? fallback.score),
        isGated: legacy?.isGated ?? fallback.isGated,
      };

      return next;
    },
    {} as Record<HumanDimensionId, HumanDimension>,
  );
}

/** Returns an array so callers can `flatMap` a task that carries no identity away. */
function migrateTask(legacy: LegacyTask): AtomizedTask[] {
  const id = legacy.id;
  const dimensionId = legacy.dimensionId;

  if (id === undefined || dimensionId === undefined) {
    return [];
  }

  const content = migrateContent(id, legacy);

  if (content === null) {
    return [];
  }

  const ritualState = legacy.ritualState ?? 'pending';
  const task: AtomizedTask = {
    id,
    content,
    dimensionId,
    kind: 'custom',
    ritualState,
    isCompleted: legacy.isCompleted ?? ritualState === 'absorbed',
    isNonNegotiable: legacy.isNonNegotiable ?? true,
    proofRequired: legacy.proofRequired ?? false,
    xpReward: legacy.xpReward ?? 15,
    isOverdue: legacy.isOverdue ?? false,
  };

  return [legacy.timeDeadline === undefined ? task : { ...task, timeDeadline: legacy.timeDeadline }];
}

function migrateContent(id: string, legacy: LegacyTask): AtomContent | null {
  if (legacy.content !== undefined) {
    return legacy.content;
  }

  const title = legacy.title;
  const seedId =
    SEED_ID_BY_TASK_ID.get(id) ??
    (title === undefined ? undefined : SEED_ID_BY_TITLE.get(`${legacy.dimensionId}:${title}`));

  if (seedId !== undefined) {
    return { source: 'seed', seedId };
  }

  if (title === undefined) {
    return null;
  }

  // A briefing equal to the generated template was never the user's own text,
  // so it is dropped and recomposed in whatever language they read in now.
  const instruction = legacy.instruction;

  if (instruction === undefined || instruction === legacyDefaultInstruction(title)) {
    return { source: 'custom', title };
  }

  return { source: 'custom', title, instruction };
}
