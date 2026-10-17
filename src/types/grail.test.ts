import {
  applyDimensionCaps,
  capDimensionScore,
  clampPercentScore,
  computeCharacterLevel,
  getDailyDimensionProgress,
  HUMAN_DIMENSION_IDS,
  isOnAtomizerDay,
  isOnDailyRoster,
  isAtomDueInFuture,
  isAtomSealed,
  type AtomizedTask,
  type HumanDimension,
  type HumanDimensionId,
} from '@/types/grail';

function dimension(overrides: Partial<HumanDimension> = {}): HumanDimension {
  return {
    id: 'physical',
    score: 50,
    isGated: false,
    ...overrides,
  };
}

function atom(overrides: Partial<AtomizedTask> = {}): AtomizedTask {
  return {
    id: 'atom-1',
    content: { source: 'custom', title: 'Атом' },
    dimensionId: 'physical',
    kind: 'custom',
    ritualState: 'pending',
    isCompleted: false,
    isNonNegotiable: true,
    proofRequired: false,
    xpReward: 15,
    isOverdue: false,
    ...overrides,
  };
}

describe('clampPercentScore', () => {
  it('keeps values inside 0–100', () => {
    expect(clampPercentScore(-20)).toBe(0);
    expect(clampPercentScore(140)).toBe(100);
    expect(clampPercentScore(42)).toBe(42);
  });
});

describe('capDimensionScore', () => {
  it('clamps by gate and the percent range', () => {
    expect(capDimensionScore(dimension(), 120)).toBe(100);
    expect(capDimensionScore(dimension(), -4)).toBe(0);
    expect(capDimensionScore(dimension({ id: 'craft_career', isGated: true }), 90)).toBe(50);
    expect(capDimensionScore(dimension({ id: 'craft_career', isGated: false }), 90, 100)).toBe(90);
    expect(capDimensionScore(dimension({ id: 'craft_career' }), 90, 65)).toBe(65);
  });
});

describe('applyDimensionCaps', () => {
  it('holds a gated Craft & Career vector at 50', () => {
    const dimensions = HUMAN_DIMENSION_IDS.reduce(
      (acc, id) => {
        acc[id] = dimension({ id, score: 80, isGated: id === 'craft_career' });
        return acc;
      },
      {} as Record<HumanDimensionId, HumanDimension>,
    );

    const capped = applyDimensionCaps(dimensions, 50);

    expect(capped.craft_career.score).toBe(50);
    expect(capped.physical.score).toBe(80);
  });
});

describe('computeCharacterLevel', () => {
  it('scales the mean score by age and never drops below 1', () => {
    const dimensions = HUMAN_DIMENSION_IDS.reduce(
      (acc, id) => {
        acc[id] = dimension({ id, score: 50 });
        return acc;
      },
      {} as Record<HumanDimensionId, HumanDimension>,
    );

    expect(computeCharacterLevel(28, dimensions)).toBe(14);

    const empty = HUMAN_DIMENSION_IDS.reduce(
      (acc, id) => {
        acc[id] = dimension({ id, score: 0 });
        return acc;
      },
      {} as Record<HumanDimensionId, HumanDimension>,
    );

    expect(computeCharacterLevel(28, empty)).toBe(1);
  });
});

describe('getDailyDimensionProgress', () => {
  it('reports absorbed over assigned per vector', () => {
    const progress = getDailyDimensionProgress([
      atom({ id: 'a', ritualState: 'absorbed', isCompleted: true }),
      atom({ id: 'b' }),
    ]);

    expect(progress.physical).toEqual({ totalToday: 2, completedToday: 1, score: 50 });
  });

  it('drops burned atoms from both numerator and denominator', () => {
    const progress = getDailyDimensionProgress([
      atom({ id: 'a', ritualState: 'absorbed', isCompleted: true }),
      atom({ id: 'b', ritualState: 'burned' }),
    ]);

    expect(progress.physical).toEqual({ totalToday: 1, completedToday: 1, score: 100 });
  });

  it('yields 0 rather than NaN when nothing is assigned', () => {
    const progress = getDailyDimensionProgress([]);

    for (const id of HUMAN_DIMENSION_IDS) {
      expect(progress[id].score).toBe(0);
    }
  });

  it('counts rest on both physics and mind for that day only', () => {
    const rest = atom({
      id: 'rest',
      kind: 'canon',
      scheduledOn: '2026-09-12',
      dualDimensionId: 'mind_psyche',
      ritualState: 'absorbed',
      isCompleted: true,
    });

    const progress = getDailyDimensionProgress([rest], '2026-09-12');

    expect(progress.physical).toEqual({ totalToday: 1, completedToday: 1, score: 100 });
    expect(progress.mind_psyche).toEqual({ totalToday: 1, completedToday: 1, score: 100 });
    expect(getDailyDimensionProgress([rest], '2026-09-11').physical.totalToday).toBe(0);
  });

  it('keeps a pending campaign atom on the desk without a schedule', () => {
    const campaignAtom = atom({ kind: 'campaign', campaignId: 'campaign-1' });

    expect(getDailyDimensionProgress([campaignAtom], '2026-09-08').physical.totalToday).toBe(1);
    expect(getDailyDimensionProgress([campaignAtom], '2026-09-08').physical.completedToday).toBe(0);
  });

  it('keeps a scheduled custom atom off other days', () => {
    const future = atom({ scheduledOn: '2026-09-15' });

    expect(isOnDailyRoster(future, '2026-09-12')).toBe(false);
    expect(isOnDailyRoster(future, '2026-09-15')).toBe(true);
    expect(isOnAtomizerDay(future, '2026-09-12', '2026-09-12')).toBe(false);
    expect(isOnAtomizerDay(future, '2026-09-15', '2026-09-12')).toBe(true);
    expect(isAtomDueInFuture(future, '2026-09-12')).toBe(true);
    expect(isAtomDueInFuture(future, '2026-09-15')).toBe(false);
    expect(isAtomDueInFuture(atom(), '2026-09-12')).toBe(false);
  });

  it('seals a past day so the chronicle cannot rewrite', () => {
    const leftover = atom({ scheduledOn: '2026-09-11' });
    const absorbed = atom({
      ritualState: 'absorbed',
      isCompleted: true,
      absorbedOn: '2026-09-11',
      scheduledOn: '2026-09-11',
    });
    const burned = atom({ ritualState: 'burned', scheduledOn: '2026-09-11' });
    const live = atom();
    const todayAbsorbed = atom({
      ritualState: 'absorbed',
      isCompleted: true,
      absorbedOn: '2026-09-12',
    });
    const future = atom({ scheduledOn: '2026-09-15' });
    const canonYesterday = atom({
      kind: 'canon',
      scheduledOn: '2026-09-11',
    });

    expect(isAtomSealed(leftover, '2026-09-12')).toBe(true);
    expect(isAtomSealed(absorbed, '2026-09-12')).toBe(true);
    expect(isAtomSealed(burned, '2026-09-12')).toBe(true);
    expect(isAtomSealed(canonYesterday, '2026-09-12')).toBe(true);
    expect(isAtomSealed(live, '2026-09-12')).toBe(false);
    expect(isAtomSealed(todayAbsorbed, '2026-09-12')).toBe(false);
    expect(isAtomSealed(future, '2026-09-12')).toBe(false);
  });
});
