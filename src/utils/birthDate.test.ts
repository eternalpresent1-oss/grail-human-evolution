import {
  approximateBirthDateFromAge,
  computeAge,
  formatBirthDate,
  isPlausibleBirthDate,
  parseBirthDate,
} from '@/utils/birthDate';

describe('parseBirthDate', () => {
  it('parses a padded local date', () => {
    expect(parseBirthDate('1994-07-09')).toEqual({ year: 1994, month: 7, day: 9 });
  });

  it('rejects a date that no calendar has', () => {
    expect(parseBirthDate('1994-02-31')).toBeNull();
    expect(parseBirthDate('1994-13-01')).toBeNull();
    expect(parseBirthDate('1994-00-10')).toBeNull();
    expect(parseBirthDate('09.07.1994')).toBeNull();
  });

  it('accepts 29 February in a leap year and refuses it otherwise', () => {
    expect(parseBirthDate('1996-02-29')).not.toBeNull();
    expect(parseBirthDate('1997-02-29')).toBeNull();
  });
});

describe('formatBirthDate', () => {
  it('pads the month and the day', () => {
    expect(formatBirthDate({ year: 1994, month: 7, day: 9 })).toBe('1994-07-09');
  });
});

describe('computeAge', () => {
  const today = new Date(2026, 8, 7);

  it('counts full years only', () => {
    expect(computeAge('1994-09-07', today)).toBe(32);
    expect(computeAge('1994-09-08', today)).toBe(31);
    expect(computeAge('1994-12-31', today)).toBe(31);
  });

  it('moves on its own as the calendar does', () => {
    expect(computeAge('1994-09-07', new Date(2027, 8, 7))).toBe(33);
  });

  it('treats an unusable date as no age rather than as NaN', () => {
    expect(computeAge('', today)).toBe(0);
    expect(computeAge('вчера', today)).toBe(0);
  });
});

describe('isPlausibleBirthDate', () => {
  const today = new Date(2026, 8, 7);

  it('refuses the future and the implausibly distant past', () => {
    expect(isPlausibleBirthDate({ year: 2027, month: 1, day: 1 }, today)).toBe(false);
    expect(isPlausibleBirthDate({ year: 1899, month: 1, day: 1 }, today)).toBe(false);
    expect(isPlausibleBirthDate({ year: 1994, month: 7, day: 9 }, today)).toBe(true);
  });

  it('accepts today as a date of birth, absurd as it is', () => {
    expect(isPlausibleBirthDate({ year: 2026, month: 9, day: 7 }, today)).toBe(true);
  });
});

describe('approximateBirthDateFromAge', () => {
  const today = new Date(2026, 8, 7);

  it('counts the stored age back from today so derived age matches exactly', () => {
    expect(approximateBirthDateFromAge(28, today)).toBe('1998-09-07');
    expect(computeAge(approximateBirthDateFromAge(28, today), today)).toBe(28);
  });

  it('clamps nonsense a legacy snapshot might carry', () => {
    expect(approximateBirthDateFromAge(-5, today)).toBe('2026-09-07');
    expect(approximateBirthDateFromAge(400, today)).toBe('1906-09-07');
  });

  it('folds 29 February onto the 28th in a non-leap target year', () => {
    const leapDay = new Date(2024, 1, 29);
    expect(approximateBirthDateFromAge(1, leapDay)).toBe('2023-02-28');
    expect(computeAge(approximateBirthDateFromAge(1, leapDay), leapDay)).toBe(1);
  });
});
