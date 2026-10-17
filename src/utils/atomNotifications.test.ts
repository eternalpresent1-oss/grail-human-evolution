import { createTranslator } from '@/i18n';
import { planAtomNotifications } from '@/utils/atomNotifications';
import { shiftDateKey, localDateKey } from '@/utils/taskTime';
import { type AtomizedTask } from '@/types/grail';

function customAtom(overrides: Partial<AtomizedTask> = {}): AtomizedTask {
  return {
    id: 'atom-1',
    content: { source: 'custom', title: 'Позвонить' },
    dimensionId: 'social',
    kind: 'custom',
    ritualState: 'pending',
    isCompleted: false,
    isNonNegotiable: true,
    proofRequired: false,
    xpReward: 15,
    isOverdue: false,
    scheduledOn: shiftDateKey(localDateKey(), 1),
    timeDeadline: '09:00',
    notify: true,
    ...overrides,
  };
}

describe('planAtomNotifications', () => {
  const t = createTranslator('ru');

  it('schedules a pending custom atom with a future clock', () => {
    const plan = planAtomNotifications([customAtom()], t);
    expect(plan).toHaveLength(1);
    expect(plan[0]?.identifier).toBe('grail-atom-atom-1');
    expect(plan[0]?.title).toBe('Позвонить');
  });

  it('schedules a pending canon with a future clock', () => {
    const plan = planAtomNotifications(
      [
        customAtom({
          id: 'canon-1',
          kind: 'canon',
          content: { source: 'seed', seedId: 'physical_morning_mobility' },
        }),
      ],
      t,
    );

    expect(plan).toHaveLength(1);
    expect(plan[0]?.identifier).toBe('grail-atom-canon-1');
  });

  it('skips absorbed, silent and past atoms', () => {
    const yesterday = shiftDateKey(localDateKey(), -1);
    const plan = planAtomNotifications(
      [
        customAtom({ id: 'a', ritualState: 'absorbed' }),
        customAtom({ id: 'b', notify: false }),
        customAtom({ id: 'c', scheduledOn: yesterday, timeDeadline: '00:01' }),
        customAtom({ id: 'd', kind: 'canon', notify: false }),
      ],
      t,
    );

    expect(plan).toHaveLength(0);
  });
});
