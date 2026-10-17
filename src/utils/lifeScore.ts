import {
  applyDimensionCaps,
  clampPercentScore,
  HUMAN_DIMENSION_IDS,
  JOURNAL_RETENTION_DAYS,
  LIFE_SCORE_RATE,
  LIFE_WINDOW_DAYS,
  PERCENT_SCORE_MAX,
  WEEKLY_NORM_XP,
  type HumanDimension,
  type HumanDimensionId,
  type ShadowEvent,
  type XpAbsorptionJournal,
} from '@/types/grail';
import { CAREER_GATE_FIRST } from '@/utils/careerGate';
import { computeNetDayShare } from '@/utils/weekLedger';
import { calendarDaysBetween, shiftDateKey } from '@/utils/taskTime';

export function createEmptyXpJournal(): XpAbsorptionJournal {
  return HUMAN_DIMENSION_IDS.reduce(
    (journal, id) => {
      journal[id] = {};
      return journal;
    },
    {} as XpAbsorptionJournal,
  );
}

export function createStoppedLifeClocks(): Record<HumanDimensionId, boolean> {
  return HUMAN_DIMENSION_IDS.reduce(
    (clocks, id) => {
      clocks[id] = false;
      return clocks;
    },
    {} as Record<HumanDimensionId, boolean>,
  );
}

export function journalHasXp(journal: XpAbsorptionJournal, id: HumanDimensionId): boolean {
  const days = journal[id];
  return days !== undefined && Object.keys(days).length > 0;
}

export function journalHasAnyXp(journal: XpAbsorptionJournal): boolean {
  return HUMAN_DIMENSION_IDS.some((id) => journalHasXp(journal, id));
}

/** First absorb on a vector starts its clock. Restore never turns it back off. */
export function startLifeClock(
  clocks: Record<HumanDimensionId, boolean>,
  id: HumanDimensionId,
): Record<HumanDimensionId, boolean> {
  if (clocks[id] === true) {
    return clocks;
  }

  return { ...clocks, [id]: true };
}

/**
 * Adds `delta` XP to one vector-day. A zero or negative remainder deletes the
 * day, so an absorb/restore pair leaves the journal exactly as it was.
 */
export function applyJournalXp(
  journal: XpAbsorptionJournal,
  dimensionId: HumanDimensionId,
  dateKey: string,
  delta: number,
): XpAbsorptionJournal {
  const currentDays = journal[dimensionId] ?? {};
  const nextValue = (currentDays[dateKey] ?? 0) + delta;
  const nextDays: Record<string, number> = { ...currentDays };

  if (nextValue <= 0) {
    delete nextDays[dateKey];
  } else {
    nextDays[dateKey] = nextValue;
  }

  return { ...journal, [dimensionId]: nextDays };
}

export function trimXpJournal(journal: XpAbsorptionJournal, asOf: string): XpAbsorptionJournal {
  return HUMAN_DIMENSION_IDS.reduce(
    (next, id) => {
      const days = journal[id] ?? {};
      const trimmed: Record<string, number> = {};

      for (const [key, value] of Object.entries(days)) {
        if (value > 0 && calendarDaysBetween(asOf, key) === 0 && calendarDaysBetween(key, asOf) < JOURNAL_RETENTION_DAYS) {
          trimmed[key] = value;
        }
      }

      next[id] = trimmed;
      return next;
    },
    {} as XpAbsorptionJournal,
  );
}

function windowXp(days: Record<string, number>, asOf: string): number {
  let total = 0;

  for (let offset = 0; offset < LIFE_WINDOW_DAYS; offset += 1) {
    const key = shiftDateKey(asOf, -offset);
    total += days[key] ?? 0;
  }

  return total;
}

/**
 * Share of the weekly norm absorbed in the last seven days, clamped to 0–100.
 * An empty window is 0, never NaN.
 */
export function computeDayShare(days: Record<string, number> | undefined, asOf: string): number {
  const xp = windowXp(days ?? {}, asOf);
  if (!Number.isFinite(xp) || WEEKLY_NORM_XP <= 0) {
    return 0;
  }

  return clampPercentScore((xp / WEEKLY_NORM_XP) * PERCENT_SCORE_MAX);
}

/**
 * Moves `life` toward a held `dayShare`. One calendar day uses the discrete
 * step; several days use the closed form of the same ODE. No floor except 0.
 */
