import { ru } from '@/i18n/ru';
import { createInitialTasks } from '@/constants/mockData';
import { DISCIPLINE_START_SCORE, type AtomizedTask } from '@/types/grail';
import { dayVerdict } from '@/utils/dayVerdict';
import { computeDisciplineScore } from '@/utils/discipline';
import {
  applyFirstOpen,
  chronicleWeekStart,
  isBeforeChronicle,
} from '@/utils/firstOpen';
import { localDateKey, weekMondayOf } from '@/utils/taskTime';

function canon(id: string, scheduledOn: string, ritualState: AtomizedTask['ritualState']): AtomizedTask {
  return {
    id,
    content: { source: 'seed', seedId: 'physical_morning_mobility' },
    dimensionId: 'physical',
    kind: 'canon',
    ritualState,
    isCompleted: ritualState === 'absorbed',
    isNonNegotiable: true,
    proofRequired: false,
    xpReward: 15,
    isOverdue: false,
    scheduledOn,
    ...(ritualState === 'absorbed' ? { absorbedOn: scheduledOn } : {}),
  };
}

describe('first launch chronicle', () => {
  it('opens on Wednesday 23.09.2026 at Monday 21.09 and leaves the days before empty', () => {
    const firstDay = '2026-09-23';
    const anchored = applyFirstOpen({
      firstOpenOn: undefined,
      lastDecayDate: firstDay,
      today: firstDay,
      journal: {
        '2026-09-21': { promised: 4, kept: 0 },
        '2026-09-22': { promised: 3, kept: 0 },
      },
      tasks: [
        canon('mon', '2026-09-21', 'burned'),
        canon('tue', '2026-09-22', 'burned'),
        canon('wed', firstDay, 'pending'),
      ],
    });

    expect(chronicleWeekStart(anchored.firstOpenOn)).toBe('2026-09-21');
    expect(isBeforeChronicle('2026-09-14', anchored.firstOpenOn)).toBe(true);
    expect(isBeforeChronicle('2026-09-21', anchored.firstOpenOn)).toBe(false);
    expect(anchored.tasks.map((task) => task.scheduledOn)).toEqual([firstDay]);
    expect(anchored.journal['2026-09-21']).toBeUndefined();
    expect(anchored.journal['2026-09-22']).toBeUndefined();
    expect(dayVerdict(anchored.tasks, '2026-09-21', firstDay, [])).toEqual({
      kind: 'empty',
      sunday: false,
    });
    expect(dayVerdict(anchored.tasks, '2026-09-22', firstDay, [])).toEqual({
      kind: 'empty',
      sunday: false,
    });
    expect(ru['verdict.empty']).toBe('В этот день не было заданий.');
    expect(
      computeDisciplineScore({
        tasks: anchored.tasks,
        today: firstDay,
        journal: anchored.journal,
      }),
    ).toBe(DISCIPLINE_START_SCORE);
  });

  it('keeps a day that was actually lived', () => {
    const anchored = applyFirstOpen({
      firstOpenOn: undefined,
      lastDecayDate: '2026-09-23',
      today: '2026-09-23',
      journal: {},
      tasks: [
        canon('mon', '2026-09-21', 'absorbed'),
        canon('wed', '2026-09-23', 'pending'),
      ],
    });

    expect(anchored.firstOpenOn).toBe('2026-09-21');
    expect(anchored.tasks.map((task) => task.id)).toEqual(['mon', 'wed']);
    expect(isBeforeChronicle('2026-09-14', anchored.firstOpenOn)).toBe(true);
  });

  it('starts a fresh roster on whatever weekday the app is opened', () => {
    const today = localDateKey();
    const tasks = createInitialTasks();

    expect(tasks.every((task) => (task.scheduledOn ?? '') >= today)).toBe(true);
    expect(tasks.some((task) => task.scheduledOn === weekMondayOf(today) && weekMondayOf(today) < today)).toBe(
      false,
    );
  });
});
