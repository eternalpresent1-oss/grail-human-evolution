import { shadowEntry } from '@/constants/shadow';
import {
  clampPercentScore,
  LIFE_WINDOW_DAYS,
  PERCENT_SCORE_MAX,
  WEEKLY_NORM_XP,
  type HumanDimensionId,
  type ShadowCatalogId,
  type ShadowEvent,
  type XpAbsorptionJournal,
} from '@/types/grail';
import { shiftDateKey } from '@/utils/taskTime';

function windowXp(days: Record<string, number>, asOf: string): number {
  let total = 0;

  for (let offset = 0; offset < LIFE_WINDOW_DAYS; offset += 1) {
    total += days[shiftDateKey(asOf, -offset)] ?? 0;
  }

  return total;
}

function windowShadowXp(
  events: readonly ShadowEvent[],
  dimensionId: HumanDimensionId,
  asOf: string,
): number {
  const start = shiftDateKey(asOf, -(LIFE_WINDOW_DAYS - 1));
  let total = 0;

  for (const event of events) {
    if (event.occurredOn < start || event.occurredOn > asOf) {
      continue;
    }

    const entry = shadowEntry(event.catalogId);
    if (!entry.dimensionIds.includes(dimensionId)) {
      continue;
    }

    total += entry.xpCost;
  }

  return total;
}

/**
 * How much of one vector's weekly norm the shadow ate in the last seven days.
 */
export function computeShadowShare(
  events: readonly ShadowEvent[],
  dimensionId: HumanDimensionId,
  asOf: string,
): number {
  const xp = windowShadowXp(events, dimensionId, asOf);
  if (!Number.isFinite(xp) || WEEKLY_NORM_XP <= 0) {
    return 0;
  }

  return clampPercentScore((xp / WEEKLY_NORM_XP) * PERCENT_SCORE_MAX);
}

export function computeAllShadowShares(
  events: readonly ShadowEvent[],
  asOf: string,
): Record<HumanDimensionId, number> {
  return {
    physical: computeShadowShare(events, 'physical', asOf),
    intellect: computeShadowShare(events, 'intellect', asOf),
    mind_psyche: computeShadowShare(events, 'mind_psyche', asOf),
    drive: computeShadowShare(events, 'drive', asOf),
    craft_career: computeShadowShare(events, 'craft_career', asOf),
    wealth: computeShadowShare(events, 'wealth', asOf),
    social: computeShadowShare(events, 'social', asOf),
    spirit: computeShadowShare(events, 'spirit', asOf),
  };
}

export interface ShadowCatalogTally {
  readonly catalogId: ShadowEvent['catalogId'];
  readonly count: number;
  readonly occurredOn: readonly string[];
}

export function tallyShadowCatalog(
  events: readonly ShadowEvent[],
  asOf: string,
): readonly ShadowCatalogTally[] {
  const windowed = shadowEventsInWindow(events, asOf);
  const groups = new Map<ShadowEvent['catalogId'], string[]>();

  for (const event of windowed) {
    const occurredOn = groups.get(event.catalogId);
    if (occurredOn === undefined) {
      groups.set(event.catalogId, [event.occurredOn]);
      continue;
    }

    occurredOn.push(event.occurredOn);
  }

  return [...groups.entries()].map(([catalogId, occurredOn]) => ({
    catalogId,
    count: occurredOn.length,
    occurredOn,
  }));
}

/** Most recently logged confession of this kind inside the seven-day window. */
export function latestWindowShadow(
  events: readonly ShadowEvent[],
  catalogId: ShadowCatalogId,
  asOf: string,
): ShadowEvent | undefined {
  const windowed = shadowEventsInWindow(events, asOf);

  for (let index = windowed.length - 1; index >= 0; index -= 1) {
    const event = windowed[index];
    if (event !== undefined && event.catalogId === catalogId) {
      return event;
    }
  }

  return undefined;
}

/**
 * Share of the weekly norm after shadow ate the same pocket:
 * `clamp((absorbed − shadow) / 45 × 100)`.
 */
export function computeNetDayShare(
  days: Record<string, number> | undefined,
  events: readonly ShadowEvent[],
  dimensionId: HumanDimensionId,
  asOf: string,
): number {
  const absorbed = windowXp(days ?? {}, asOf);
  const shadow = windowShadowXp(events, dimensionId, asOf);
  const net = Math.max(0, absorbed - shadow);

  if (!Number.isFinite(net) || WEEKLY_NORM_XP <= 0) {
    return 0;
  }

  return clampPercentScore((net / WEEKLY_NORM_XP) * PERCENT_SCORE_MAX);
}

export function computeAllNetDayShares(
  journal: XpAbsorptionJournal,
  events: readonly ShadowEvent[],
  asOf: string,
): Record<HumanDimensionId, number> {
  return {
    physical: computeNetDayShare(journal.physical, events, 'physical', asOf),
    intellect: computeNetDayShare(journal.intellect, events, 'intellect', asOf),
    mind_psyche: computeNetDayShare(journal.mind_psyche, events, 'mind_psyche', asOf),
    drive: computeNetDayShare(journal.drive, events, 'drive', asOf),
    craft_career: computeNetDayShare(journal.craft_career, events, 'craft_career', asOf),
    wealth: computeNetDayShare(journal.wealth, events, 'wealth', asOf),
    social: computeNetDayShare(journal.social, events, 'social', asOf),
    spirit: computeNetDayShare(journal.spirit, events, 'spirit', asOf),
  };
}

export function shadowEventsOnDay(
  events: readonly ShadowEvent[],
  dateKey: string,
): readonly ShadowEvent[] {
  return events.filter((event) => event.occurredOn === dateKey);
}

export function shadowEventsInWindow(
  events: readonly ShadowEvent[],
  asOf: string,
  windowDays: number = LIFE_WINDOW_DAYS,
): readonly ShadowEvent[] {
  const start = shiftDateKey(asOf, -(windowDays - 1));
  return events.filter((event) => event.occurredOn >= start && event.occurredOn <= asOf);
}
