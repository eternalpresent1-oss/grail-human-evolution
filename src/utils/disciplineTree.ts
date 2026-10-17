import {
  DISCIPLINE_STEP_IDS,
  type DisciplineNodeState,
  type DisciplineStepId,
} from '@/types/discipline';

export function isDisciplineStepId(value: number): value is DisciplineStepId {
  return (DISCIPLINE_STEP_IDS as readonly number[]).includes(value);
}

/** Sequential 1…n with no gaps. Junk and skips are dropped. */
export function sanitizeDisciplineCompleted(value: unknown): readonly DisciplineStepId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const present = new Set<DisciplineStepId>();
  for (const entry of value) {
    if (typeof entry === 'number' && isDisciplineStepId(entry)) {
      present.add(entry);
    }
  }

  const next: DisciplineStepId[] = [];
  for (const id of DISCIPLINE_STEP_IDS) {
    if (!present.has(id)) {
      break;
    }
    next.push(id);
  }

  return next;
}

export function activeDisciplineStep(
  completed: readonly DisciplineStepId[],
): DisciplineStepId | null {
  const next = completed.length + 1;
  return isDisciplineStepId(next) ? next : null;
}

export function disciplineNodeState(
  id: DisciplineStepId,
  completed: readonly DisciplineStepId[],
): DisciplineNodeState {
  if (completed.includes(id)) {
    return 'completed';
  }

  return activeDisciplineStep(completed) === id ? 'active' : 'locked';
}

export function withCompletedDisciplineStep(
  completed: readonly DisciplineStepId[],
  id: DisciplineStepId,
): readonly DisciplineStepId[] {
  if (disciplineNodeState(id, completed) !== 'active') {
    return completed;
  }

  return sanitizeDisciplineCompleted([...completed, id]);
}

/** Drops this step and every step after it, so the climb stays contiguous. */
export function withUncompletedDisciplineStep(
  completed: readonly DisciplineStepId[],
  id: DisciplineStepId,
): readonly DisciplineStepId[] {
  if (!completed.includes(id)) {
    return completed;
  }

  return completed.filter((step) => step < id);
}

/** Last completed step, or the active one, or the first step when the path is untouched. */
export function currentDisciplineStep(
  completed: readonly DisciplineStepId[],
): DisciplineStepId {
  return activeDisciplineStep(completed) ?? 10;
}

export function isDisciplineTreeComplete(
  completed: readonly DisciplineStepId[],
): boolean {
  return completed.length === DISCIPLINE_STEP_IDS.length;
}
