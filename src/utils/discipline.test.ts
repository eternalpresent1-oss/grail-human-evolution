import {
  DISCIPLINE_RATE,
  DISCIPLINE_SCORE_DAYS,
  DISCIPLINE_START_SCORE,
  type AtomizedTask,
} from '@/types/grail';
import {
  advanceDisciplineScore,
  computeDisciplineScore,
  computeDayDisciplineScore,
  computeHistoricalDayDisciplineScore,
  keepRatio,
  measureDutyDay,
  retractDisciplineMiss,
  weekKeepRatio,
} from '@/utils/discipline';
import { shiftDateKey } from '@/utils/taskTime';

function duty(overrides: Partial<AtomizedTask> = {}): AtomizedTask {
  return {
    id: 'duty-1',
    content: { source: 'custom', title: 'Duty' },
    dimensionId: 'physical',
    kind: 'custom',
    ritualState: 'pending',
    isCompleted: false,
    isNonNegotiable: true,
    proofRequired: false,
    xpReward: 15,
    isOverdue: false,
    scheduledOn: '2026-09-18',
    ...overrides,
  };
}

function ratioTasks(day: string, ratio: number): AtomizedTask[] {
  const count = 10;
  const kept = Math.round(ratio * count);
  return Array.from({ length: count }, (_, index) =>
    duty({
      id: `${day}-${index}`,
      scheduledOn: day,
      ...(index < kept
        ? { ritualState: 'absorbed' as const, isCompleted: true, absorbedOn: day }
        : { ritualState: 'burned' as const }),
    }),
  );
}

describe('advanceDisciplineScore', () => {
  it('skips a day with no promises', () => {
    expect(advanceDisciplineScore(63, { promised: 0, kept: 0 })).toBe(63);
  });

  it('blends toward the keep share at DISCIPLINE_RATE', () => {
    const next = advanceDisciplineScore(63, { promised: 4, kept: 3 });
    expect(next).toBeCloseTo(63 + DISCIPLINE_RATE * (75 - 63), 8);
  });

  it('undoes one missed-promise blend', () => {
    const after = advanceDisciplineScore(63, { promised: 1, kept: 0 });
    expect(retractDisciplineMiss(after)).toBeCloseTo(63, 8);
  });
});

describe('keepRatio', () => {
  it('is 100 when nothing was promised', () => {
    expect(keepRatio({ promised: 0, kept: 0 })).toBe(100);
  });
});

describe('weekKeepRatio', () => {
  it('sums the seven days of a week', () => {
    expect(
      weekKeepRatio(
        {
          '2026-09-07': { promised: 4, kept: 4 },
          '2026-09-08': { promised: 4, kept: 2 },
        },
        '2026-09-07',
      ),
    ).toBe(6 / 8);
  });
});

