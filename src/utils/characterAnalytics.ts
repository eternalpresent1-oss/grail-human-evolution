import { analyticsShadowBodyKey, analyticsShadowHelpKey, dimensionNameKey, shadowTitleKey, type TranslationKey, type Translator } from '@/i18n';
import { SHADOW_READING_PRIORITY } from '@/constants/shadow';
import {
  HUMAN_DIMENSION_IDS,
  PERCENT_SCORE_MAX,
  atomDimensionIds,
  clampPercentScore,
  getDailyDimensionProgress,
  isOnAtomizerDay,
  type AtomizedTask,
  type DailyVectorProgress,
  type HumanDimension,
  type HumanDimensionId,
  type OctagonViewMode,
  type PromiseJournal,
  type ShadowCatalogId,
  type ShadowEvent,
} from '@/types/grail';
import { isoWeekday } from '@/utils/taskTime';
import { computeAllShadowShares, tallyShadowCatalog, type ShadowCatalogTally } from '@/utils/weekLedger';
import { weekReview } from '@/utils/weekReview';

export type VectorBand = 'dominant' | 'balanced' | 'underperforming';

/** Absolute life-score colour band. The card never writes these names. */
export type LifeScoreBand = 'veryLow' | 'low' | 'mid' | 'high' | 'veryHigh';

export type DailyDeedKind = 'done' | 'partial' | 'missed';

export interface DailyDeedCard {
  readonly kind: DailyDeedKind;
  readonly vectorIds: readonly HumanDimensionId[];
}

export interface WeekAnalysisCard {
  readonly emptyWeek: boolean;
  readonly keepShare: number | null;
  readonly hasShadow: boolean;
}

export interface AnalyzedVector {
  readonly dimension: HumanDimension;
  readonly band: VectorBand;
  readonly deltaFromAverage: number;
}

/** Axes the shadow ate most of this week, strongest first. */
export interface AnalyzedShadow {
  readonly dimensionId: HumanDimensionId;
  readonly share: number;
}

/** One reading of the whole shadow for the analysis card. */
export interface ShadowReading {
  readonly title: string;
  readonly body: string;
  readonly share: number;
}

export interface CharacterAnalysis {
  readonly viewMode: OctagonViewMode;
  readonly averageScore: number;
  readonly harmonyIndex: number;
  readonly scheduledToday: number;
  readonly completedToday: number;
  readonly vectors: readonly AnalyzedVector[];
  readonly strengths: readonly AnalyzedVector[];
  readonly bottlenecks: readonly AnalyzedVector[];
  readonly dailyCards: readonly DailyDeedCard[];
  readonly weekCard: WeekAnalysisCard | null;
  readonly shadowThreats: readonly AnalyzedShadow[];
  readonly shadowReading: ShadowReading;
  readonly developmentPlan: readonly [string, string, string];
  /** Pending atoms and canons of the day — the day is still open. Burned does not count. */
  readonly openDayIds: readonly HumanDimensionId[];
}

const LIFE_STRENGTH_FLOOR = 40;
const LIFE_CARD_LIMIT = 2;

export function lifeScoreBand(score: number): LifeScoreBand {
  if (score < 20) {
    return 'veryLow';
  }
  if (score < 40) {
    return 'low';
  }
  if (score < 60) {
    return 'mid';
  }
  if (score < 80) {
    return 'high';
  }
  return 'veryHigh';
}

/** Why a dominant vector matters, quoted by the first step of the lifetime plan. */
function foundationKey(id: HumanDimensionId): TranslationKey {
  return `foundation.${id}`;
}

