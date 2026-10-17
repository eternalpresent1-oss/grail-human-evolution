import { CANON_TEMPLATES } from '@/constants/canon';
import {
  CANON_WEEK_STREAK_RATIO,
  type AtomizedTask,
  type DayPromiseRecord,
  type PromiseJournal,
} from '@/types/grail';
import { weekKeepRatio, writePromiseDay, trimPromiseJournal, advanceDisciplineScore } from '@/utils/discipline';
import { calendarDaysBetween, shiftDateKey, weekMondayOf } from '@/utils/taskTime';

function canonTaskId(weekStart: string, dateKey: string, seedId: string): string {
  return `canon:${weekStart}:${dateKey}:${seedId}`;
}

export function generateCanonWeek(weekStart: string): AtomizedTask[] {
  const tasks: AtomizedTask[] = [];

  for (const template of CANON_TEMPLATES) {
    for (const weekday of template.weekdays) {
      const scheduledOn = shiftDateKey(weekStart, weekday - 1);
      const dualDimensionId = template.dualDimensionId;
      const task: AtomizedTask = {
        id: canonTaskId(weekStart, scheduledOn, template.seedId),
        content: { source: 'seed', seedId: template.seedId },
        dimensionId: template.dimensionId,
        kind: 'canon',
        ritualState: 'pending',
        isCompleted: false,
        isNonNegotiable: true,
        proofRequired: template.proofRequired,
        xpReward: template.xpReward,
        isOverdue: false,
        scheduledOn,
      };

      tasks.push(dualDimensionId === undefined ? task : { ...task, dualDimensionId });
    }
  }

  return tasks;
}

export function measureCanonDay(
  tasks: readonly AtomizedTask[],
  dateKey: string,
): DayPromiseRecord {
  let promised = 0;
  let kept = 0;

  for (const task of tasks) {
    if (task.kind !== 'canon' || task.scheduledOn !== dateKey) {
      continue;
    }

    promised += 1;
    if (task.ritualState === 'absorbed') {
      kept += 1;
    }
  }

  return { promised, kept };
}

/** Pending canon of a closed day is a missed duty — burned, not left hanging. */
export function missPendingCanon(
  tasks: readonly AtomizedTask[],
  dateKey: string,
): AtomizedTask[] {
  return tasks.map((task) => {
    if (task.kind !== 'canon' || task.scheduledOn !== dateKey || task.ritualState !== 'pending') {
      return task;
    }

    return {
      id: task.id,
      content: task.content,
      dimensionId: task.dimensionId,
      kind: task.kind,
      ritualState: 'burned' as const,
      isCompleted: false,
      isNonNegotiable: task.isNonNegotiable,
      proofRequired: task.proofRequired,
      xpReward: task.xpReward,
      isOverdue: false,
      scheduledOn: dateKey,
      ...(task.dualDimensionId === undefined ? {} : { dualDimensionId: task.dualDimensionId }),
      ...(task.timeDeadline === undefined ? {} : { timeDeadline: task.timeDeadline }),
    };
  });
}

export function dropCanonBefore(
  tasks: readonly AtomizedTask[],
  weekStart: string,
): AtomizedTask[] {
  return tasks.filter((task) => task.kind !== 'canon' || (task.scheduledOn ?? '') >= weekStart);
}

export function nextStreak(current: number, journal: PromiseJournal, weekStart: string): number {
  return weekKeepRatio(journal, weekStart) >= CANON_WEEK_STREAK_RATIO ? current + 1 : 0;
}

export function countCanonWeek(
  tasks: readonly AtomizedTask[],
  weekStart: string,
): {
  promised: number;
  kept: number;
} {
  const nextWeek = shiftDateKey(weekStart, 7);
  let promised = 0;
  let kept = 0;

  for (const task of tasks) {
    const day = task.scheduledOn ?? '';
    if (task.kind !== 'canon' || day < weekStart || day >= nextWeek) {
      continue;
    }

    promised += 1;
    if (task.ritualState === 'absorbed') {
      kept += 1;
    }
  }

  return { promised, kept };
}

function canonIdentity(task: AtomizedTask): string | undefined {
  if (task.kind !== 'canon' || task.content.source !== 'seed' || task.scheduledOn === undefined) {
    return undefined;
  }

  return `${task.scheduledOn}:${task.content.seedId}`;
}

