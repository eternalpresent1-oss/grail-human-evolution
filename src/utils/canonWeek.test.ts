import { CANON_WEEK_SLOT_COUNT } from '@/constants/canon';
import { dayVerdict } from '@/utils/dayVerdict';
import {
  countCanonWeek,
  dropCanonBefore,
  ensureClosedChronicle,
  generateCanonWeek,
  measureCanonDay,
  missPendingCanon,
  tickCanonCalendar,
} from '@/utils/canonWeek';
import { isoWeekday } from '@/utils/taskTime';

describe('generateCanonWeek', () => {
  it('staggers three slots per vector across the week', () => {
    const tasks = generateCanonWeek('2026-09-07');

    expect(tasks).toHaveLength(CANON_WEEK_SLOT_COUNT);
    expect(tasks.every((task) => task.kind === 'canon')).toBe(true);
    expect(tasks.filter((task) => task.scheduledOn === '2026-09-07').length).toBe(4);
    expect(tasks.filter((task) => task.scheduledOn === '2026-09-13').length).toBe(0);

    const rest = tasks.find((task) => task.content.source === 'seed' && task.content.seedId === 'canon_rest');
    expect(rest?.scheduledOn).toBe('2026-09-12');
    expect(rest?.dualDimensionId).toBe('mind_psyche');
    expect(tasks.every((task) => task.timeDeadline === undefined)).toBe(true);
    expect(tasks.every((task) => task.proofRequired === false)).toBe(true);
  });
});

describe('dropCanonBefore', () => {
  it('removes earlier canon from view and does not move it onto later days', () => {
    const week = generateCanonWeek('2026-09-14');
    const fromThursday = dropCanonBefore(week, '2026-09-17');

    expect(fromThursday.every((task) => (task.scheduledOn ?? '') >= '2026-09-17')).toBe(true);
    expect(fromThursday.some((task) => task.scheduledOn === '2026-09-14')).toBe(false);
    expect(fromThursday.some((task) => task.scheduledOn === '2026-09-16')).toBe(false);
    expect(fromThursday.filter((task) => task.scheduledOn === '2026-09-17').length).toBe(
      week.filter((task) => task.scheduledOn === '2026-09-17').length,
    );
    expect(fromThursday.length).toBeLessThan(week.length);
  });
});

describe('tickCanonCalendar', () => {
  it('burns leftover canon of a closed day and records the keep ratio', () => {
    const monday = generateCanonWeek('2026-09-07');
    const absorbedId = monday.find(
      (task) => task.scheduledOn === '2026-09-07' && task.dimensionId === 'physical',
    )?.id;

    const tasks = monday.map((task) =>
      task.id === absorbedId ? { ...task, ritualState: 'absorbed' as const, isCompleted: true } : task,
    );

    const tick = tickCanonCalendar({
      lastDecayDate: '2026-09-07',
      today: '2026-09-08',
      canonWeekStart: '2026-09-07',
      promiseJournal: {},
      disciplineScore: 63,
      currentStreak: 0,
      tasks,
    });

    expect(tick.daysElapsed).toBe(1);
    expect(tick.promiseJournal['2026-09-07']?.promised).toBe(4);
    expect(tick.promiseJournal['2026-09-07']?.kept).toBe(1);
    expect(
      tick.tasks.filter((task) => task.scheduledOn === '2026-09-07' && task.ritualState === 'pending'),
    ).toHaveLength(0);
  });

  it('keeps closed weeks and burns the days the app was not opened', () => {
    const start = '2026-09-14';
    const today = '2026-09-23';
    const tick = tickCanonCalendar({
      lastDecayDate: start,
      today,
      canonWeekStart: start,
      promiseJournal: {},
      disciplineScore: 50,
      currentStreak: 0,
      tasks: generateCanonWeek(start),
    });

    const missed = tick.tasks.filter((task) => task.scheduledOn === '2026-09-21');
    expect(missed.length).toBeGreaterThan(0);
    expect(missed.every((task) => task.ritualState === 'burned')).toBe(true);
    expect(tick.tasks.some((task) => task.scheduledOn === '2026-09-14' && task.ritualState === 'burned')).toBe(
      true,
    );
    expect(tick.tasks.some((task) => task.scheduledOn === today && task.ritualState === 'pending')).toBe(true);
    expect(tick.tasks.some((task) => task.scheduledOn === '2026-09-26' && task.ritualState === 'pending')).toBe(
      true,
    );
    expect(dayVerdict(tick.tasks, '2026-09-21', today, []).kind).toBe('scored');
    expect(dayVerdict(tick.tasks, '2026-09-20', today, [])).toEqual({ kind: 'empty', sunday: true });
    expect(countCanonWeek(tick.tasks, '2026-09-21').promised).toBe(
      generateCanonWeek('2026-09-21').length,
    );
    expect(countCanonWeek(tick.tasks, start).promised).toBe(CANON_WEEK_SLOT_COUNT);
  });

  it('still has a scored chronicle two years after the last open day', () => {
    const start = '2024-01-01';
    const today = '2026-01-07';
    const sample = '2025-06-16';
    expect(isoWeekday(start)).toBe(1);
    expect(isoWeekday(sample)).not.toBe(7);

    const tick = tickCanonCalendar({
      lastDecayDate: start,
      today,
      canonWeekStart: start,
      promiseJournal: {},
      disciplineScore: 50,
      currentStreak: 0,
      tasks: generateCanonWeek(start),
    });

    const sampleTasks = tick.tasks.filter((task) => task.scheduledOn === sample);
    expect(sampleTasks.length).toBeGreaterThan(0);
    expect(sampleTasks.every((task) => task.ritualState === 'burned')).toBe(true);
    expect(dayVerdict(tick.tasks, sample, today, [])).toMatchObject({
      kind: 'scored',
      score: 1,
      absorbed: 0,
    });
    expect(tick.tasks.some((task) => task.scheduledOn === today && task.ritualState === 'pending')).toBe(true);
    expect(tick.tasks.some((task) => (task.scheduledOn ?? '') < start)).toBe(false);
    expect(countCanonWeek(tick.tasks, '2025-12-29').promised).toBeGreaterThan(0);
    expect(countCanonWeek(tick.tasks, '2025-12-29').promised).toBeLessThan(tick.tasks.length);
  });

  it('lays the whole new week when Monday itself is the open day', () => {
    const tick = tickCanonCalendar({
      lastDecayDate: '2026-09-20',
      today: '2026-09-21',
      canonWeekStart: '2026-09-14',
      promiseJournal: {},
      disciplineScore: 50,
      currentStreak: 0,
      tasks: [],
    });

    expect(tick.tasks.some((task) => task.scheduledOn === '2026-09-21')).toBe(true);
    expect(tick.tasks.some((task) => task.scheduledOn === '2026-09-26')).toBe(true);
    expect(tick.tasks.some((task) => (task.scheduledOn ?? '') < '2026-09-21')).toBe(false);
  });
});

