/**
 * Canonical ids for the eight GRAIL human-evolution dimensions.
 * Declared as a const tuple so callers can iterate without widening to `string`.
 */
export const HUMAN_DIMENSION_IDS = [
  'physical',
  'intellect',
  'mind_psyche',
  'drive',
  'craft_career',
  'wealth',
  'social',
  'spirit',
] as const;

export type HumanDimensionId = (typeof HUMAN_DIMENSION_IDS)[number];

/**
 * Ids of the atoms the app ships with. Their titles and briefings are authored
 * content, so they live in the dictionary and follow the current language —
 * unlike an atom the user typed, which is stored verbatim.
 */
export const SEED_ATOM_IDS = [
  'physical_morning_mobility',
  'intellect_deep_read',
  'mind_journal',
  'drive_cold_start',
  'craft_deep_work',
  'wealth_ledger',
  'social_outreach',
  'spirit_gratitude',
  'spirit_prayer',
  'spirit_silence',
  'spirit_inquiry',
  'spirit_school',
  'canon_rest',
] as const;

export type SeedAtomId = (typeof SEED_ATOM_IDS)[number];

/**
 * Inclusive 0–100 score used by dimensions and discipline.
 * Enforced at construction time via {@link clampPercentScore}.
 */
export type PercentScore = number;

export type OctagonViewMode = 'daily' | 'life' | 'shadow';

export interface HumanDimension {
  id: HumanDimensionId;
  /**
   * Life-octagon value: a slow average of weekly-norm fulfilment.
   * Mutated only by the calendar tick — never assigned from an absorb.
   */
  score: PercentScore;
  /**
   * When true, Craft & Career is still under a life-field ceiling below 100.
   */
  isGated: boolean;
}

/**
 * Absorbed XP by vector and local calendar day (`YYYY-MM-DD`).
 * Days older than {@link JOURNAL_RETENTION_DAYS} are trimmed on every pass.
 */
export type XpAbsorptionJournal = Record<HumanDimensionId, Record<string, number>>;

export interface UserProfile {
  id: string;
  /** Empty until the user names themselves in Settings. */
  name: string;
  /** Local `YYYY-MM-DD`. Age is derived from it, never stored. */
  birthDate: string;
  /**
   * True while the date is the one reconstructed from the age a pre-birth-date
   * build stored, so the UI can ask the user to make it exact.
   */
  isBirthDateApproximate: boolean;
  /** Age-weighted level derived from the mean of all eight dimension scores. */
  characterLevel: number;
  /**
   * Live follow-through, 0–100. First open day starts at 50 and a fully kept
   * desk that day is 100; later days average the last week of duties.
   */
  disciplineScore: PercentScore;
  currentStreak: number;
  dimensions: Record<HumanDimensionId, HumanDimension>;
  /** Rolling absorbed-XP ledger that feeds the life octagon. */
  xpJournal: XpAbsorptionJournal;
  /** Closed-day keep ratios; the week streak reads the last ~4 weeks. */
  promiseJournal: PromiseJournal;
  /** Monday (`YYYY-MM-DD`) of the canon week currently on the roster. */
  canonWeekStart: string;
  /**
   * Local `YYYY-MM-DD` of the first launch. Canon does not exist before it,
   * and the chronicle does not open a week earlier than that Monday.
   */
  firstOpenOn?: string;
  /**
   * Per-vector latch: a dimension starts aging only after its first absorb.
   * Restore does not clear the latch — once a vector has been lived, empty
   * weeks pull it toward zero instead of freezing it again.
   */
  lifeClockStarted: Record<HumanDimensionId, boolean>;
  /** Local YYYY-MM-DD of the last midnight life-score pass. */
  lastDecayDate: string;
  /**
   * Next career wall on Craft & Career. Starts at 50; each confirmed
   * breakthrough raises it by 15, up to 100.
   */
  careerCeiling: number;
  /**
   * Last broken wall (50 / 65 / 80 / 95), or 0 if none yet.
   * Decay back onto this mark pins the wall again.
   */
  careerFloor: number;
  /**
   * True after decay has pinned Craft & Career back on the last wall.
   * Cleared by a confirmed breakthrough, which writes wall + 1%.
   */
  careerWallPinned: boolean;
}