export function analyzeGrailField(input: {
  t: Translator;
  viewMode: OctagonViewMode;
  dimensions: Record<HumanDimensionId, HumanDimension>;
  tasks: readonly AtomizedTask[];
  shadowEvents?: readonly ShadowEvent[];
  promiseJournal?: PromiseJournal;
  asOf?: string;
}): CharacterAnalysis {
  const asOf = input.asOf;
  const progress = getDailyDimensionProgress(input.tasks, asOf);
  const scheduledToday = HUMAN_DIMENSION_IDS.reduce(
    (sum, id) => sum + (progress[id]?.totalToday ?? 0),
    0,
  );
  const completedToday = HUMAN_DIMENSION_IDS.reduce(
    (sum, id) => sum + (progress[id]?.completedToday ?? 0),
    0,
  );
  const shadowShares =
    asOf === undefined
      ? computeAllShadowShares([], '')
      : computeAllShadowShares(input.shadowEvents ?? [], asOf);
  const shadowThreats = rankShadowThreats(shadowShares);
  const shadowReading = buildShadowReading(input.t, input.shadowEvents ?? [], asOf, shadowShares);

  if (input.viewMode === 'daily') {
    return analyzeDailyField({
      t: input.t,
      dimensions: input.dimensions,
      tasks: input.tasks,
      progress,
      shadowThreats,
      shadowReading,
      shadowEvents: input.shadowEvents ?? [],
      promiseJournal: input.promiseJournal,
      asOf,
    });
  }

  if (input.viewMode === 'shadow') {
    return analyzeShadowField({
      t: input.t,
      dimensions: input.dimensions,
      scheduledToday,
      completedToday,
      shadowShares,
      shadowThreats,
      shadowReading,
    });
  }

  return analyzeLifeField({
    t: input.t,
    dimensions: input.dimensions,
    scheduledToday,
    completedToday,
    shadowThreats,
    shadowReading,
  });
}

function analyzeDailyField(input: {
  t: Translator;
  dimensions: Record<HumanDimensionId, HumanDimension>;
  tasks: readonly AtomizedTask[];
  progress: Record<HumanDimensionId, DailyVectorProgress>;
  shadowThreats: readonly AnalyzedShadow[];
  shadowReading: ShadowReading;
  shadowEvents: readonly ShadowEvent[];
  promiseJournal: PromiseJournal | undefined;
  asOf: string | undefined;
}): CharacterAnalysis {
  const asOf = input.asOf;
  const deeds = asOf === undefined ? emptyDeedBuckets() : collectDailyDeeds(input.tasks, asOf);
  const doneIds: HumanDimensionId[] = [];
  const partialIds: HumanDimensionId[] = [];
  const missedIds: HumanDimensionId[] = [];

  for (const id of HUMAN_DIMENSION_IDS) {
    const deed = deeds[id];
    if (deed === undefined || deed.total === 0) {
      continue;
    }
    if (deed.completed <= 0) {
      missedIds.push(id);
    } else if (deed.completed >= deed.total) {
      doneIds.push(id);
    } else {
      partialIds.push(id);
    }
  }

  const dailyCards: DailyDeedCard[] = [];
  if (doneIds.length > 0) {
    dailyCards.push({ kind: 'done', vectorIds: doneIds });
  }
  if (partialIds.length > 0) {
    dailyCards.push({ kind: 'partial', vectorIds: partialIds });
  }
  if (missedIds.length > 0) {
    dailyCards.push({ kind: 'missed', vectorIds: missedIds });
  }

  const scored = HUMAN_DIMENSION_IDS.map((id) => {
    const base = input.dimensions[id] ?? { id, score: 0, isGated: false };
    return {
      ...base,
      score: input.progress[id]?.score ?? 0,
    };
  });
  const averageScore =
    scored.reduce((sum, dimension) => sum + dimension.score, 0) / Math.max(scored.length, 1);

  const toVector = (id: HumanDimensionId, band: VectorBand): AnalyzedVector => {
    const dimension = scored.find((item) => item.id === id) ?? { id, score: 0, isGated: false };
    return {
      dimension,
      band,
      deltaFromAverage: dimension.score - averageScore,
    };
  };

  const strengths = [
    ...doneIds.map((id) => toVector(id, 'dominant')),
    ...partialIds.map((id) => toVector(id, 'dominant')),
  ];
  const bottlenecks = missedIds.map((id) => toVector(id, 'underperforming'));
  const vectors = scored.map((dimension) => {
    if (doneIds.includes(dimension.id) || partialIds.includes(dimension.id)) {
      return toVector(dimension.id, 'dominant');
    }
    if (missedIds.includes(dimension.id)) {
      return toVector(dimension.id, 'underperforming');
    }
    return {
      dimension,
      band: 'balanced' as const,
      deltaFromAverage: dimension.score - averageScore,
    };
  });

  const scheduledFromDeeds = HUMAN_DIMENSION_IDS.reduce(
    (sum, id) => sum + (deeds[id]?.total ?? 0),
    0,
  );
  const completedFromDeeds = HUMAN_DIMENSION_IDS.reduce(
    (sum, id) => sum + (deeds[id]?.completed ?? 0),
    0,
  );

  return {
    viewMode: 'daily',
    averageScore,
    harmonyIndex: lifeHarmonyIndex(input.dimensions),
    scheduledToday: scheduledFromDeeds,
    completedToday: completedFromDeeds,
    vectors,
    strengths,
    bottlenecks,
    dailyCards,
    weekCard: buildWeekCard(input.promiseJournal, input.shadowEvents, asOf),
    shadowThreats: input.shadowThreats,
    shadowReading: input.shadowReading,
    developmentPlan: buildDailyPlan(input.t, strengths, bottlenecks),
    openDayIds: asOf === undefined ? [] : collectOpenDayIds(input.tasks, asOf),
  };
}

