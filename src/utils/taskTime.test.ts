import {
  calendarDaysBetween,
  currentMinutes,
  isIsoDateKey,
  isoWeekday,
  isDeadlinePassed,
  localDateKey,
  parseDeadlineMinutes,
  isSchedulableDateKey,
  formatEuropeanDate,
  formatEuropeanDates,
  parseIsoDateKey,
  parseTypedClock,
  shiftDateKey,
  weekMondayOf,
} from '@/utils/taskTime';

describe('localDateKey', () => {
  it('formats the local date as YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('parseDeadlineMinutes', () => {
  it('parses valid HH:mm values', () => {
    expect(parseDeadlineMinutes('08:00')).toBe(480);
    expect(parseDeadlineMinutes('14:30')).toBe(870);
    expect(parseDeadlineMinutes('23:59')).toBe(1_439);
  });

  it('rejects impossible clock values', () => {
    expect(parseDeadlineMinutes('24:00')).toBeNull();
    expect(parseDeadlineMinutes('12:60')).toBeNull();
    expect(parseDeadlineMinutes('полдень')).toBeNull();
  });
});

describe('currentMinutes', () => {
  it('counts minutes since local midnight', () => {
    expect(currentMinutes(new Date(2026, 0, 5, 7, 15))).toBe(435);
  });
});

describe('isDeadlinePassed', () => {
  const now = new Date(2026, 0, 5, 14, 31);

  it('is true once the clock is past the deadline', () => {
    expect(isDeadlinePassed('14:30', now)).toBe(true);
  });

  it('is false on and before the deadline minute', () => {
    expect(isDeadlinePassed('14:31', now)).toBe(false);
    expect(isDeadlinePassed('20:00', now)).toBe(false);
  });

  it('treats an unparsable deadline as not passed', () => {
    expect(isDeadlinePassed('позже', now)).toBe(false);
  });
});

describe('shiftDateKey', () => {
  it('moves a local date across month and year boundaries', () => {
    expect(shiftDateKey('2026-09-07', -1)).toBe('2026-09-06');
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDateKey('2025-12-31', 1)).toBe('2026-01-01');
  });
});

describe('weekMondayOf', () => {
  it('returns the Monday of the containing ISO week', () => {
    expect(isoWeekday('2026-09-07')).toBe(1);
    expect(isoWeekday('2026-09-13')).toBe(7);
    expect(weekMondayOf('2026-09-10')).toBe('2026-09-07');
    expect(weekMondayOf('2026-09-13')).toBe('2026-09-07');
  });
});

describe('calendarDaysBetween', () => {
  it('counts elapsed calendar days', () => {
    expect(calendarDaysBetween('2026-01-05', '2026-01-06')).toBe(1);
    expect(calendarDaysBetween('2026-01-05', '2026-01-12')).toBe(7);
  });

  it('spans month and year boundaries', () => {
    expect(calendarDaysBetween('2026-01-31', '2026-02-01')).toBe(1);
    expect(calendarDaysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('returns 0 for same-day and backwards ranges', () => {
    expect(calendarDaysBetween('2026-01-05', '2026-01-05')).toBe(0);
    expect(calendarDaysBetween('2026-01-06', '2026-01-05')).toBe(0);
    expect(calendarDaysBetween('не дата', '2026-01-05')).toBe(0);
  });
});

describe('isIsoDateKey', () => {
  it('accepts real calendar days and rejects the rest', () => {
    expect(isIsoDateKey('2026-02-28')).toBe(true);
    expect(isIsoDateKey('2026-02-31')).toBe(false);
    expect(isIsoDateKey('13.09.2026')).toBe(false);
  });
});

describe('isSchedulableDateKey', () => {
  const today = '2026-09-16';

  it('allows today and later, never a sealed day', () => {
    expect(isSchedulableDateKey(today, today)).toBe(true);
    expect(isSchedulableDateKey('2026-09-17', today)).toBe(true);
    expect(isSchedulableDateKey('2026-09-15', today)).toBe(false);
  });
});

describe('formatEuropeanDate', () => {
  it('prints day.month.year', () => {
    expect(formatEuropeanDate('2026-09-17')).toBe('17.09.2026');
    expect(formatEuropeanDate('2026-01-05')).toBe('05.01.2026');
    expect(formatEuropeanDate('2012-12-12')).toBe('12.12.2012');
  });

  it('keeps first-seen days and drops a second slip on the same date', () => {
    expect(formatEuropeanDates(['2026-09-10', '2026-09-17', '2026-09-10'])).toBe(
      '10.09.2026, 17.09.2026',
    );
  });
});

describe('parseIsoDateKey', () => {
  it('accepts ISO and day-first dates', () => {
    expect(parseIsoDateKey('2026-09-13')).toBe('2026-09-13');
    expect(parseIsoDateKey('12.12.2012')).toBe('2012-12-12');
    expect(parseIsoDateKey('13/09/2026')).toBe('2026-09-13');
    expect(parseIsoDateKey('13-09-2026')).toBe('2026-09-13');
    expect(parseIsoDateKey('31.02.2026')).toBeNull();
  });
});

describe('parseTypedClock', () => {
  it('pads a valid clock and treats empty as omitted', () => {
    expect(parseTypedClock('8:00')).toBe('08:00');
    expect(parseTypedClock('')).toBeUndefined();
    expect(parseTypedClock('25:00')).toBeNull();
  });
});
