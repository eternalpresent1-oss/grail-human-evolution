import {
  MAX_METHOD_SIGNAL_NOTE,
  MAX_METHOD_SIGNALS,
  defaultDailyMethodSignal,
  defaultMethodSignals,
  type DailyMethodSignal,
  type MethodSignalItem,
  type MethodSignals,
} from '@/types/methodSignals';
import { createMethodSignalId } from '@/utils/ids';
import { isIsoDateKey, localDateKey, parseDeadlineMinutes } from '@/utils/taskTime';

export const DAILY_METHOD_SIGNAL_ID = 'grail-method-daily';

export type MethodSignalPlan =
  | {
      readonly kind: 'once';
      readonly identifier: string;
      readonly fireAt: Date;
      readonly note: string;
    }
  | {
      readonly kind: 'daily';
      readonly identifier: string;
      readonly hour: number;
      readonly minute: number;
      readonly note: string;
    };

export function sanitizeClock(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const minutes = parseDeadlineMinutes(value.trim().replace('.', ':'));
  if (minutes === null) {
    return fallback;
  }

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function readEnabled(value: unknown, fallback: boolean): boolean {
  if (value === true) {
    return true;
  }

  if (value === false) {
    return false;
  }

  return fallback;
}

export function sanitizeSignalNote(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_METHOD_SIGNAL_NOTE);
}

function sanitizeItem(value: unknown, fallbackEnabled: boolean): MethodSignalItem | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  const raw = value as {
    readonly id?: unknown;
    readonly date?: unknown;
    readonly time?: unknown;
    readonly note?: unknown;
    readonly enabled?: unknown;
  };

  const date = typeof raw.date === 'string' && isIsoDateKey(raw.date) ? raw.date : null;
  const time = sanitizeClock(raw.time, '');

  if (date === null || time.length === 0) {
    return null;
  }

  const id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : createMethodSignalId();

  return {
    id,
    date,
    time,
    note: sanitizeSignalNote(raw.note),
    enabled: readEnabled(raw.enabled, fallbackEnabled),
  };
}

function migrateLegacyClocks(
  raw: {
    readonly morning?: unknown;
    readonly evening?: unknown;
    readonly sunday?: unknown;
  },
  enabled: boolean,
): readonly MethodSignalItem[] {
  const today = localDateKey();

  return [
    { id: 'migrated-morning', date: today, time: sanitizeClock(raw.morning, '08:00'), note: '', enabled },
    { id: 'migrated-evening', date: today, time: sanitizeClock(raw.evening, '21:00'), note: '', enabled },
    { id: 'migrated-sunday', date: today, time: sanitizeClock(raw.sunday, '10:00'), note: '', enabled },
  ];
}

function sanitizeDaily(value: unknown): DailyMethodSignal {
  const fallback = defaultDailyMethodSignal();

  if (value === null || typeof value !== 'object') {
    return fallback;
  }

  const raw = value as {
    readonly enabled?: unknown;
    readonly time?: unknown;
  };

  return {
    enabled: raw.enabled === true,
    time: sanitizeClock(raw.time, fallback.time),
  };
}

export function sanitizeMethodSignals(value: unknown): MethodSignals {
  if (value === null || typeof value !== 'object') {
    return defaultMethodSignals();
  }

  const raw = value as {
    readonly enabled?: unknown;
    readonly daily?: unknown;
    readonly items?: unknown;
    readonly morning?: unknown;
    readonly evening?: unknown;
    readonly sunday?: unknown;
  };

  const masterEnabled = raw.enabled === true;
  const daily = sanitizeDaily(raw.daily);

  const fromItems = Array.isArray(raw.items)
    ? raw.items
        .map((item) => sanitizeItem(item, masterEnabled))
        .filter((item): item is MethodSignalItem => item !== null)
        .slice(0, MAX_METHOD_SIGNALS)
    : null;

  if (fromItems !== null) {
    return {
      enabled: masterEnabled,
      daily,
      items: fromItems,
    };
  }

  if (raw.morning !== undefined || raw.evening !== undefined || raw.sunday !== undefined) {
    const items = migrateLegacyClocks(raw, masterEnabled);
    return {
      enabled: items.some((item) => item.enabled),
      daily,
      items,
    };
  }

  return {
    enabled: false,
    daily,
    items: [],
  };
}

export function splitClock(value: string): { hour: number; minute: number } {
  const minutes = parseDeadlineMinutes(value) ?? 0;
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}

/** Local calendar day + clock. Avoids the UTC trap of `YYYY-MM-DDTHH:mm`. */
export function methodSignalFireAt(date: string, time: string): Date | null {
  if (!isIsoDateKey(date)) {
    return null;
  }

  const [yearToken, monthToken, dayToken] = date.split('-');
  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const clock = splitClock(time);
  return new Date(year, month - 1, day, clock.hour, clock.minute, 0, 0);
}

/** Next local clock-match for a repeating daily signal. */
export function nextDailyFireAt(time: string, now: Date = new Date()): Date | null {
  const minutes = parseDeadlineMinutes(time);
  if (minutes === null) {
    return null;
  }

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * One-shot local fires that are still in the future, plus the repeating daily
 * signal when it is on. Past dated fires are skipped.
 */
export function planMethodSignals(
  signals: MethodSignals,
  now: Date = new Date(),
): readonly MethodSignalPlan[] {
  const dated =
    signals.enabled !== true
      ? []
      : signals.items.flatMap((item): readonly MethodSignalPlan[] => {
          if (!item.enabled) {
            return [];
          }

          const fireAt = methodSignalFireAt(item.date, item.time);
          if (fireAt === null || fireAt.getTime() <= now.getTime()) {
            return [];
          }

          return [
            {
              kind: 'once',
              identifier: `grail-method-${item.id}`,
              fireAt,
              note: item.note,
            },
          ];
        });

  if (!signals.daily.enabled) {
    return dated;
  }

  const clock = splitClock(signals.daily.time);
  return [
    {
      kind: 'daily',
      identifier: DAILY_METHOD_SIGNAL_ID,
      hour: clock.hour,
      minute: clock.minute,
      note: '',
    },
    ...dated,
  ];
}

export function methodSignalIdentifiers(plan: readonly MethodSignalPlan[]): readonly string[] {
  return plan.map((item) => item.identifier);
}

/** Default stamp for a newly added signal: one hour from now, so it can still fire today. */
export function defaultSignalStamp(now: Date = new Date()): { date: string; time: string } {
  const next = new Date(now.getTime() + 60 * 60 * 1000);
  const time = `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
  return { date: localDateKey(next), time };
}
