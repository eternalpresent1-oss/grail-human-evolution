const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_FIRST_DATE_PATTERN = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;

export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** A new atom may stand on today or later. A past day is already sealed. */
export function isSchedulableDateKey(dateKey: string, today: string): boolean {
  return dateKey >= today;
}

/** `2026-09-17` → `17.09.2026`. */
export function formatEuropeanDate(dateKey: string): string {
  const match = ISO_DATE_PATTERN.exec(dateKey);
  const year = match?.[1];
  const month = match?.[2];
  const day = match?.[3];

  if (year === undefined || month === undefined || day === undefined) {
    return dateKey;
  }

  return `${day}.${month}.${year}`;
}

/** Unique European dates in the order they first appear. */
export function formatEuropeanDates(dateKeys: readonly string[]): string {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const dateKey of dateKeys) {
    const label = formatEuropeanDate(dateKey);
    if (seen.has(label)) {
      continue;
    }

    seen.add(label);
    labels.push(label);
  }

  return labels.join(', ');
}

/** True only for a real calendar day, not `2026-02-31`. */
export function isIsoDateKey(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  const yearToken = match?.[1];
  const monthToken = match?.[2];
  const dayToken = match?.[3];

  if (yearToken === undefined || monthToken === undefined || dayToken === undefined) {
    return false;
  }

  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/**
 * Accepts `YYYY-MM-DD` or a day-first date with `.` `/` or `-`.
 * Returns the ISO key, or `null`.
 */
export function parseIsoDateKey(value: string): string | null {
  const trimmed = value.trim();

  if (isIsoDateKey(trimmed)) {
    return trimmed;
  }

  const dayFirst = DAY_FIRST_DATE_PATTERN.exec(trimmed);
  const dayToken = dayFirst?.[1];
  const monthToken = dayFirst?.[2];
  const yearToken = dayFirst?.[3];

  if (dayToken === undefined || monthToken === undefined || yearToken === undefined) {
    return null;
  }

  const iso = `${yearToken}-${monthToken.padStart(2, '0')}-${dayToken.padStart(2, '0')}`;
  return isIsoDateKey(iso) ? iso : null;
}

/** Pads `8:00` to `08:00`. Empty input is a valid “no clock”. */
export function parseTypedClock(value: string): string | null | undefined {
  const trimmed = value.trim().replace('.', ':');

  if (trimmed.length === 0) {
    return undefined;
  }

  const minutes = parseDeadlineMinutes(trimmed);
  if (minutes === null) {
    return null;
  }

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Shifts a local `YYYY-MM-DD` by a whole number of calendar days. */
export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const ms = Date.parse(`${dateKey}T00:00:00`);
  if (Number.isNaN(ms)) {
    return dateKey;
  }

  const date = new Date(ms);
  date.setDate(date.getDate() + deltaDays);
  return localDateKey(date);
}

export function isoWeekday(dateKey: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const ms = Date.parse(`${dateKey}T00:00:00`);
  if (Number.isNaN(ms)) {
    return 1;
  }

  const sundayZeroth = new Date(ms).getDay();
  return (sundayZeroth === 0 ? 7 : sundayZeroth) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

/** Monday of the ISO week that contains `dateKey`. */
export function weekMondayOf(dateKey: string): string {
  return shiftDateKey(dateKey, 1 - isoWeekday(dateKey));
}

export function parseDeadlineMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  const hoursToken = match?.[1];
  const minutesToken = match?.[2];

  if (hoursToken === undefined || minutesToken === undefined) {
    return null;
  }

  return Number(hoursToken) * 60 + Number(minutesToken);
}

export function currentMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isDeadlinePassed(deadline: string, date: Date = new Date()): boolean {
  const target = parseDeadlineMinutes(deadline);
  if (target === null) {
    return false;
  }

  return currentMinutes(date) > target;
}

export function calendarDaysBetween(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00`);
  const to = Date.parse(`${toKey}T00:00:00`);

  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
    return 0;
  }

  return Math.round((to - from) / 86_400_000);
}