export type AtomRitualState = 'pending' | 'absorbed' | 'burned';

/** System duty, a deed the user named, or a taken campaign order. */
export type AtomKind = 'canon' | 'custom' | 'campaign';

export const SHADOW_CATALOG_IDS = [
  'substance_or_sleep',
  'feed_instead_of_contact',
  'impulse_spend',
  'broke_word',
  'spite_or_lie',
] as const;

export type ShadowCatalogId = (typeof SHADOW_CATALOG_IDS)[number];

export interface ShadowEvent {
  readonly id: string;
  readonly catalogId: ShadowCatalogId;
  readonly occurredOn: string;
}

export interface DayPromiseRecord {
  readonly promised: number;
  readonly kept: number;
}

/** Closed canon days that feed discipline. Keys are local `YYYY-MM-DD`. */
export type PromiseJournal = Record<string, DayPromiseRecord>;

/**
 * Where the text of an atom comes from. Nothing translatable is ever written to
 * disk: a seed atom persists its dictionary id and is rendered in the current
 * language, while a title the user typed is theirs and stays in the language
 * they typed it in. A `custom` atom without an `instruction` gets the default
 * briefing composed at render time.
 */
export type AtomContent =
  | { readonly source: 'seed'; readonly seedId: SeedAtomId }
  | { readonly source: 'custom'; readonly title: string; readonly instruction?: string };

/** Atomized "Non-Negotiable" task tied to a single human dimension. */
export interface AtomizedTask {
  id: string;
  content: AtomContent;
  dimensionId: HumanDimensionId;
  kind: AtomKind;
  ritualState: AtomRitualState;
  isCompleted: boolean;
  isNonNegotiable: boolean;
  proofRequired: boolean;
  xpReward: number;
  /** Local clock as `HH:mm`. Optional on canon — the person sets it by hand. */
  timeDeadline?: string;
  isOverdue: boolean;
  /**
   * Local `YYYY-MM-DD` of the absorb that wrote this atom into the journal.
   * Restore subtracts from that day, even if the calendar has moved on.
   */
  absorbedOn?: string;
  /** Calendar day this atom belongs to. Canon always has one; custom atoms keep the day the person typed. */
  scheduledOn?: string;
  /** Rest closes a second vector with the same absorb. */
  dualDimensionId?: HumanDimensionId;
  /** Set when `kind` is `campaign` — the campaign that put this atom on the desk. */
  campaignId?: string;
  /** Fire a local signal at `scheduledOn` + `timeDeadline`. */
  notify?: boolean;
}

export const GATED_DIMENSION_SCORE_CAP = 50;
export const PERCENT_SCORE_MIN = 0;
export const PERCENT_SCORE_MAX = 100;

/** Three atoms of 15 XP — the absolute weekly norm of one vector. */
export const WEEKLY_NORM_XP = 45;
/** Daily blending rate of life toward the held weekly-norm share (0.05%). */
export const LIFE_SCORE_RATE = 0.0005;
/** Inclusive length of the rolling window that computes {@link computeDayShare}. */
export const LIFE_WINDOW_DAYS = 7;
/** How many calendar days of journal entries to keep. */
export const JOURNAL_RETENTION_DAYS = 14;
/** XP of one canon slot and of a typical shadow. */
export const CANON_SLOT_XP = 15;
/** Daily blending rate of discipline toward that day's kept-promise share. */
export const DISCIPLINE_RATE = 0.08;
/** Inclusive length of the promise journal that feeds the week streak. */
export const DISCIPLINE_WINDOW_DAYS = 28;
/** Rolling days that average into the live discipline percent. */
export const DISCIPLINE_SCORE_DAYS = 7;
/** Follow-through on the first open day, before any deed is kept. */
export const DISCIPLINE_START_SCORE = 50;
/** Taken off live discipline while a word-breaking shadow still hangs this week. */
export const DISCIPLINE_SHADOW_PENALTY = 10;
/** A week counts toward the streak when this share of canon slots was kept. */
export const CANON_WEEK_STREAK_RATIO = 0.8;

