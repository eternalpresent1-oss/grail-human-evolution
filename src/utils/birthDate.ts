/**
 * Age used to be a number frozen at first launch, which meant the character
 * level was computed against an age the user had years ago. It is derived from
 * a stored birth date now, so it moves on its own.
 */

const BIRTH_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Nobody using a habit tracker was born before this, and it keeps typos out. */
export const MIN_BIRTH_YEAR = 1900;
export const MAX_AGE_YEARS = 120;

export interface BirthDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export function formatBirthDate(parts: BirthDateParts): string {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');

  return `${parts.year}-${month}-${day}`;
}

/** Parses `YYYY-MM-DD`, rejecting impossible calendar dates such as 31 February. */
export function parseBirthDate(value: string): BirthDateParts | null {
  const match = BIRTH_DATE_PATTERN.exec(value);
  const yearToken = match?.[1];
  const monthToken = match?.[2];
  const dayToken = match?.[3];

  if (yearToken === undefined || monthToken === undefined || dayToken === undefined) {
    return null;
  }

  const parts: BirthDateParts = {
    year: Number(yearToken),
    month: Number(monthToken),
    day: Number(dayToken),
  };

  return isRealCalendarDate(parts) ? parts : null;
}

export function isRealCalendarDate(parts: BirthDateParts): boolean {
  if (parts.month < 1 || parts.month > 12 || parts.day < 1) {
    return false;
  }

  // Day 0 of the next month is the last day of this one, leap years included.
  const daysInMonth = new Date(parts.year, parts.month, 0).getDate();

  return parts.day <= daysInMonth;
}

/** True when the date is a real one and lands inside a plausible human lifespan. */
export function isPlausibleBirthDate(parts: BirthDateParts, today: Date = new Date()): boolean {
  if (parts.year < MIN_BIRTH_YEAR || !isRealCalendarDate(parts)) {
    return false;
  }

  const age = ageFromParts(parts, today);

  return age >= 0 && age <= MAX_AGE_YEARS;
}

export function computeAge(birthDate: string, today: Date = new Date()): number {
  const parts = parseBirthDate(birthDate);

  return parts === null ? 0 : Math.max(0, ageFromParts(parts, today));
}

/**
 * Best guess for a user upgrading from a build that only stored a number:
 * today minus that many years, so the age derived today equals the stored
 * figure exactly. Flagged as approximate so Settings can ask them to make it
 * exact. 29 February folds to the 28th in a non-leap target year.
 */
export function approximateBirthDateFromAge(age: number, today: Date = new Date()): string {
  const safeAge = Math.min(MAX_AGE_YEARS, Math.max(0, Math.round(age)));
  const year = today.getFullYear() - safeAge;
  const month = today.getMonth() + 1;
  const day = Math.min(today.getDate(), new Date(year, month, 0).getDate());

  return formatBirthDate({ year, month, day });
}

function ageFromParts(parts: BirthDateParts, today: Date): number {
  const years = today.getFullYear() - parts.year;
  const monthDelta = today.getMonth() + 1 - parts.month;
  const hasHadBirthday = monthDelta > 0 || (monthDelta === 0 && today.getDate() >= parts.day);

  return hasHadBirthday ? years : years - 1;
}