describe('computeDisciplineScore', () => {
  it('starts at 50% on the first open day before anything is kept', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({ id: 'a', scheduledOn: today }),
      duty({ id: 'b', scheduledOn: today, dimensionId: 'spirit' }),
    ];

    expect(computeDisciplineScore({ tasks, today })).toBe(DISCIPLINE_START_SCORE);
  });

  it('reaches 100% on the first day when every atom is absorbed', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({
        id: 'canon',
        kind: 'canon',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
      duty({
        id: 'custom',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
    ];

    expect(computeDisciplineScore({ tasks, today })).toBe(100);
  });

  it('takes 10% off while a broke-word shadow hangs, even on a perfect day', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({
        id: 'canon',
        kind: 'canon',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
      duty({
        id: 'custom',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
    ];
    const shadowEvents = [{ id: 's1', catalogId: 'broke_word' as const, occurredOn: today }];

    expect(computeDisciplineScore({ tasks, today, shadowEvents })).toBe(90);
  });

  it('does not stack the penalty and ignores shadows that do not hit discipline', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({
        id: 'kept',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
    ];

    expect(
      computeDisciplineScore({
        tasks,
        today,
        shadowEvents: [
          { id: 's1', catalogId: 'broke_word', occurredOn: today },
          { id: 's2', catalogId: 'broke_word', occurredOn: today },
          { id: 's3', catalogId: 'impulse_spend', occurredOn: today },
        ],
      }),
    ).toBe(90);
  });

  it('lets the penalty go when the confession leaves the seven-day window', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({
        id: 'kept',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
    ];

    expect(
      computeDisciplineScore({
        tasks,
        today,
        shadowEvents: [{ id: 's1', catalogId: 'broke_word', occurredOn: '2026-09-10' }],
      }),
    ).toBe(100);
  });

  it('keeps life at 50 while a partial first day moves only the day score', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({
        id: 'kept-a',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
      duty({
        id: 'kept-b',
        scheduledOn: today,
        dimensionId: 'spirit',
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
      duty({ id: 'burned', scheduledOn: today, dimensionId: 'intellect', ritualState: 'burned' }),
    ];

    expect(computeDayDisciplineScore({ tasks, today })).toBeCloseTo(50 + 50 * ((2 - 1) / 3), 8);
    expect(computeDisciplineScore({ tasks, today })).toBe(50);
  });

  it('leaves life at 50 when one atom of several is kept', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({
        id: 'kept',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
      duty({ id: 'open-b', scheduledOn: today, dimensionId: 'spirit' }),
      duty({ id: 'open-c', scheduledOn: today, dimensionId: 'intellect' }),
      duty({ id: 'open-d', scheduledOn: today, dimensionId: 'drive' }),
    ];

    expect(computeDayDisciplineScore({ tasks, today })).toBe(50 + 50 * (1 / 4));
    expect(computeDisciplineScore({ tasks, today })).toBe(50);
  });

  it('maps a half-kept first day onto the day score only', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({
        id: 'kept',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
      duty({ id: 'open', scheduledOn: today, dimensionId: 'spirit' }),
    ];

    expect(computeDayDisciplineScore({ tasks, today })).toBe(75);
    expect(computeDisciplineScore({ tasks, today })).toBe(50);
  });

  it('does not let an old journal row move life on a partial day', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({
        id: 'kept',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
      duty({ id: 'open', scheduledOn: today, dimensionId: 'spirit' }),
      duty({ id: 'open-c', scheduledOn: today, dimensionId: 'intellect' }),
      duty({ id: 'open-d', scheduledOn: today, dimensionId: 'drive' }),
    ];

    expect(computeDayDisciplineScore({ tasks, today })).toBe(62.5);
    expect(
      computeDisciplineScore({
        tasks,
        today,
        journal: { '2026-09-01': { promised: 4, kept: 0 } },
        firstOpenOn: today,
      }),
    ).toBe(50);
  });

  it('keeps the first open at 50 when earlier weekdays are still pending', () => {
    const today = '2026-09-23';
    const tasks = [
      duty({ id: 'mon', scheduledOn: '2026-09-21' }),
      duty({ id: 'tue', scheduledOn: '2026-09-22' }),
      duty({ id: 'wed', scheduledOn: today }),
    ];

    expect(computeDisciplineScore({ tasks, today })).toBe(DISCIPLINE_START_SCORE);
  });

  it('shows 80 after the first day when four of five were kept', () => {
    const today = '2026-09-23';
    const tasks = [shiftDateKey(today, -2), shiftDateKey(today, -1), today].flatMap((day) =>
      Array.from({ length: 5 }, (_, index) =>
        duty({
          id: `${day}-${index}`,
          scheduledOn: day,
          ...(index < 4
            ? { ritualState: 'absorbed' as const, isCompleted: true, absorbedOn: day }
            : {}),
        }),
      ),
    );

    expect(computeDisciplineScore({ tasks, today })).toBe(80);
  });

  it('moves the day on every kept or burned atom while life waits', () => {
    const today = '2026-09-23';
    const pending = [
      duty({ id: 'a', scheduledOn: today }),
      duty({ id: 'b', scheduledOn: today, dimensionId: 'spirit' }),
      duty({ id: 'c', scheduledOn: today, dimensionId: 'intellect' }),
      duty({ id: 'd', scheduledOn: today, dimensionId: 'drive' }),
    ];

    expect(computeDayDisciplineScore({ tasks: pending, today })).toBe(50);
    expect(computeDisciplineScore({ tasks: pending, today })).toBe(50);

    const oneKept = pending.map((task, index) =>
      index === 0
        ? { ...task, ritualState: 'absorbed' as const, isCompleted: true, absorbedOn: today }
        : task,
    );
    expect(computeDayDisciplineScore({ tasks: oneKept, today })).toBe(62.5);
    expect(computeDisciplineScore({ tasks: oneKept, today })).toBe(50);

    const oneBurned = pending.map((task) =>
      task.id === 'a' ? { ...task, ritualState: 'burned' as const } : task,
    );
    expect(computeDayDisciplineScore({ tasks: oneBurned, today })).toBe(37.5);
    expect(computeDisciplineScore({ tasks: oneBurned, today })).toBe(50);

    const allKept = pending.map((task) => ({
      ...task,
      ritualState: 'absorbed' as const,
      isCompleted: true,
      absorbedOn: today,
    }));
    expect(computeDayDisciplineScore({ tasks: allKept, today })).toBe(100);
    expect(computeDisciplineScore({ tasks: allKept, today })).toBe(100);

    const allBurned = pending.map((task) => ({ ...task, ritualState: 'burned' as const }));
    expect(computeDayDisciplineScore({ tasks: allBurned, today })).toBe(0);
    expect(computeDisciplineScore({ tasks: allBurned, today })).toBe(50);
  });

  it('keeps life at 50 when the first burn is still an open day', () => {
    const today = '2026-09-23';
    const tasks = [
      duty({
        id: 'old',
        scheduledOn: shiftDateKey(today, -20),
        ritualState: 'burned',
      }),
      duty({ id: 'burned-today', scheduledOn: today, ritualState: 'burned' }),
      duty({ id: 'open-b', scheduledOn: today, dimensionId: 'spirit' }),
      duty({ id: 'open-c', scheduledOn: today, dimensionId: 'intellect' }),
      duty({ id: 'open-d', scheduledOn: today, dimensionId: 'drive' }),
    ];

    expect(computeDisciplineScore({ tasks, today })).toBe(50);
    expect(computeDayDisciplineScore({ tasks, today })).toBe(37.5);
  });

  it('uses the same share for one atom and for ten', () => {
    const today = '2026-09-23';
    const oneBurned = [duty({ id: 'only', scheduledOn: today, ritualState: 'burned' })];
    const ten = Array.from({ length: 10 }, (_, index) =>
      duty({
        id: `n-${index}`,
        scheduledOn: today,
        ...(index === 0 ? { ritualState: 'burned' as const } : {}),
      }),
    );
    const tenKept = ten.map((task, index) =>
      index === 0
        ? { ...task, ritualState: 'absorbed' as const, isCompleted: true, absorbedOn: today }
        : { ...task, ritualState: 'pending' as const },
    );

    expect(computeDayDisciplineScore({ tasks: oneBurned, today })).toBe(0);
    expect(computeDayDisciplineScore({ tasks: ten, today })).toBe(45);
    expect(computeDayDisciplineScore({ tasks: tenKept, today })).toBe(55);
    expect(computeDisciplineScore({ tasks: oneBurned, today })).toBe(50);
    expect(computeDisciplineScore({ tasks: ten, today })).toBe(50);
    expect(computeDisciplineScore({ tasks: tenKept, today })).toBe(50);
  });

  it('does not turn a 50 morning into 25 when one atom of the open day is kept', () => {
    const today = '2026-09-23';
    const yesterday = shiftDateKey(today, -1);
    const tasks = [
      duty({
        id: 'yesterday-kept',
        scheduledOn: yesterday,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: yesterday,
      }),
      duty({
        id: 'yesterday-open',
        scheduledOn: yesterday,
        dimensionId: 'spirit',
        ritualState: 'burned',
      }),
      duty({
        id: 'today-kept',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
      duty({ id: 'today-b', scheduledOn: today, dimensionId: 'spirit' }),
      duty({ id: 'today-c', scheduledOn: today, dimensionId: 'intellect' }),
      duty({ id: 'today-d', scheduledOn: today, dimensionId: 'drive' }),
    ];

    expect(computeDisciplineScore({ tasks, today })).toBe(50);
  });

  it('drops when today is burned after perfect days', () => {
    const today = '2026-09-23';
    const tasks = [shiftDateKey(today, -2), shiftDateKey(today, -1), today].flatMap((day) =>
      Array.from({ length: 3 }, (_, index) =>
        duty({
          id: `${day}-${index}`,
          scheduledOn: day,
          ...(day === today
            ? { ritualState: 'burned' as const }
            : { ritualState: 'absorbed' as const, isCompleted: true, absorbedOn: day }),
        }),
      ),
    );

    expect(computeDisciplineScore({ tasks, today })).toBe(100);
    expect(
      computeDisciplineScore({
        tasks,
        today,
        shadowEvents: [{ id: 's1', catalogId: 'broke_word', occurredOn: today }],
      }),
    ).toBe(90);
  });

  it('keeps yesterday when today still has an untouched atom', () => {
    const today = '2026-09-23';
    const keptDay = shiftDateKey(today, -2);
    const tasks = [
      duty({
        id: 'kept',
        scheduledOn: keptDay,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: keptDay,
      }),
      duty({ id: 'open', scheduledOn: today }),
    ];

    expect(computeDisciplineScore({ tasks, today })).toBe(100);
  });

  it('follows the fourteen-day closed-window table', () => {
    const ratios = [1, 0.8, 0.4, 0, 0.6, 1, 0.2, 0.8, 0.5, 0, 0.7, 0.9, 0.3, 1];
    const screens = [100, 100, 90, 73.333333, 55, 63.333333, 63.333333, 50, 50, 51.666666, 51.666666, 53.333333, 51.666666, 60];
    const start = '2026-09-01';

    ratios.forEach((ratio, index) => {
      const today = shiftDateKey(start, index);
      const tasks = ratios.slice(0, index + 1).flatMap((share, dayIndex) => ratioTasks(shiftDateKey(start, dayIndex), share));
      expect(computeDisciplineScore({ tasks, today })).toBeCloseTo(screens[index] ?? 0, 4);
    });
  });

  it('holds life at 50 on a partial first day, then the keep ratio', () => {
    const start = '2026-09-01';
    const columns = [
      { ratio: 0.8, screens: [50, 80, 80, 80, 80, 80, 80] },
      { ratio: 0.3, screens: [50, 30, 30, 30, 30, 30, 30] },
      { ratio: 0, screens: [50, 0, 0, 0, 0, 0, 0] },
    ];

    for (const column of columns) {
      column.screens.forEach((screen, index) => {
        const today = shiftDateKey(start, index);
        const tasks = column.screens.flatMap((_, dayIndex) =>
          dayIndex <= index ? ratioTasks(shiftDateKey(start, dayIndex), column.ratio) : [],
        );
        expect(computeDisciplineScore({ tasks, today })).toBeCloseTo(screen, 4);
      });
    }
  });

  it('falls to 0 across a week of empty days', () => {
    const today = '2026-09-18';
    const start = shiftDateKey(today, -(DISCIPLINE_SCORE_DAYS - 1));
    const tasks = [duty({ id: 'origin', scheduledOn: start, ritualState: 'burned' })];

    expect(computeDisciplineScore({ tasks, today })).toBe(0);
  });

  it('needs a full kept week to climb back to 100 after empty days', () => {
    const today = '2026-09-18';
    const tasks = Array.from({ length: DISCIPLINE_SCORE_DAYS }, (_, offset) => {
      const day = shiftDateKey(today, -(DISCIPLINE_SCORE_DAYS - 1 - offset));
      return duty({
        id: `kept-${day}`,
        scheduledOn: day,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: day,
      });
    });

    expect(computeDisciplineScore({ tasks, today })).toBe(100);
  });

  it('moves today on a later day while life waits for that day to close', () => {
    const today = '2026-09-23';
    const yesterday = shiftDateKey(today, -1);
    const tasks = [
      ...ratioTasks(yesterday, 1),
      duty({
        id: 'kept',
        scheduledOn: today,
        ritualState: 'absorbed',
        isCompleted: true,
        absorbedOn: today,
      }),
      duty({ id: 'open-b', scheduledOn: today, dimensionId: 'spirit' }),
      duty({ id: 'open-c', scheduledOn: today, dimensionId: 'intellect' }),
      duty({ id: 'open-d', scheduledOn: today, dimensionId: 'drive' }),
    ];

    expect(computeDayDisciplineScore({ tasks, today })).toBe(62.5);
    expect(computeDisciplineScore({ tasks, today })).toBe(100);
  });

  it('takes the broke-word shadow off today and off life', () => {
    const today = '2026-09-18';
    const tasks = [
      duty({ id: 'burned', scheduledOn: today, ritualState: 'burned' }),
      duty({ id: 'open-b', scheduledOn: today, dimensionId: 'spirit' }),
      duty({ id: 'open-c', scheduledOn: today, dimensionId: 'intellect' }),
      duty({ id: 'open-d', scheduledOn: today, dimensionId: 'drive' }),
    ];
    const shadowEvents = [{ id: 's1', catalogId: 'broke_word' as const, occurredOn: today }];

    expect(computeDayDisciplineScore({ tasks, today, shadowEvents })).toBe(27.5);
    expect(computeDisciplineScore({ tasks, today, shadowEvents })).toBe(40);
  });

  it('keeps a past day’s mark free of today’s live desk', () => {
    const past = '2026-09-17';
    const today = '2026-09-18';
    const pastBurned = [
      duty({ id: 'p1', scheduledOn: past, ritualState: 'burned' }),
      duty({ id: 'p2', scheduledOn: past, ritualState: 'burned', dimensionId: 'spirit' }),
    ];
    const todayPending = [
      duty({ id: 't1', scheduledOn: today }),
      duty({ id: 't2', scheduledOn: today, dimensionId: 'spirit' }),
      duty({ id: 't3', scheduledOn: undefined, dimensionId: 'drive' }),
    ];
    const tasks = [...pastBurned, ...todayPending];

    expect(computeDayDisciplineScore({ tasks, today })).toBe(50);
    expect(computeHistoricalDayDisciplineScore({ tasks, day: past, today })).toBe(0);

    const todayBurned = todayPending.map((task) => ({
      ...task,
      ritualState: 'burned' as const,
    }));
    expect(
      computeHistoricalDayDisciplineScore({
        tasks: [...pastBurned, ...todayBurned],
        day: past,
        today,
      }),
    ).toBe(0);
  });

  it('holds a steady completion rate across three weeks from day one', () => {
    const start = '2026-09-01';
    const days = 21;
    const rates = [0.2, 0.5, 0.8, 1];

    for (const rate of rates) {
      for (let index = 0; index < days; index += 1) {
        const today = shiftDateKey(start, index);
        const tasks = Array.from({ length: index + 1 }, (_, dayIndex) =>
          ratioTasks(shiftDateKey(start, dayIndex), rate),
        ).flat();
        const life = index === 0 && rate < 1 ? DISCIPLINE_START_SCORE : rate * 100;

        expect(computeDayDisciplineScore({ tasks, today })).toBeCloseTo(rate * 100, 3);
        expect(computeDisciplineScore({ tasks, today })).toBeCloseTo(life, 3);
      }
    }
  });
});

describe('measureDutyDay', () => {
  it('counts canon, custom and campaign atoms of that day', () => {
    const today = '2026-09-18';
    const record = measureDutyDay(
      [
        duty({
          id: 'c',
          kind: 'canon',
          scheduledOn: today,
          ritualState: 'absorbed',
          absorbedOn: today,
        }),
        duty({ id: 'u', scheduledOn: today }),
        duty({
          id: 'g',
          kind: 'campaign',
          campaignId: 'g1',
          scheduledOn: today,
          ritualState: 'burned',
        }),
        duty({ id: 'other', scheduledOn: '2026-09-17' }),
      ],
      today,
      today,
    );

    expect(record).toEqual({ promised: 3, kept: 1 });
  });
});