function appendCanonWeek(tasks: readonly AtomizedTask[], weekStart: string): AtomizedTask[] {
  const prefix = `canon:${weekStart}:`;
  if (tasks.some((task) => task.id.startsWith(prefix))) {
    return [...tasks];
  }

  return [...tasks, ...generateCanonWeek(weekStart)];
}

/**
 * Weekdays from the first open through yesterday keep their canon.
 * A day the app was not opened is a missed duty, not an empty chronicle.
 * Sunday stays empty. Days before the first open are not invented.
 */
export function ensureClosedChronicle(
  tasks: readonly AtomizedTask[],
  firstOpenOn: string,
  today: string,
): AtomizedTask[] {
  if (firstOpenOn >= today) {
    return [...tasks];
  }

  const occupied = new Set<string>();
  for (const task of tasks) {
    const identity = canonIdentity(task);
    if (identity !== undefined) {
      occupied.add(identity);
    }
  }

  const extra: AtomizedTask[] = [];
  let weekStart = weekMondayOf(firstOpenOn);
  const yesterday = shiftDateKey(today, -1);

  while (weekStart <= yesterday) {
    for (const task of generateCanonWeek(weekStart)) {
      const day = task.scheduledOn;
      if (day === undefined || day < firstOpenOn || day >= today) {
        continue;
      }

      const identity = canonIdentity(task);
      if (identity === undefined || occupied.has(identity)) {
        continue;
      }

      const [burned] = missPendingCanon([task], day);
      if (burned !== undefined) {
        extra.push(burned);
        occupied.add(identity);
      }
    }

    weekStart = shiftDateKey(weekStart, 7);
  }

  return extra.length === 0 ? [...tasks] : [...tasks, ...extra];
}

export interface CanonTickResult {
  readonly tasks: readonly AtomizedTask[];
  readonly promiseJournal: PromiseJournal;
  readonly disciplineScore: number;
  readonly currentStreak: number;
  readonly canonWeekStart: string;
  readonly daysElapsed: number;
}

/**
 * Closes each elapsed calendar day: records the keep ratio, burns leftover
 * canon, and spawns a fresh week when Monday arrives.
 */
export function tickCanonCalendar(input: {
  readonly lastDecayDate: string;
  readonly today: string;
  readonly canonWeekStart: string;
  readonly promiseJournal: PromiseJournal;
  readonly disciplineScore: number;
  readonly currentStreak: number;
  readonly tasks: readonly AtomizedTask[];
}): CanonTickResult {
  const daysElapsed = calendarDaysBetween(input.lastDecayDate, input.today);

  if (daysElapsed <= 0) {
    return {
      tasks: input.tasks,
      promiseJournal: input.promiseJournal,
      disciplineScore: input.disciplineScore,
      currentStreak: input.currentStreak,
      canonWeekStart: input.canonWeekStart,
      daysElapsed: 0,
    };
  }

  let tasks = [...input.tasks];
  let promiseJournal = input.promiseJournal;
  let disciplineScore = input.disciplineScore;
  let currentStreak = input.currentStreak;
  let canonWeekStart = input.canonWeekStart;

  for (let offset = 0; offset < daysElapsed; offset += 1) {
    const closingDay = shiftDateKey(input.lastDecayDate, offset);
    const record = measureCanonDay(tasks, closingDay);
    promiseJournal = writePromiseDay(promiseJournal, closingDay, record);
    disciplineScore = advanceDisciplineScore(disciplineScore, record);
    tasks = missPendingCanon(tasks, closingDay);

    const nextMorning = shiftDateKey(closingDay, 1);
    const nextWeek = weekMondayOf(nextMorning);
    if (nextWeek !== canonWeekStart) {
      currentStreak = nextStreak(currentStreak, promiseJournal, canonWeekStart);
      // Keep every earlier week. The new week is laid in full; later steps of
      // this loop burn the days that already passed while the app was closed.
      tasks = appendCanonWeek(tasks, nextWeek);
      canonWeekStart = nextWeek;
    }
  }

  return {
    tasks,
    promiseJournal: trimPromiseJournal(promiseJournal, input.today),
    disciplineScore,
    currentStreak,
    canonWeekStart,
    daysElapsed,
  };
}