export function advanceLifeScore(life: number, dayShare: number, days: number): number {
  if (days <= 0) {
    return clampPercentScore(life);
  }

  const share = clampPercentScore(dayShare);
  const current = clampPercentScore(life);

  if (days === 1) {
    return clampPercentScore(current + LIFE_SCORE_RATE * (share - current));
  }

  return clampPercentScore(share + (current - share) * Math.exp(-LIFE_SCORE_RATE * days));
}

/**
 * How much of Craft's lead shows up as Wealth. Skill that is practiced
 * starts to pay; Wealth cannot sit still while Craft moves.
 */
export const CRAFT_WEALTH_LINK = 0.28;
/**
 * How much of Wealth's lead shows up as Craft. A household is a craft,
 * but money without skill lifts the path only a little.
 */
export const WEALTH_CRAFT_LINK = 0.12;

export function linkedPracticePartner(id: HumanDimensionId): HumanDimensionId | null {
  if (id === 'craft_career') {
    return 'wealth';
  }

  if (id === 'wealth') {
    return 'craft_career';
  }

  return null;
}

/**
 * Idempotent mix of the two practice shares. Craft 80 and Wealth 0 yield
 * Wealth 22.4 every day — the score converges, it does not ratchet.
 */
export function linkedDayShare(
  id: HumanDimensionId,
  craftShare: number,
  wealthShare: number,
): number {
  if (id === 'wealth') {
    return clampPercentScore(
      wealthShare + CRAFT_WEALTH_LINK * Math.max(0, craftShare - wealthShare),
    );
  }

  if (id === 'craft_career') {
    return clampPercentScore(
      craftShare + WEALTH_CRAFT_LINK * Math.max(0, wealthShare - craftShare),
    );
  }

  return 0;
}

/** One-shot field mix for the survey. Same rates as the daily share link. */
export function coupleCraftWealthDimensions(
  dimensions: Record<HumanDimensionId, HumanDimension>,
): Record<HumanDimensionId, HumanDimension> {
  const craft = dimensions.craft_career;
  const wealth = dimensions.wealth;
  const nextCraft = clampPercentScore(
    craft.score + WEALTH_CRAFT_LINK * Math.max(0, wealth.score - craft.score),
  );
  const nextWealth = clampPercentScore(
    wealth.score + CRAFT_WEALTH_LINK * Math.max(0, craft.score - wealth.score),
  );

  return {
    ...dimensions,
    craft_career: { ...craft, score: nextCraft },
    wealth: { ...wealth, score: nextWealth },
  };
}

function practiceClockStarted(
  clocks: Record<HumanDimensionId, boolean>,
  id: HumanDimensionId,
): boolean {
  if (id === 'craft_career' || id === 'wealth') {
    return clocks.craft_career === true || clocks.wealth === true;
  }

  return clocks[id] === true;
}

/**
 * Calendar pass over every vector. A vector whose clock has not started
 * (never absorbed, or still waiting after the v3/v4 upgrade) leaves life still.
 * Craft and Wealth share a clock: practice on either moves both.
 */
export function advanceLifeDimensions(
  dimensions: Record<HumanDimensionId, HumanDimension>,
  journal: XpAbsorptionJournal,
  daysElapsed: number,
  asOf: string,
  clockStarted: Record<HumanDimensionId, boolean>,
  shadowEvents: readonly ShadowEvent[] = [],
  careerCeiling: number = CAREER_GATE_FIRST,
): Record<HumanDimensionId, HumanDimension> {
  if (daysElapsed <= 0) {
    return applyDimensionCaps(dimensions, careerCeiling);
  }

  const craftShare = computeNetDayShare(journal.craft_career, shadowEvents, 'craft_career', asOf);
  const wealthShare = computeNetDayShare(journal.wealth, shadowEvents, 'wealth', asOf);

  return applyDimensionCaps(
    HUMAN_DIMENSION_IDS.reduce(
      (next, id) => {
        const dimension = dimensions[id] ?? { id, score: 0, isGated: false };

        if (!practiceClockStarted(clockStarted, id)) {
          next[id] = dimension;
          return next;
        }

        const share =
          id === 'craft_career' || id === 'wealth'
            ? linkedDayShare(id, craftShare, wealthShare)
            : computeNetDayShare(journal[id], shadowEvents, id, asOf);
        next[id] = {
          ...dimension,
          score: advanceLifeScore(dimension.score, share, daysElapsed),
        };
        return next;
      },
      {} as Record<HumanDimensionId, HumanDimension>,
    ),
    careerCeiling,
  );
}