function analyzeShadowField(input: {
  t: Translator;
  dimensions: Record<HumanDimensionId, HumanDimension>;
  scheduledToday: number;
  completedToday: number;
  shadowShares: Record<HumanDimensionId, number>;
  shadowThreats: readonly AnalyzedShadow[];
  shadowReading: ShadowReading;
}): CharacterAnalysis {
  const scored = HUMAN_DIMENSION_IDS.map((id) => ({
    id,
    score: input.shadowShares[id] ?? 0,
    isGated: false,
  }));
  const shadowed = scored.filter((dimension) => dimension.score > 0);
  const averageScore = meanShadowShare(input.shadowShares);

  const ranked = [...shadowed].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return HUMAN_DIMENSION_IDS.indexOf(left.id) - HUMAN_DIMENSION_IDS.indexOf(right.id);
  });

  const toVector = (dimension: HumanDimension): AnalyzedVector => ({
    dimension,
    band: 'underperforming',
    deltaFromAverage: dimension.score - averageScore,
  });

  const hold = ranked[0];
  const strengths = hold === undefined ? [] : [toVector(hold)];
  const bottlenecks = ranked.slice(1, 3).map(toVector);

  const vectors = scored.map(toVector);

  return {
    viewMode: 'shadow',
    averageScore,
    harmonyIndex: lifeHarmonyIndex(input.dimensions),
    scheduledToday: input.scheduledToday,
    completedToday: input.completedToday,
    vectors,
    strengths,
    bottlenecks,
    dailyCards: [],
    weekCard: null,
    shadowThreats: input.shadowThreats,
    shadowReading: input.shadowReading,
    developmentPlan: buildShadowPlan(input.t, hold),
    openDayIds: [],
  };
}

function buildShadowPlan(
  t: Translator,
  hold: HumanDimension | undefined,
): readonly [string, string, string] {
  if (hold === undefined) {
    return [t('plan.shadow.empty.step1'), t('plan.shadow.empty.step2'), t('plan.shadow.empty.step3')];
  }

  return [t('plan.shadow.step1'), t('plan.shadow.step2'), t('plan.shadow.step3')];
}

function analyzeLifeField(input: {
  t: Translator;
  dimensions: Record<HumanDimensionId, HumanDimension>;
  scheduledToday: number;
  completedToday: number;
  shadowThreats: readonly AnalyzedShadow[];
  shadowReading: ShadowReading;
}): CharacterAnalysis {
  const scored = HUMAN_DIMENSION_IDS.map(
    (id) => input.dimensions[id] ?? { id, score: 0, isGated: false },
  );
  const analysis = pickLifeCards(scored);

  return {
    ...analysis,
    harmonyIndex: lifeHarmonyIndex(input.dimensions),
    viewMode: 'life',
    scheduledToday: input.scheduledToday,
    completedToday: input.completedToday,
    dailyCards: [],
    weekCard: null,
    shadowThreats: input.shadowThreats,
    shadowReading: input.shadowReading,
    developmentPlan: buildLifePlan(
      input.t,
      analysis.strengths,
      analysis.bottlenecks,
      input.shadowThreats,
    ),
    openDayIds: [],
  };
}

function lifeHarmonyIndex(
  dimensions: Record<HumanDimensionId, HumanDimension>,
): number {
  const scored = HUMAN_DIMENSION_IDS.map(
    (id) => inputScore(dimensions, id),
  );
  const average =
    scored.reduce((sum, score) => sum + score, 0) / Math.max(scored.length, 1);
  const meanAbsoluteDeviation =
    scored.reduce((sum, score) => sum + Math.abs(score - average), 0) /
    Math.max(scored.length, 1);

  return clampPercentScore(PERCENT_SCORE_MAX - meanAbsoluteDeviation * 2);
}

