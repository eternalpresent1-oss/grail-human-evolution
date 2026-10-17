import { shadowEntry } from '@/constants/shadow';
import {
  atomizerDayOf,
  clampPercentScore,
  DISCIPLINE_RATE,
  DISCIPLINE_SCORE_DAYS,
  DISCIPLINE_SHADOW_PENALTY,
  DISCIPLINE_START_SCORE,
  DISCIPLINE_WINDOW_DAYS,
  PERCENT_SCORE_MAX,
  type AtomizedTask,
  type DayPromiseRecord,
  type PromiseJournal,
  type ShadowEvent,
} from '@/types/grail';
import { calendarDaysBetween, shiftDateKey } from '@/utils/taskTime';
import { shadowEventsInWindow } from '@/utils/weekLedger';

export function emptyPromiseRecord(): DayPromiseRecord {
  return { promised: 0, kept: 0 };
}

export function keepRatio(record: DayPromiseRecord): number {
  if (record.promised <= 0) {
    return PERCENT_SCORE_MAX;
  }

  return clampPercentScore((record.kept / record.promised) * PERCENT_SCORE_MAX);
}

/**
 * Canon, custom and campaign atoms standing on this calendar day.
 * Absorbed counts as kept; pending and burned are still promised.
 */
export function measureDutyDay(
  tasks: readonly AtomizedTask[],
  dateKey: string,
  today: string,
): DayPromiseRecord {
  let promised = 0;
  let kept = 0;

  for (const task of tasks) {
    if (atomizerDayOf(task, today) !== dateKey) {
      continue;
    }

    promised += 1;
    if (task.ritualState === 'absorbed') {
      kept += 1;
    }
  }

  return { promised, kept };
}

export function inferLifeStart(
  tasks: readonly AtomizedTask[],
  _journal: PromiseJournal,
  today: string,
  firstOpenOn?: string,
): string {
  let start = today;

  for (const task of tasks) {
    const day = atomizerDayOf(task, today);
    // A still-pending atom on an earlier calendar day was never closed.
    // It is not a lived day, so it must not pull the first open down to 0.
    // A promise-journal date alone is not a lived day either: the canon tick
    // writes those rows, and they were switching the first day off while the
    // atoms themselves were already gone.
    if (day === undefined || day >= start || task.ritualState === 'pending') {
      continue;
    }

    if (firstOpenOn !== undefined && day < firstOpenOn) {
      continue;
    }

    start = day;
  }

  return start;
}

/**
 * Resting 50, plus one equal share per kept atom, minus one share per burn.
 * `asOf` is the live calendar day used only to place atoms; `day` is the day
 * being scored. For the live reading they are the same. For a past chronicle
 * day, pass the sealed date as `day` and the real today as `asOf`, so today's
 * desk never leaks into yesterday's mark.
 */
function dayShareScore(
  tasks: readonly AtomizedTask[],
  day: string,
  asOf: string,
): number {
  let promised = 0;
  let kept = 0;
  let burned = 0;

  for (const task of tasks) {
    if (atomizerDayOf(task, asOf) !== day) {
      continue;
    }

    promised += 1;
    if (task.ritualState === 'absorbed') {
      kept += 1;
    } else if (task.ritualState === 'burned') {
      burned += 1;
    }
  }

  if (promised <= 0) {
    return DISCIPLINE_START_SCORE;
  }

  const share = (PERCENT_SCORE_MAX - DISCIPLINE_START_SCORE) / promised;
  return clampPercentScore(DISCIPLINE_START_SCORE + share * (kept - burned));
}

/** Today's discipline. The same share rule every day, moving on each keep or burn. */
export function computeDayDisciplineScore(input: {
  readonly tasks: readonly AtomizedTask[];
  readonly today: string;
  readonly shadowEvents?: readonly ShadowEvent[];
}): number {
  return withDisciplineShadow(
    dayShareScore(input.tasks, input.today, input.today),
    input.shadowEvents,
    input.today,
  );
}

/**
 * Sealed chronicle reading for one past calendar day. Uses the same share
 * rule as {@link computeDayDisciplineScore}, but places atoms against the
 * real today so the live desk cannot rewrite that day's mark.
 */
export function computeHistoricalDayDisciplineScore(input: {
  readonly tasks: readonly AtomizedTask[];
  readonly day: string;
  readonly today: string;
  readonly shadowEvents?: readonly ShadowEvent[];
}): number {
  return withDisciplineShadow(
    dayShareScore(input.tasks, input.day, input.today),
    input.shadowEvents,
    input.day,
  );
}