export function clampPercentScore(value: number): PercentScore {
  return Math.min(PERCENT_SCORE_MAX, Math.max(PERCENT_SCORE_MIN, value));
}

/**
 * Caps Craft & Career at the current career ceiling.
 * Other vectors (and Craft & Career once the ceiling is 100) may reach 100.
 */
export function capDimensionScore(
  dimension: HumanDimension,
  score: number,
  careerCeiling: number = GATED_DIMENSION_SCORE_CAP,
): PercentScore {
  const gatedMax =
    dimension.id === 'craft_career' ? clampPercentScore(careerCeiling) : PERCENT_SCORE_MAX;

  return clampPercentScore(Math.min(gatedMax, score));
}

/** Re-applies the career ceiling to every stored life score. */
export function applyDimensionCaps(
  dimensions: Record<HumanDimensionId, HumanDimension>,
  careerCeiling: number = GATED_DIMENSION_SCORE_CAP,
): Record<HumanDimensionId, HumanDimension> {
  const ceiling = clampPercentScore(careerCeiling);

  return HUMAN_DIMENSION_IDS.reduce(
    (next, id) => {
      const dimension = dimensions[id] ?? { id, score: 0, isGated: false };
      next[id] = {
        ...dimension,
        isGated: id === 'craft_career' && ceiling < PERCENT_SCORE_MAX,
        score: capDimensionScore(dimension, dimension.score, ceiling),
      };
      return next;
    },
    {} as Record<HumanDimensionId, HumanDimension>,
  );
}

function averageDimensionScore(dimensions: Record<HumanDimensionId, HumanDimension>): number {
  const total = HUMAN_DIMENSION_IDS.reduce((sum, id) => sum + (dimensions[id]?.score ?? 0), 0);
  return total / HUMAN_DIMENSION_IDS.length;
}

/**
 * Age-weighted character level: mean of the eight dimension scores,
 * scaled by chronological age (`(average / 100) * age`).
 */
export function computeCharacterLevel(
  age: number,
  dimensions: Record<HumanDimensionId, HumanDimension>,
): number {
  const average = averageDimensionScore(dimensions);
  return Math.max(1, Math.round((average / PERCENT_SCORE_MAX) * age));
}

export interface DailyVectorProgress {
  readonly totalToday: number;
  readonly completedToday: number;
  readonly score: number;
}

export function isPendingAtom(task: AtomizedTask): boolean {
  return task.ritualState === 'pending';
}

export function isHistoryAtom(task: AtomizedTask): boolean {
  return task.ritualState !== 'pending';
}

export function isCanonAtom(task: AtomizedTask): boolean {
  return task.kind === 'canon';
}

export function isCampaignAtom(task: AtomizedTask): boolean {
  return task.kind === 'campaign';
}

export function isHumanDimensionId(value: string): value is HumanDimensionId {
  return (HUMAN_DIMENSION_IDS as readonly string[]).includes(value);
}

/** Primary vector plus the rest dual, when present. */
export function atomDimensionIds(task: AtomizedTask): readonly HumanDimensionId[] {
  return task.dualDimensionId === undefined
    ? [task.dimensionId]
    : [task.dimensionId, task.dualDimensionId];
}

/**
 * Formation of one calendar day: that day's canon, plus custom and campaign
 * atoms still on the desk for that day or absorbed on it. Burned atoms leave
 * the roster. A custom atom with `scheduledOn` only counts on that date.
 */
export function isOnDailyRoster(task: AtomizedTask, asOf: string): boolean {
  if (task.ritualState === 'burned') {
    return false;
  }

  if (task.kind === 'canon') {
    return task.scheduledOn === asOf;
  }

  if (task.ritualState === 'absorbed') {
    return task.absorbedOn === asOf;
  }

  if (task.scheduledOn !== undefined) {
    return task.scheduledOn === asOf;
  }

  return true;
}

