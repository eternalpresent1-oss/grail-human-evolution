import { type PromiseJournal, type ShadowEvent } from '@/types/grail';
import { shiftDateKey, weekMondayOf } from '@/utils/taskTime';

export interface WeekReview {
  readonly weekStart: string;
  readonly promised: number;
  readonly kept: number;
  readonly shadowCount: number;
}

/**
 * Canon of the ISO week that contains `asOf` (Monday–Saturday). Sunday has
 * no canon, so this is what the weekly method reads.
 */
export function weekReview(
  journal: PromiseJournal,
  events: readonly ShadowEvent[],
  asOf: string,
): WeekReview {
  const weekStart = weekMondayOf(asOf);
  let promised = 0;
  let kept = 0;

  for (let offset = 0; offset < 6; offset += 1) {
    const record = journal[shiftDateKey(weekStart, offset)];
    if (record === undefined) {
      continue;
    }

    promised += record.promised;
    kept += record.kept;
  }

  const weekEnd = shiftDateKey(weekStart, 6);
  let shadowCount = 0;

  for (const event of events) {
    if (event.occurredOn >= weekStart && event.occurredOn <= weekEnd) {
      shadowCount += 1;
    }
  }

  return { weekStart, promised, kept, shadowCount };
}
