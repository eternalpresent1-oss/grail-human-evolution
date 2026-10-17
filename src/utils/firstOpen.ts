import {
  atomizerDayOf,
  type AtomizedTask,
  type PromiseJournal,
  type ShadowEvent,
  type UserProfile,
} from '@/types/grail';
import { computeDisciplineScore } from '@/utils/discipline';
import { isIsoDateKey, weekMondayOf } from '@/utils/taskTime';

/**
 * Monday of the week that contains the first launch.
 * Earlier weeks are not part of this life.
 */
export function chronicleWeekStart(firstOpenOn: string): string {
  return weekMondayOf(firstOpenOn);
}

/** True when `dateKey` sits in a week before the first launch. */
export function isBeforeChronicle(dateKey: string, firstOpenOn: string): boolean {
  return dateKey < chronicleWeekStart(firstOpenOn);
}

function earliestAbsorbedDay(tasks: readonly AtomizedTask[], today: string): string | undefined {
  let earliest: string | undefined;

  for (const task of tasks) {
    if (task.ritualState !== 'absorbed') {
      continue;
    }

    const day = atomizerDayOf(task, today) ?? task.scheduledOn;
    if (day === undefined || !isIsoDateKey(day)) {
      continue;
    }

    if (earliest === undefined || day < earliest) {
      earliest = day;
    }
  }

  return earliest;
}

/**
 * The day this life actually started.
 * A kept atom pins it. Otherwise it is the last day the app was open:
 * canon burned onto earlier weekdays was never lived.
 */
export function resolveFirstOpenOn(
  profile: Pick<UserProfile, 'firstOpenOn' | 'lastDecayDate'>,
  tasks: readonly AtomizedTask[],
  today: string,
): string {
  if (profile.firstOpenOn !== undefined && isIsoDateKey(profile.firstOpenOn)) {
    return profile.firstOpenOn;
  }

  return earliestAbsorbedDay(tasks, today) ??
    (isIsoDateKey(profile.lastDecayDate) ? profile.lastDecayDate : today);
}

export function omitCanonBeforeOpen(
  tasks: readonly AtomizedTask[],
  firstOpenOn: string,
): AtomizedTask[] {
  return tasks.filter(
    (task) => task.kind !== 'canon' || (task.scheduledOn ?? '') >= firstOpenOn,
  );
}

export function omitJournalBeforeOpen(journal: PromiseJournal, firstOpenOn: string): PromiseJournal {
  const next: PromiseJournal = {};

  for (const [day, record] of Object.entries(journal)) {
    if (day >= firstOpenOn) {
      next[day] = record;
    }
  }

  return next;
}

export function applyFirstOpen(input: {
  readonly firstOpenOn: string | undefined;
  readonly lastDecayDate: string;
  readonly tasks: readonly AtomizedTask[];
  readonly journal: PromiseJournal;
  readonly today: string;
}): {
  readonly firstOpenOn: string;
  readonly tasks: AtomizedTask[];
  readonly journal: PromiseJournal;
} {
  const firstOpenOn = resolveFirstOpenOn(
    input.firstOpenOn === undefined
      ? { lastDecayDate: input.lastDecayDate }
      : { firstOpenOn: input.firstOpenOn, lastDecayDate: input.lastDecayDate },
    input.tasks,
    input.today,
  );

  return {
    firstOpenOn,
    tasks: omitCanonBeforeOpen(input.tasks, firstOpenOn),
    journal: omitJournalBeforeOpen(input.journal, firstOpenOn),
  };
}

/** Writes the first-launch day and drops canon that was placed before it. */
export function anchorFirstOpen<T extends {
  readonly profile: UserProfile;
  readonly tasks: readonly AtomizedTask[];
  readonly shadowEvents: readonly ShadowEvent[];
}>(state: T, today: string): T {
  const anchored = applyFirstOpen({
    firstOpenOn: state.profile.firstOpenOn,
    lastDecayDate: state.profile.lastDecayDate,
    tasks: state.tasks,
    journal: state.profile.promiseJournal,
    today,
  });
  const stripped =
    anchored.tasks.length !== state.tasks.length ||
    Object.keys(anchored.journal).length !== Object.keys(state.profile.promiseJournal).length;

  return {
    ...state,
    tasks: anchored.tasks,
    profile: {
      ...state.profile,
      firstOpenOn: anchored.firstOpenOn,
      promiseJournal: anchored.journal,
      disciplineScore: stripped
        ? computeDisciplineScore({
            tasks: anchored.tasks,
            today,
            journal: anchored.journal,
            firstOpenOn: anchored.firstOpenOn,
            shadowEvents: state.shadowEvents,
          })
        : state.profile.disciplineScore,
    },
  };
}