/**
 * What the atomizer lists for a selected calendar day, including the chronicle.
 * Unscheduled pending custom/campaign atoms live on the live today only, so a
 * future day does not inherit the whole desk. Burned custom atoms reappear on
 * the day they were due.
 */
export function isOnAtomizerDay(task: AtomizedTask, asOf: string, today: string): boolean {
  if (task.kind === 'canon') {
    return task.scheduledOn === asOf;
  }

  if (task.ritualState === 'pending') {
    if (task.scheduledOn !== undefined) {
      return task.scheduledOn === asOf;
    }

    return asOf === today;
  }

  if (task.ritualState === 'absorbed') {
    return task.absorbedOn === asOf;
  }

  if (task.scheduledOn !== undefined) {
    return task.scheduledOn === asOf;
  }

  return asOf === today;
}

/** A deed cannot be sealed before the day it stands on. It can still burn. */
export function isAtomDueInFuture(task: AtomizedTask, today: string): boolean {
  return task.scheduledOn !== undefined && task.scheduledOn > today;
}

/**
 * Calendar day this atom stands on in the atomizer. Unscheduled custom and
 * campaign atoms live on the live today. Missing absorb day is not a date.
 */
export function atomizerDayOf(task: AtomizedTask, today: string): string | undefined {
  if (task.kind === 'canon') {
    return task.scheduledOn;
  }

  if (task.ritualState === 'pending') {
    return task.scheduledOn ?? today;
  }

  if (task.ritualState === 'absorbed') {
    return task.absorbedOn;
  }

  return task.scheduledOn ?? today;
}

/**
 * A past day's chronicle is closed: absorb, burn, restore, remove and erase
 * would rewrite the 1–5. Future days stay open to burn, not to absorb.
 */
export function isAtomSealed(task: AtomizedTask, today: string): boolean {
  const day = atomizerDayOf(task, today);
  return day !== undefined && day < today;
}

function bumpDailyBucket(
  buckets: Record<HumanDimensionId, { totalToday: number; completedToday: number }>,
  id: HumanDimensionId,
  completed: boolean,
): void {
  const bucket = buckets[id];
  if (bucket === undefined) {
    return;
  }

  bucket.totalToday += 1;
  if (completed) {
    bucket.completedToday += 1;
  }
}

/**
 * Normalized daily fill per vector: absorbed / assigned * 100.
 * Burned atoms leave the roster. Zero assigned tasks yield 0, never NaN.
 * Pass `asOf` so a full week of canon does not fill every axis at once.
 */
export function getDailyDimensionProgress(
  tasks: readonly AtomizedTask[],
  asOf?: string,
): Record<HumanDimensionId, DailyVectorProgress> {
  const buckets = HUMAN_DIMENSION_IDS.reduce(
    (acc, id) => {
      acc[id] = { totalToday: 0, completedToday: 0 };
      return acc;
    },
    {} as Record<HumanDimensionId, { totalToday: number; completedToday: number }>,
  );

  for (const task of tasks) {
    if (asOf !== undefined && !isOnDailyRoster(task, asOf)) {
      continue;
    }

    if (task.ritualState === 'burned') {
      continue;
    }

    const completed = task.ritualState === 'absorbed' || task.isCompleted;
    for (const id of atomDimensionIds(task)) {
      bumpDailyBucket(buckets, id, completed);
    }
  }

  return HUMAN_DIMENSION_IDS.reduce(
    (progress, id) => {
      const { totalToday, completedToday } = buckets[id] ?? { totalToday: 0, completedToday: 0 };
      progress[id] = {
        totalToday,
        completedToday,
        score:
          totalToday > 0
            ? clampPercentScore((completedToday / totalToday) * PERCENT_SCORE_MAX)
            : 0,
      };
      return progress;
    },
    {} as Record<HumanDimensionId, DailyVectorProgress>,
  );
}
