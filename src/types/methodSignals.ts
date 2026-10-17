export const MAX_METHOD_SIGNALS = 8;
export const MAX_METHOD_SIGNAL_NOTE = 80;

export const DEFAULT_DAILY_SIGNAL_TIME = '08:00';

/** Repeats every local day at `time` while `enabled` is on. */
export interface DailyMethodSignal {
  readonly enabled: boolean;
  readonly time: string;
}

/** One local fire: the person types the date, the clock and a short reminder. */
export interface MethodSignalItem {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly note: string;
  readonly enabled: boolean;
}

/** Dated signals; `enabled` is the master mute for every phone fire. */
export interface MethodSignals {
  readonly enabled: boolean;
  readonly daily: DailyMethodSignal;
  readonly items: readonly MethodSignalItem[];
}

export function defaultDailyMethodSignal(): DailyMethodSignal {
  return {
    enabled: false,
    time: DEFAULT_DAILY_SIGNAL_TIME,
  };
}

export function defaultMethodSignals(): MethodSignals {
  return {
    enabled: false,
    daily: defaultDailyMethodSignal(),
    items: [],
  };
}