function inputScore(
  dimensions: Record<HumanDimensionId, HumanDimension>,
  id: HumanDimensionId,
): number {
  return dimensions[id]?.score ?? 0;
}

function pickLifeCards(scored: readonly HumanDimension[]): Omit<
  CharacterAnalysis,
  | 'viewMode'
  | 'scheduledToday'
  | 'completedToday'
  | 'developmentPlan'
  | 'shadowThreats'
  | 'shadowReading'
  | 'dailyCards'
  | 'weekCard'
  | 'openDayIds'
> {
  const averageScore =
    scored.reduce((sum, dimension) => sum + dimension.score, 0) / Math.max(scored.length, 1);

  const high = [...scored]
    .filter((dimension) => dimension.score >= LIFE_STRENGTH_FLOOR)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return HUMAN_DIMENSION_IDS.indexOf(left.id) - HUMAN_DIMENSION_IDS.indexOf(right.id);
    })
    .slice(0, LIFE_CARD_LIMIT);

  const low = [...scored]
    .filter((dimension) => dimension.score < LIFE_STRENGTH_FLOOR)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }
      return HUMAN_DIMENSION_IDS.indexOf(left.id) - HUMAN_DIMENSION_IDS.indexOf(right.id);
    })
    .slice(0, LIFE_CARD_LIMIT);

  const strengthIds = new Set(high.map((dimension) => dimension.id));
  const bottleneckIds = new Set(low.map((dimension) => dimension.id));

  const vectors = scored.map((dimension) => {
    const deltaFromAverage = dimension.score - averageScore;
    let band: VectorBand = 'balanced';
    if (strengthIds.has(dimension.id)) {
      band = 'dominant';
    } else if (bottleneckIds.has(dimension.id)) {
      band = 'underperforming';
    }

    return {
      dimension,
      band,
      deltaFromAverage,
    } satisfies AnalyzedVector;
  });

  return {
    averageScore,
    harmonyIndex: clampPercentScore(
      PERCENT_SCORE_MAX -
        (scored.reduce((sum, dimension) => sum + Math.abs(dimension.score - averageScore), 0) /
          Math.max(scored.length, 1)) *
          2,
    ),
    vectors,
    strengths: vectors
      .filter((vector) => strengthIds.has(vector.dimension.id))
      .sort((left, right) => right.dimension.score - left.dimension.score),
    bottlenecks: vectors
      .filter((vector) => bottleneckIds.has(vector.dimension.id))
      .sort((left, right) => left.dimension.score - right.dimension.score),
  };
}

type DeedBucket = { total: number; completed: number };

function emptyDeedBuckets(): Record<HumanDimensionId, DeedBucket> {
  return HUMAN_DIMENSION_IDS.reduce(
    (acc, id) => {
      acc[id] = { total: 0, completed: 0 };
      return acc;
    },
    {} as Record<HumanDimensionId, DeedBucket>,
  );
}

function collectDailyDeeds(
  tasks: readonly AtomizedTask[],
  asOf: string,
): Record<HumanDimensionId, DeedBucket> {
  const buckets = emptyDeedBuckets();

  for (const task of tasks) {
    if (!isOnAtomizerDay(task, asOf, asOf)) {
      continue;
    }

    const completed = task.ritualState === 'absorbed' || task.isCompleted;
    for (const id of atomDimensionIds(task)) {
      const bucket = buckets[id];
      if (bucket === undefined) {
        continue;
      }
      bucket.total += 1;
      if (completed) {
        bucket.completed += 1;
      }
    }
  }

  return buckets;
}

/** Pending atoms of the day — canon, custom and campaign. Clock does not matter. */
function collectOpenDayIds(tasks: readonly AtomizedTask[], asOf: string): readonly HumanDimensionId[] {
  const hits = new Set<HumanDimensionId>();

  for (const task of tasks) {
    if (!isOnAtomizerDay(task, asOf, asOf) || task.ritualState !== 'pending') {
      continue;
    }
    for (const id of atomDimensionIds(task)) {
      hits.add(id);
    }
  }

  return HUMAN_DIMENSION_IDS.filter((id) => hits.has(id));
}

function buildWeekCard(
  journal: PromiseJournal | undefined,
  events: readonly ShadowEvent[],
  asOf: string | undefined,
): WeekAnalysisCard | null {
  if (asOf === undefined || isoWeekday(asOf) !== 7) {
    return null;
  }

  const review = weekReview(journal ?? {}, events, asOf);
  if (review.promised <= 0) {
    return {
      emptyWeek: true,
      keepShare: null,
      hasShadow: review.shadowCount > 0,
    };
  }

  return {
    emptyWeek: false,
    keepShare: clampPercentScore((review.kept / review.promised) * PERCENT_SCORE_MAX),
    hasShadow: review.shadowCount > 0,
  };
}