describe('missPendingCanon', () => {
  it('keeps a hand-set deadline when the day is missed', () => {
    const monday = generateCanonWeek('2026-09-07');
    const withTime = monday.map((task) =>
      task.scheduledOn === '2026-09-07' && task.dimensionId === 'physical'
        ? { ...task, timeDeadline: '08:00', notify: true as const }
        : task,
    );

    const missed = missPendingCanon(withTime, '2026-09-07');
    const burned = missed.find(
      (task) => task.scheduledOn === '2026-09-07' && task.dimensionId === 'physical',
    );

    expect(burned?.ritualState).toBe('burned');
    expect(burned?.timeDeadline).toBe('08:00');
    expect(burned?.notify).toBeUndefined();
  });
});

describe('ensureClosedChronicle', () => {
  it('restores wiped weekdays across months without inventing days before the first open', () => {
    const firstOpenOn = '2025-03-05';
    const today = '2025-11-12';
    const wipedMonday = '2025-06-16';
    const beforeOpen = '2025-03-03';
    const kept = generateCanonWeek('2025-11-10').filter((task) => (task.scheduledOn ?? '') >= today);

    const restored = ensureClosedChronicle(kept, firstOpenOn, today);

    const monday = restored.filter((task) => task.scheduledOn === wipedMonday);
    expect(isoWeekday(wipedMonday)).toBe(1);
    expect(monday.length).toBeGreaterThan(0);
    expect(monday.every((task) => task.ritualState === 'burned')).toBe(true);
    expect(dayVerdict(restored, wipedMonday, today, []).kind).toBe('scored');
    expect(restored.some((task) => task.scheduledOn === beforeOpen)).toBe(false);
    expect(dayVerdict(restored, '2025-06-15', today, [])).toEqual({ kind: 'empty', sunday: true });
    expect(restored.filter((task) => task.scheduledOn === today).every((task) => task.ritualState === 'pending')).toBe(
      true,
    );

    const again = ensureClosedChronicle(restored, firstOpenOn, today);
    expect(again).toHaveLength(restored.length);
  });

  it('fills a gap of more than a year and leaves the open day pending', () => {
    const firstOpenOn = '2024-02-01';
    const today = '2026-02-04';
    const sample = '2025-08-04';
    expect(isoWeekday(sample)).not.toBe(7);

    const restored = ensureClosedChronicle([], firstOpenOn, today);
    const sampleTasks = restored.filter((task) => task.scheduledOn === sample);

    expect(sampleTasks.length).toBeGreaterThan(0);
    expect(sampleTasks.every((task) => task.ritualState === 'burned')).toBe(true);
    expect(dayVerdict(restored, sample, today, [])).toMatchObject({ kind: 'scored', absorbed: 0 });
    expect(restored.some((task) => (task.scheduledOn ?? '') >= today)).toBe(false);
    expect(restored.some((task) => (task.scheduledOn ?? '') < firstOpenOn)).toBe(false);
  });
});

describe('measureCanonDay', () => {
  it('counts only that calendar day', () => {
    const tasks = generateCanonWeek('2026-09-07');
    expect(measureCanonDay(tasks, '2026-09-07').promised).toBe(4);
    expect(missPendingCanon(tasks, '2026-09-07').filter((task) => task.scheduledOn === '2026-09-07').every((task) => task.ritualState === 'burned')).toBe(true);
  });
});
