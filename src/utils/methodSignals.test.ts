import { defaultMethodSignals } from '@/types/methodSignals';
import {
  DAILY_METHOD_SIGNAL_ID,
  methodSignalFireAt,
  nextDailyFireAt,
  planMethodSignals,
  sanitizeClock,
  sanitizeMethodSignals,
} from '@/utils/methodSignals';
import { localDateKey, shiftDateKey } from '@/utils/taskTime';

function signals(
  overrides: Partial<ReturnType<typeof defaultMethodSignals>> = {},
): ReturnType<typeof defaultMethodSignals> {
  return {
    ...defaultMethodSignals(),
    ...overrides,
  };
}

describe('sanitizeMethodSignals', () => {
  it('stays off by default and normalizes clocks', () => {
    expect(sanitizeMethodSignals(null)).toEqual(defaultMethodSignals());
    expect(sanitizeClock('8:00', '08:00')).toBe('08:00');
    expect(sanitizeClock('25:00', '08:00')).toBe('08:00');
    expect(sanitizeMethodSignals({ enabled: 'yes' }).enabled).toBe(false);
    expect(sanitizeMethodSignals({ enabled: 'yes' }).daily).toEqual({
      enabled: false,
      time: '08:00',
    });
  });

  it('lifts the three legacy clocks onto dated items', () => {
    const next = sanitizeMethodSignals({
      enabled: true,
      morning: '09:00',
      evening: '22:00',
      sunday: '11:00',
    });

    expect(next.enabled).toBe(true);
    expect(next.items).toHaveLength(3);
    expect(next.items[0]?.time).toBe('09:00');
    expect(next.items[1]?.time).toBe('22:00');
    expect(next.items[2]?.time).toBe('11:00');
    expect(next.items.every((item) => item.date === localDateKey())).toBe(true);
    expect(next.items.every((item) => item.enabled)).toBe(true);
    expect(next.daily.enabled).toBe(false);
    expect(next.daily.time).toBe('08:00');
  });

  it('inherits the master switch onto items that have no toggle', () => {
    const next = sanitizeMethodSignals({
      enabled: true,
      items: [{ id: 'a', date: '2026-09-12', time: '08:00' }],
    });

    expect(next.items[0]?.enabled).toBe(true);
    expect(next.enabled).toBe(true);
  });

  it('does not derive the master switch from items', () => {
    const next = sanitizeMethodSignals({
      enabled: false,
      items: [{ id: 'a', date: '2026-09-12', time: '08:00', enabled: true }],
    });

    expect(next.enabled).toBe(false);
    expect(next.items[0]?.enabled).toBe(true);
    expect(next.items[0]?.note).toBe('');
  });

  it('keeps a short reminder note', () => {
    const next = sanitizeMethodSignals({
      enabled: true,
      items: [
        {
          id: 'a',
          date: '2026-09-12',
          time: '08:00',
          note: '  Выйти к воде  ',
          enabled: true,
        },
      ],
    });

    expect(next.items[0]?.note).toBe('Выйти к воде');
  });

  it('keeps a daily clock and turns junk time into 08:00', () => {
    const next = sanitizeMethodSignals({
      enabled: true,
      daily: { enabled: true, time: '7:30' },
      items: [],
    });

    expect(next.daily).toEqual({ enabled: true, time: '07:30' });
    expect(sanitizeMethodSignals({ enabled: true, daily: { enabled: true, time: '25:00' }, items: [] }).daily.time).toBe(
      '08:00',
    );
  });
});

describe('planMethodSignals', () => {
  it('schedules only future dated fires', () => {
    const tomorrow = shiftDateKey(localDateKey(), 1);
    const yesterday = shiftDateKey(localDateKey(), -1);
    const plan = planMethodSignals(
      signals({
        enabled: true,
        items: [
          { id: 'future', date: tomorrow, time: '08:00', note: 'К воде', enabled: true },
          { id: 'past', date: yesterday, time: '08:00', note: '', enabled: true },
          { id: 'off', date: tomorrow, time: '09:00', note: '', enabled: false },
        ],
      }),
    );

    expect(plan).toHaveLength(1);
    expect(plan[0]?.identifier).toBe('grail-method-future');
    expect(plan[0]?.kind).toBe('once');
    if (plan[0]?.kind === 'once') {
      expect(plan[0].fireAt.getHours()).toBe(8);
      expect(plan[0].note).toBe('К воде');
    }
  });

  it('schedules the repeating daily signal when its toggle is on', () => {
    const plan = planMethodSignals(
      signals({
        enabled: true,
        daily: { enabled: true, time: '07:15' },
      }),
    );

    expect(plan).toEqual([
      {
        kind: 'daily',
        identifier: DAILY_METHOD_SIGNAL_ID,
        hour: 7,
        minute: 15,
        note: '',
      },
    ]);
  });

  it('stays silent when every item is off', () => {
    expect(
      planMethodSignals(
        signals({
          enabled: false,
          items: [{ id: 'a', date: shiftDateKey(localDateKey(), 1), time: '08:00', note: '', enabled: false }],
        }),
      ),
    ).toHaveLength(0);
  });

  it('still repeats daily when the master switch is off', () => {
    const plan = planMethodSignals(
      signals({
        enabled: false,
        daily: { enabled: true, time: '08:00' },
        items: [{ id: 'a', date: shiftDateKey(localDateKey(), 1), time: '08:00', note: '', enabled: true }],
      }),
    );

    expect(plan).toHaveLength(1);
    expect(plan[0]?.kind).toBe('daily');
  });

  it('stays silent when the master switch is off', () => {
    expect(
      planMethodSignals(
        signals({
          enabled: false,
          items: [{ id: 'a', date: shiftDateKey(localDateKey(), 1), time: '08:00', note: '', enabled: true }],
        }),
      ),
    ).toHaveLength(0);
  });
});

describe('nextDailyFireAt', () => {
  it('keeps today’s clock if it has not passed yet', () => {
    const now = new Date(2026, 8, 21, 7, 0, 0, 0);
    const next = nextDailyFireAt('08:00', now);
    expect(next?.getDate()).toBe(21);
    expect(next?.getHours()).toBe(8);
    expect(next?.getMinutes()).toBe(0);
  });

  it('rolls to tomorrow when today’s clock has passed', () => {
    const now = new Date(2026, 8, 21, 8, 1, 0, 0);
    const next = nextDailyFireAt('08:00', now);
    expect(next?.getDate()).toBe(22);
    expect(next?.getHours()).toBe(8);
  });
});

describe('methodSignalFireAt', () => {
  it('builds a local calendar clock rather than UTC midnight', () => {
    const fireAt = methodSignalFireAt('2026-09-12', '08:30');
    expect(fireAt).not.toBeNull();
    expect(fireAt?.getFullYear()).toBe(2026);
    expect(fireAt?.getMonth()).toBe(8);
    expect(fireAt?.getDate()).toBe(12);
    expect(fireAt?.getHours()).toBe(8);
    expect(fireAt?.getMinutes()).toBe(30);
  });
});