function buildDailyPlan(
  t: Translator,
  strengths: readonly AnalyzedVector[],
  bottlenecks: readonly AnalyzedVector[],
): readonly [string, string, string] {
  const peak = strengths[0]?.dimension;
  const weak = bottlenecks[0]?.dimension;
  const peakLabel = peak === undefined ? t('plan.peak.fallback') : t(dimensionNameKey(peak.id));
  const weakLabel = weak === undefined ? t('plan.weak.fallback') : t(dimensionNameKey(weak.id));

  return [
    t('plan.daily.step1', { peak: peakLabel }),
    t('plan.daily.step2', { weak: weakLabel }),
    t('plan.daily.step3', { weak: weakLabel }),
  ];
}

function buildLifePlan(
  t: Translator,
  strengths: readonly AnalyzedVector[],
  bottlenecks: readonly AnalyzedVector[],
  shadowThreats: readonly AnalyzedShadow[],
): readonly [string, string, string] {
  const peak = strengths[0]?.dimension;
  const weak = bottlenecks[0]?.dimension;
  const peakLabel = peak === undefined ? t('plan.peak.fallback') : t(dimensionNameKey(peak.id));
  const weakLabel = weak === undefined ? t('plan.weak.fallback') : t(dimensionNameKey(weak.id));
  const foundation = peak === undefined ? '' : t(foundationKey(peak.id));
  const shadow = shadowThreats[0];
  const closing =
    shadow === undefined
      ? t('plan.life.step3', { weak: weakLabel, peak: peakLabel })
      : t('plan.life.step3.shadow', { weak: weakLabel, peak: peakLabel });

  return [
    t('plan.life.step1', { foundation, peak: peakLabel }),
    t('plan.life.step2', { weak: weakLabel }),
    closing,
  ];
}

function rankShadowThreats(
  shares: Record<HumanDimensionId, number>,
  limit = 2,
): readonly AnalyzedShadow[] {
  return HUMAN_DIMENSION_IDS.map((dimensionId) => ({
    dimensionId,
    share: shares[dimensionId] ?? 0,
  }))
    .filter((item) => item.share > 0)
    .sort((left, right) => {
      if (right.share !== left.share) {
        return right.share - left.share;
      }

      return HUMAN_DIMENSION_IDS.indexOf(left.dimensionId) - HUMAN_DIMENSION_IDS.indexOf(right.dimensionId);
    })
    .slice(0, limit);
}

function buildShadowReading(
  t: Translator,
  events: readonly ShadowEvent[],
  asOf: string | undefined,
  shares: Record<HumanDimensionId, number>,
): ShadowReading {
  const tally = asOf === undefined ? [] : rankShadowTally(tallyShadowCatalog(events, asOf));
  const share = meanShadowShare(shares);

  const lead = tally[0];
  if (lead === undefined) {
    return {
      title: t('analytics.shadow.title'),
      body: t('analytics.shadow.empty'),
      share: 0,
    };
  }

  if (tally.length === 1) {
    return {
      title: t(shadowTitleKey(lead.catalogId)),
      body: t(analyticsShadowBodyKey(lead.catalogId)),
      share,
    };
  }

  return {
    title: t('analytics.shadow.title'),
    body: tally.map((row) => t(analyticsShadowHelpKey(row.catalogId))).join('\n\n'),
    share,
  };
}

function meanShadowShare(shares: Record<HumanDimensionId, number>): number {
  return (
    HUMAN_DIMENSION_IDS.reduce((sum, id) => sum + (shares[id] ?? 0), 0) /
    Math.max(HUMAN_DIMENSION_IDS.length, 1)
  );
}

function rankShadowTally(tally: readonly ShadowCatalogTally[]): readonly ShadowCatalogTally[] {
  return [...tally].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return shadowReadingPriority(left.catalogId) - shadowReadingPriority(right.catalogId);
  });
}

function shadowReadingPriority(id: ShadowCatalogId): number {
  const index = SHADOW_READING_PRIORITY.indexOf(id);
  return index < 0 ? SHADOW_READING_PRIORITY.length : index;
}
