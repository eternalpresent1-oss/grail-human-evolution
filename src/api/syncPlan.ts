const HELD_BACK = ['aiApiKey', 'proofBackgroundUri'] as const;

const SYNC_KEYS = [
  'profile',
  'tasks',
  'viewMode',
  'language',
  'surveyAnswers',
  'surveyApplied',
  'shadowEvents',
  'driveLine',
  'campaigns',
  'methodSignals',
  'talents',
  'counselThread',
  'lifeVectorReading',
  'achievements',
  'disciplineCompleted',
  'soundEnabled',
  'musicEnabled',
  'disciplineBeacon',
  'breathAwardedOn',
] as const;

export type SyncPlan =
  | { action: 'push'; revision: number }
  | { action: 'pull' }
  | { action: 'keep' };

export function planSync(localRevision: number, remoteRevision: number): SyncPlan {
  if (remoteRevision > localRevision) {
    return { action: 'pull' };
  }
  if (localRevision === 0 && remoteRevision === 0) {
    return { action: 'push', revision: 1 };
  }
  if (localRevision > remoteRevision) {
    return { action: 'push', revision: localRevision };
  }
  return { action: 'keep' };
}

export function payloadForServer(state: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    if (key in state) {
      payload[key] = state[key];
    }
  }
  return payload;
}

export function payloadFromServer(
  current: Record<string, unknown>,
  incoming: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (incoming === null || !('profile' in incoming) || !('tasks' in incoming)) {
    return null;
  }
  const next: Record<string, unknown> = { ...current };
  for (const key of SYNC_KEYS) {
    if (key in incoming) {
      next[key] = incoming[key];
    }
  }
  for (const key of HELD_BACK) {
    if (key in current) {
      next[key] = current[key];
    }
  }
  return next;
}
