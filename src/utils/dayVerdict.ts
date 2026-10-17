import { isOnAtomizerDay, type AtomizedTask, type ShadowEvent } from '@/types/grail';
import { isoWeekday } from '@/utils/taskTime';
import { shadowEventsOnDay } from '@/utils/weekLedger';

export const DAY_VERDICT_MAX = 5;

export type DayVerdictScore = 1 | 2 | 3 | 4 | 5;

export type DayVerdict =
  | { readonly kind: 'empty'; readonly sunday: boolean }
  | {
      readonly kind: 'scored';
      readonly score: DayVerdictScore;
      readonly absorbed: number;
      readonly total: number;
      readonly shadowCount: number;
    };

/**
 * Sealed reading of a calendar day. The desk is the judge: absorb vs burn and
 * leftover pending. Shadow is named, not scored — it never moves the mark.
 */
export function dayVerdict(
  tasks: readonly AtomizedTask[],
  dateKey: string,
  today: string,
  shadowEvents: readonly ShadowEvent[],
): DayVerdict {
  const dayTasks = tasks.filter((task) => isOnAtomizerDay(task, dateKey, today));
  const sunday = isoWeekday(dateKey) === 7;

  if (dayTasks.length === 0) {
    return { kind: 'empty', sunday };
  }

  const absorbed = dayTasks.filter((task) => task.ritualState === 'absorbed').length;
  const total = dayTasks.length;
  const ratio = absorbed / total;
  const score: DayVerdictScore =
    absorbed === total ? 5 : ratio >= 0.75 ? 4 : ratio >= 0.5 ? 3 : absorbed > 0 ? 2 : 1;

  return {
    kind: 'scored',
    score,
    absorbed,
    total,
    shadowCount: shadowEventsOnDay(shadowEvents, dateKey).length,
  };
}

export function dayVerdictLineKey(
  score: DayVerdictScore,
): 'verdict.line.1' | 'verdict.line.2' | 'verdict.line.3' | 'verdict.line.4' | 'verdict.line.5' {
  switch (score) {
    case 1:
      return 'verdict.line.1';
    case 2:
      return 'verdict.line.2';
    case 3:
      return 'verdict.line.3';
    case 4:
      return 'verdict.line.4';
    case 5:
      return 'verdict.line.5';
  }
}
