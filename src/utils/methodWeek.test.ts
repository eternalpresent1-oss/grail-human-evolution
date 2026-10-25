import { createInitialProfile } from '@/constants/mockData';
import { HUMAN_DIMENSION_IDS } from '@/types/grail';
import {
  ensureSundayFieldMark,
  methodReviewWeekSunday,
  methodWeekTable,
  weekSundayOf,
  type WeekFieldMark,
} from '@/utils/methodWeek';

function mark(overrides: Partial<WeekFieldMark> = {}): WeekFieldMark {
  const dimensions = HUMAN_DIMENSION_IDS.reduce(
    (next, id) => {
      next[id] = 50;
      return next;
    },
    {} as Record<(typeof HUMAN_DIMENSION_IDS)[number], number>,
  );

  return {
    stampedOn: '2026-10-18',
    dimensions,
    lifeDiscipline: 70,
    shadowAverage: 12,
    ...overrides,
  };
}

describe('weekSundayOf', () => {
  it('returns the same day on Sunday', () => {
    expect(weekSundayOf('2026-10-18')).toBe('2026-10-18');
  });

  it('walks back to Sunday from midweek', () => {
    expect(weekSundayOf('2026-10-21')).toBe('2026-10-18');
    expect(weekSundayOf('2026-10-24')).toBe('2026-10-18');
  });
});

describe('methodWeekTable', () => {
  it('reads Was from the prior closed week and Became from the week just closed', () => {
    const was = mark({
      stampedOn: '2026-10-11',
      lifeDiscipline: 60,
      shadowAverage: 20,
      dimensions: { ...mark().dimensions, physical: 40 },
    });
    const became = mark({
      stampedOn: '2026-10-18',
      lifeDiscipline: 80,
      shadowAverage: 10,
      dimensions: { ...mark().dimensions, physical: 55 },
    });

    const table = methodWeekTable(
      {
        '2026-10-04': was,
        '2026-10-11': became,
      },
      '2026-10-18',
    );

    expect(table.weekSunday).toBe('2026-10-11');
    expect(table.weekSaturday).toBe('2026-10-17');
    expect(table.rows.find((row) => row.id === 'physical')).toEqual({
      id: 'physical',
      kind: 'dimension',
      dimensionId: 'physical',
      was: 40,
      became: 55,
    });
    expect(table.rows.find((row) => row.id === 'life')).toEqual({
      id: 'life',
      kind: 'life',
      was: 60,
      became: 80,
    });
    expect(table.rows.find((row) => row.id === 'shadow')).toEqual({
      id: 'shadow',
      kind: 'shadow',
      was: 20,
      became: 10,
    });
  });

  it('uses a live Became reading when provided', () => {
    const was = mark({
      stampedOn: '2026-10-11',
      lifeDiscipline: 60,
      dimensions: { ...mark().dimensions, physical: 40 },
    });
    const live = mark({
      stampedOn: '2026-10-18',
      lifeDiscipline: 88,
      dimensions: { ...mark().dimensions, physical: 72 },
    });

    const table = methodWeekTable({ '2026-10-04': was }, '2026-10-18', live);

    expect(table.rows.find((row) => row.id === 'physical')).toMatchObject({
      was: 40,
      became: 72,
    });
    expect(table.rows.find((row) => row.id === 'life')).toMatchObject({
      was: 60,
      became: 88,
    });
  });
});

describe('ensureSundayFieldMark', () => {
  it('stamps the closed week once on Sunday and leaves weekday marks alone', () => {
    expect(methodReviewWeekSunday('2026-10-18')).toBe('2026-10-11');

    const profile = createInitialProfile();
    const first = ensureSundayFieldMark(
      {},
      {
        profile,
        tasks: [],
        shadowEvents: [],
        today: '2026-10-18',
      },
    );

    expect(first['2026-10-11']).toBeDefined();
    expect(first['2026-10-18']).toBeUndefined();

    const raised = {
      ...profile,
      dimensions: HUMAN_DIMENSION_IDS.reduce(
        (next, id) => {
          next[id] = { ...profile.dimensions[id], score: 99 };
          return next;
        },
        { ...profile.dimensions },
      ),
    };

    const second = ensureSundayFieldMark(first, {
      profile: raised,
      tasks: [],
      shadowEvents: [],
      today: '2026-10-18',
    });

    expect(second['2026-10-11']?.dimensions.physical).toBe(profile.dimensions.physical.score);

    const weekday = ensureSundayFieldMark(
      {},
      {
        profile,
        tasks: [],
        shadowEvents: [],
        today: '2026-10-19',
      },
    );
    expect(weekday).toEqual({});
  });
});