function dayDutyPercent(
  tasks: readonly AtomizedTask[],
  dateKey: string,
  today: string,
): number | null {
  const record = measureDutyDay(tasks, dateKey, today);
  if (record.promised <= 0) {
    return null;
  }

  return keepRatio(record);
}

/**
 * Life discipline averages the keep ratio of closed days in the last seven.
 * Today joins that average the same day only when every atom is kept.
 * A partial day does not move this number, including the first open day:
 * with nothing closed yet it rests at 50. The live share rule belongs to
 * {@link computeDayDisciplineScore}.
 * A day with no atoms is skipped. Days before the first open are not padded in.
 * A hanging “broke word” shadow takes {@link DISCIPLINE_SHADOW_PENALTY} off
 * that reading, so a perfect day still cannot rise above 90.
 */
export function computeDisciplineScore(input: {
  readonly tasks: readonly AtomizedTask[];
  readonly today: string;
  readonly journal?: PromiseJournal;
  readonly firstOpenOn?: string;
  readonly shadowEvents?: readonly ShadowEvent[];
}): number {
  const start = inferLifeStart(
    input.tasks,
    input.journal ?? {},
    input.today,
    input.firstOpenOn,
  );
  const todayRecord = measureDutyDay(input.tasks, input.today, input.today);
  const todayFullyKept = todayRecord.promised > 0 && todayRecord.kept === todayRecord.promised;
  const scores: number[] = [];

  for (let offset = 0; offset < DISCIPLINE_SCORE_DAYS; offset += 1) {
    const day = shiftDateKey(input.today, -offset);
    if (day < start || (day === input.today && !todayFullyKept)) {
      continue;
    }

    const percent = dayDutyPercent(input.tasks, day, input.today);
    if (percent !== null) {
      scores.push(percent);
    }
  }

  if (scores.length === 0) {
    return withDisciplineShadow(DISCIPLINE_START_SCORE, input.shadowEvents, input.today);
  }

  const total = scores.reduce((sum, value) => sum + value, 0);
  return withDisciplineShadow(
    clampPercentScore(total / scores.length),
    input.shadowEvents,
    input.today,
  );
}

/** Flat −10 while a discipline-hitting shadow is still in the seven-day window. */
export function disciplineShadowPenalty(
  events: readonly ShadowEvent[] | undefined,
  asOf: string,
): number {
  if (events === undefined) {
    return 0;
  }

  for (const event of shadowEventsInWindow(events, asOf)) {
    if (shadowEntry(event.catalogId).hitsDiscipline) {
      return DISCIPLINE_SHADOW_PENALTY;
    }
  }

  return 0;
}

function withDisciplineShadow(
  score: number,
  events: readonly ShadowEvent[] | undefined,
  asOf: string,
): number {
  return clampPercentScore(score - disciplineShadowPenalty(events, asOf));
}

export function advanceDisciplineScore(
  score: number,
  record: DayPromiseRecord,
  days = 1,
): number {
  if (days <= 0 || record.promised <= 0) {
    return clampPercentScore(score);
  }

  const share = keepRatio(record);
  const current = clampPercentScore(score);

  if (days === 1) {
    return clampPercentScore(current + DISCIPLINE_RATE * (share - current));
  }

  return clampPercentScore(share + (current - share) * Math.exp(-DISCIPLINE_RATE * days));
}

/** Inverse of one missed promise (`promised: 1, kept: 0`) at {@link DISCIPLINE_RATE}. */
export function retractDisciplineMiss(score: number): number {
  if (DISCIPLINE_RATE >= 1) {
    return clampPercentScore(score);
  }

  return clampPercentScore(score / (1 - DISCIPLINE_RATE));
}

export function writePromiseDay(
  journal: PromiseJournal,
  dateKey: string,
  record: DayPromiseRecord,
): PromiseJournal {
  if (record.promised <= 0 && record.kept <= 0) {
    const next = { ...journal };
    delete next[dateKey];
    return next;
  }

  return { ...journal, [dateKey]: record };
}

export function trimPromiseJournal(journal: PromiseJournal, asOf: string): PromiseJournal {
  const trimmed: PromiseJournal = {};

  for (const [key, record] of Object.entries(journal)) {
    if (calendarDaysBetween(key, asOf) < DISCIPLINE_WINDOW_DAYS) {
      trimmed[key] = record;
    }
  }

  return trimmed;
}

export function weekKeepRatio(journal: PromiseJournal, weekStart: string): number {
  let promised = 0;
  let kept = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const record = journal[shiftDateKey(weekStart, offset)];
    if (record === undefined) {
      continue;
    }

    promised += record.promised;
    kept += record.kept;
  }

  if (promised <= 0) {
    return 1;
  }

  return kept / promised;
}
