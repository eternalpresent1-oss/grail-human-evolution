import {
  HUMAN_DIMENSION_IDS,
  type HumanDimensionId,
  type ShadowEvent,
  type UserProfile,
  type AtomizedTask,
} from '@/types/grail';
import { computeDisciplineScore } from '@/utils/discipline';
import { isoWeekday, shiftDateKey } from '@/utils/taskTime';
import { computeAllShadowShares } from '@/utils/weekLedger';

/**
 * Field snapshot at the close of a Sun–Sat method week. Keyed by that week's
 * opening Sunday in `weekFieldMarks`. Stamped once on the following Sunday
 * morning so Sunday work stays in the new week and does not rewrite Became.
 */
export interface WeekFieldMark {
  readonly stampedOn: string;
  readonly dimensions: Readonly<Record<HumanDimensionId, number>>;
  readonly lifeDiscipline: number;
  readonly shadowAverage: number;
}

export type WeekFieldMarks = Readonly<Record<string, WeekFieldMark>>;

/** Sunday that opens the Sun–Sat method week containing `dateKey`. */
export function weekSundayOf(dateKey: string): string {
  const dow = isoWeekday(dateKey);
  return shiftDateKey(dateKey, dow === 7 ? 0 : -dow);
}

/** Saturday that closes the method week opened by `weekSunday`. */
export function weekSaturdayOfSunday(weekSunday: string): string {
  return shiftDateKey(weekSunday, 6);
}

/**
 * On Sunday `sundayDate`, Method reviews the week that just closed:
 * previous Sunday … Saturday (yesterday when `sundayDate` is today).
 */
export function methodReviewWeekSunday(sundayDate: string): string {
  return shiftDateKey(sundayDate, -7);
}

export function averageShadowShare(events: readonly ShadowEvent[], asOf: string): number {
  const shares = computeAllShadowShares(events, asOf);
  const total = HUMAN_DIMENSION_IDS.reduce((sum, id) => sum + (shares[id] ?? 0), 0);
  return total / Math.max(HUMAN_DIMENSION_IDS.length, 1);
}

export function captureWeekFieldMark(input: {
  readonly profile: UserProfile;
  readonly tasks: readonly AtomizedTask[];
  readonly shadowEvents: readonly ShadowEvent[];
  readonly asOf: string;
}): WeekFieldMark {
  const dimensions = HUMAN_DIMENSION_IDS.reduce(
    (next, id) => {
      next[id] = input.profile.dimensions[id]?.score ?? 0;
      return next;
    },
    {} as Record<HumanDimensionId, number>,
  );

  return {
    stampedOn: input.asOf,
    dimensions,
    lifeDiscipline: computeDisciplineScore({
      tasks: input.tasks,
      today: input.asOf,
      shadowEvents: input.shadowEvents,
    }),
    shadowAverage: averageShadowShare(input.shadowEvents, input.asOf),
  };
}

/**
 * On Sunday, stamps the closed week (opened seven days ago) once.
 * Other weekdays leave marks unchanged. Life/day formulas are untouched.
 */
export function ensureSundayFieldMark(
  marks: WeekFieldMarks,
  input: {
    readonly profile: UserProfile;
    readonly tasks: readonly AtomizedTask[];
    readonly shadowEvents: readonly ShadowEvent[];
    readonly today: string;
  },
): WeekFieldMarks {
  if (isoWeekday(input.today) !== 7) {
    return marks;
  }

  const closedWeekSunday = methodReviewWeekSunday(input.today);
  if (marks[closedWeekSunday] !== undefined) {
    return marks;
  }

  return {
    ...marks,
    [closedWeekSunday]: captureWeekFieldMark({
      profile: input.profile,
      tasks: input.tasks,
      shadowEvents: input.shadowEvents,
      asOf: input.today,
    }),
  };
}

export interface MethodWeekRow {
  readonly id: string;
  readonly kind: 'dimension' | 'life' | 'shadow';
  readonly dimensionId?: HumanDimensionId;
  readonly was: number | null;
  readonly became: number | null;
}

export interface MethodWeekTable {
  readonly weekSunday: string;
  readonly weekSaturday: string;
  readonly rows: readonly MethodWeekRow[];
}

/**
 * Builds Was/Became rows for Method of the week on a Sunday.
 * Was = stamped end of the week before last (dash if missing).
 * Became = live field when `liveBecame` is passed (today’s reading);
 * otherwise the stamped end of the week just closed.
 */
export function methodWeekTable(
  marks: WeekFieldMarks,
  sundayDate: string,
  liveBecame?: WeekFieldMark | null,
): MethodWeekTable {
  const weekSunday = methodReviewWeekSunday(sundayDate);
  const weekSaturday = weekSaturdayOfSunday(weekSunday);
  const priorWeekSunday = methodReviewWeekSunday(weekSunday);
  const was = marks[priorWeekSunday];
  const became = liveBecame ?? marks[weekSunday] ?? null;

  const rows: MethodWeekRow[] = [
    ...HUMAN_DIMENSION_IDS.map(
      (id): MethodWeekRow => ({
        id,
        kind: 'dimension',
        dimensionId: id,
        was: was?.dimensions[id] ?? null,
        became: became?.dimensions[id] ?? null,
      }),
    ),
    {
      id: 'life',
      kind: 'life',
      was: was?.lifeDiscipline ?? null,
      became: became?.lifeDiscipline ?? null,
    },
    {
      id: 'shadow',
      kind: 'shadow',
      was: was?.shadowAverage ?? null,
      became: became?.shadowAverage ?? null,
    },
  ];

  return { weekSunday, weekSaturday, rows };
}
