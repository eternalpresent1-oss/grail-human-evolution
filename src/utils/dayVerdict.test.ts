import { type AtomizedTask, type ShadowEvent } from '@/types/grail';
import { DAY_VERDICT_MAX, dayVerdict, dayVerdictLineKey } from '@/utils/dayVerdict';

function atom(overrides: Partial<AtomizedTask> = {}): AtomizedTask {
  return {
    id: 'atom-1',
    content: { source: 'custom', title: 'Дело' },
    dimensionId: 'physical',
    kind: 'custom',
    ritualState: 'pending',
    isCompleted: false,
    isNonNegotiable: true,
    proofRequired: false,
    xpReward: 15,
    isOverdue: false,
    scheduledOn: '2026-09-15',
    ...overrides,
  };
}

function shadow(id: string): ShadowEvent {
  return { id, catalogId: 'impulse_spend', occurredOn: '2026-09-15' };
}

describe('dayVerdict', () => {
  const today = '2026-09-16';
  const day = '2026-09-15';

  it('gives 5 of 5 when every atom of the day is absorbed', () => {
    const verdict = dayVerdict(
      [
        atom({ id: 'a', ritualState: 'absorbed', absorbedOn: day }),
        atom({ id: 'b', kind: 'canon', ritualState: 'absorbed', absorbedOn: day }),
      ],
      day,
      today,
      [],
    );

    expect(verdict).toMatchObject({ kind: 'scored', score: 5, absorbed: 2, total: 2, shadowCount: 0 });
    expect(DAY_VERDICT_MAX).toBe(5);
  });

  it('does not let shadow lower a perfect desk', () => {
    const verdict = dayVerdict(
      [atom({ ritualState: 'absorbed', absorbedOn: day })],
      day,
      today,
      [shadow('s1')],
    );

    expect(verdict).toMatchObject({ kind: 'scored', score: 5, shadowCount: 1 });
  });

  it('marks 3 of 4 absorbed as a four', () => {
    const verdict = dayVerdict(
      [
        atom({ id: 'a', ritualState: 'absorbed', absorbedOn: day }),
        atom({ id: 'b', ritualState: 'absorbed', absorbedOn: day }),
        atom({ id: 'c', ritualState: 'absorbed', absorbedOn: day }),
        atom({ id: 'd', ritualState: 'burned' }),
      ],
      day,
      today,
      [],
    );

    expect(verdict).toMatchObject({ kind: 'scored', score: 4 });
  });

  it('marks half done as a three', () => {
    const verdict = dayVerdict(
      [
        atom({ id: 'a', ritualState: 'absorbed', absorbedOn: day }),
        atom({ id: 'b', ritualState: 'burned' }),
      ],
      day,
      today,
      [],
    );

    expect(verdict).toMatchObject({ kind: 'scored', score: 3, absorbed: 1, total: 2 });
  });

  it('counts leftover pending as a miss', () => {
    const verdict = dayVerdict(
      [atom({ ritualState: 'pending' })],
      day,
      today,
      [],
    );

    expect(verdict).toMatchObject({ kind: 'scored', score: 1, absorbed: 0, total: 1 });
  });

  it('names an empty sunday without a mark', () => {
    expect(dayVerdict([], '2026-09-13', today, [])).toEqual({ kind: 'empty', sunday: true });
  });

  it('names an empty weekday without a mark', () => {
    expect(dayVerdict([], day, today, [])).toEqual({ kind: 'empty', sunday: false });
  });

  it('maps each mark to a chronicle line', () => {
    expect(dayVerdictLineKey(5)).toBe('verdict.line.5');
    expect(dayVerdictLineKey(1)).toBe('verdict.line.1');
  });
});
