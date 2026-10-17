import {
  HUMAN_DIMENSION_IDS,
  LIFE_SCORE_RATE,
  WEEKLY_NORM_XP,
  type HumanDimension,
  type HumanDimensionId,
  type XpAbsorptionJournal,
} from '@/types/grail';
import {
  CRAFT_WEALTH_LINK,
  WEALTH_CRAFT_LINK,
  advanceLifeDimensions,
  advanceLifeScore,
  applyJournalXp,
  computeDayShare,
  coupleCraftWealthDimensions,
  createEmptyXpJournal,
  createStoppedLifeClocks,
  journalHasAnyXp,
  linkedDayShare,
  linkedPracticePartner,
  startLifeClock,
  trimXpJournal,
} from '@/utils/lifeScore';

function dimension(
  id: HumanDimensionId,
  score: number,
  isGated = false,
): HumanDimension {
  return { id, score, isGated };
}

function fullField(score: number): Record<HumanDimensionId, HumanDimension> {
  return HUMAN_DIMENSION_IDS.reduce(
    (acc, id) => {
      acc[id] = dimension(id, score, id === 'craft_career');
      return acc;
    },
    {} as Record<HumanDimensionId, HumanDimension>,
  );
}

describe('computeDayShare', () => {
  it('yields 0, never NaN, for an empty journal', () => {
    expect(computeDayShare(undefined, '2026-09-07')).toBe(0);
    expect(computeDayShare({}, '2026-09-07')).toBe(0);
    expect(Number.isNaN(computeDayShare({}, '2026-09-07'))).toBe(false);
  });

  it('is the share of the weekly norm inside the last seven days', () => {
    const days = { '2026-09-07': 15, '2026-09-06': 15, '2026-09-05': 15 };
    expect(computeDayShare(days, '2026-09-07')).toBe((45 / WEEKLY_NORM_XP) * 100);
  });

  it('ignores days outside the rolling window', () => {
    const days = { '2026-08-20': 90, '2026-09-07': 15 };
    expect(computeDayShare(days, '2026-09-07')).toBe((15 / WEEKLY_NORM_XP) * 100);
  });

  it('clamps a surplus of the weekly norm at 100', () => {
    expect(computeDayShare({ '2026-09-07': 90 }, '2026-09-07')).toBe(100);
  });
});

describe('applyJournalXp', () => {
  it('is symmetric: absorb then restore leaves the journal empty', () => {
    const afterAbsorb = applyJournalXp(createEmptyXpJournal(), 'physical', '2026-09-07', 15);
    expect(afterAbsorb.physical['2026-09-07']).toBe(15);
    expect(journalHasAnyXp(afterAbsorb)).toBe(true);

    const afterRestore = applyJournalXp(afterAbsorb, 'physical', '2026-09-07', -15);
    expect(afterRestore.physical['2026-09-07']).toBeUndefined();
    expect(journalHasAnyXp(afterRestore)).toBe(false);
    expect(computeDayShare(afterRestore.physical, '2026-09-07')).toBe(0);
  });

  it('subtracts from the absorb day even when restore happens later', () => {
    const absorbed = applyJournalXp(createEmptyXpJournal(), 'drive', '2026-09-06', 15);
    const restored = applyJournalXp(absorbed, 'drive', '2026-09-06', -15);

    expect(restored.drive['2026-09-06']).toBeUndefined();
    expect(restored.drive['2026-09-07']).toBeUndefined();
  });
});

describe('trimXpJournal', () => {
  it('drops days older than the 14-day retention window', () => {
    let journal: XpAbsorptionJournal = createEmptyXpJournal();
    journal = applyJournalXp(journal, 'spirit', '2026-08-20', 15);
    journal = applyJournalXp(journal, 'spirit', '2026-09-07', 15);

    const trimmed = trimXpJournal(journal, '2026-09-07');

    expect(trimmed.spirit['2026-08-20']).toBeUndefined();
    expect(trimmed.spirit['2026-09-07']).toBe(15);
  });

  it('keeps a day on the far edge of the 14-day window', () => {
    const journal = applyJournalXp(createEmptyXpJournal(), 'wealth', '2026-08-25', 15);
    const trimmed = trimXpJournal(journal, '2026-09-07');

    expect(trimmed.wealth['2026-08-25']).toBe(15);
  });
});

describe('advanceLifeScore', () => {
  it('converges to a held weekly-norm share', () => {
    const held = (15 / WEEKLY_NORM_XP) * 100;
    const life = advanceLifeScore(0, held, 50_000);

    expect(life).toBeCloseTo(held, 4);
  });

  it('uses the closed form across a multi-day gap', () => {
    const expected = 40 + (80 - 40) * Math.exp(-LIFE_SCORE_RATE * 10);
    expect(advanceLifeScore(80, 40, 10)).toBeCloseTo(expected, 10);
  });

  it('takes the discrete step on a single calendar day', () => {
    expect(advanceLifeScore(80, 40, 1)).toBeCloseTo(80 + LIFE_SCORE_RATE * (40 - 80), 10);
  });

  it('turns 65% at zero activity into about 10.5% over ten years', () => {
    expect(advanceLifeScore(65, 0, 3650)).toBeCloseTo(10.5, 1);
  });

  it('has no floor except zero', () => {
    expect(advanceLifeScore(0.01, 0, 3650)).toBeGreaterThanOrEqual(0);
    expect(advanceLifeScore(0.01, 0, 3650)).toBeLessThan(0.01);
  });
});

describe('advanceLifeDimensions', () => {
  it('leaves life still while no vector clock has started', () => {
    const next = advanceLifeDimensions(
      fullField(65),
      createEmptyXpJournal(),
      3,
      '2026-09-07',
      createStoppedLifeClocks(),
    );

    expect(next.physical.score).toBe(65);
    expect(next.wealth.score).toBe(65);
  });

  it('ages only the vectors whose clock has started', () => {
    const clocks = startLifeClock(createStoppedLifeClocks(), 'physical');
    const next = advanceLifeDimensions(
      fullField(65),
      createEmptyXpJournal(),
      3650,
      '2026-09-07',
      clocks,
    );

    expect(next.physical.score).toBeCloseTo(10.5, 1);
    expect(next.wealth.score).toBe(65);
    expect(next.craft_career.score).toBe(50);
  });

  it('moves wealth when only craft is practiced', () => {
    const clocks = startLifeClock(createStoppedLifeClocks(), 'craft_career');
    const journal = applyJournalXp(
      createEmptyXpJournal(),
      'craft_career',
      '2026-09-07',
      WEEKLY_NORM_XP,
    );
    const field = fullField(20);
    const next = advanceLifeDimensions(field, journal, 50_000, '2026-09-07', clocks, [], 100);

    expect(next.craft_career.score).toBeCloseTo(100, 1);
    expect(next.wealth.score).toBeCloseTo(CRAFT_WEALTH_LINK * 100, 1);
    expect(next.wealth.score).not.toBe(20);
    expect(next.physical.score).toBe(20);
  });
});

describe('craft–wealth link', () => {
  it('names the partner on either side and on no other vector', () => {
    expect(linkedPracticePartner('craft_career')).toBe('wealth');
    expect(linkedPracticePartner('wealth')).toBe('craft_career');
    expect(linkedPracticePartner('physical')).toBeNull();
  });

  it('pulls wealth toward craft without ratcheting the share', () => {
    const once = linkedDayShare('wealth', 80, 0);
    const again = linkedDayShare('wealth', 80, 0);

    expect(once).toBeCloseTo(CRAFT_WEALTH_LINK * 80, 10);
    expect(again).toBe(once);
    expect(linkedDayShare('craft_career', 80, 0)).toBe(80);
  });

  it('pulls craft toward wealth only a little', () => {
    expect(linkedDayShare('craft_career', 0, 80)).toBeCloseTo(WEALTH_CRAFT_LINK * 80, 10);
    expect(linkedDayShare('wealth', 0, 80)).toBe(80);
  });

  it('lifts the survey field once from the same rates', () => {
    const coupled = coupleCraftWealthDimensions(fullField(0));
    expect(coupled.wealth.score).toBe(0);
    expect(coupled.craft_career.score).toBe(0);

    const fromCraft = coupleCraftWealthDimensions({
      ...fullField(0),
      craft_career: dimension('craft_career', 50, true),
    });
    expect(fromCraft.wealth.score).toBeCloseTo(CRAFT_WEALTH_LINK * 50, 10);
    expect(fromCraft.craft_career.score).toBe(50);
  });
});
