import { createInitialProfile } from '@/constants/mockData';
import {
  applyBreathPracticeReward,
  BREATH_EXHALE_MS,
  BREATH_HOLD_MS,
  BREATH_INHALE_MS,
  BREATH_SCORE_DELTA,
  BREATH_SESSION_MS,
  BREATH_XP,
  breathPhaseBeat,
  canAwardBreathPractice,
} from '@/utils/breathPractice';

describe('breath practice reward', () => {
  it('awards once a calendar day', () => {
    expect(canAwardBreathPractice('', '2026-09-14')).toBe(true);
    expect(canAwardBreathPractice(undefined, '2026-09-14')).toBe(true);
    expect(canAwardBreathPractice('2026-09-14', '2026-09-14')).toBe(false);
    expect(canAwardBreathPractice('2026-09-13', '2026-09-14')).toBe(true);
    expect(BREATH_SESSION_MS).toBe(3 * 60 * 1_000);
  });

  it('lifts spirit and the mind by a few points', () => {
    const before = createInitialProfile();
    const next = applyBreathPracticeReward(before, '2026-09-14');

    expect(next.dimensions.mind_psyche.score).toBe(
      before.dimensions.mind_psyche.score + BREATH_SCORE_DELTA,
    );
    expect(next.dimensions.spirit.score).toBe(before.dimensions.spirit.score + BREATH_SCORE_DELTA);
    expect(next.xpJournal.mind_psyche['2026-09-14']).toBe(BREATH_XP);
    expect(next.xpJournal.spirit['2026-09-14']).toBe(BREATH_XP);
    expect(next.lifeClockStarted.mind_psyche).toBe(true);
    expect(next.lifeClockStarted.spirit).toBe(true);
  });
});

describe('breathPhaseBeat', () => {
  it('counts 1–4 through the inhale', () => {
    expect(breathPhaseBeat(0, BREATH_INHALE_MS)).toBe(1);
    expect(breathPhaseBeat(999, BREATH_INHALE_MS)).toBe(1);
    expect(breathPhaseBeat(1_000, BREATH_INHALE_MS)).toBe(2);
    expect(breathPhaseBeat(3_000, BREATH_INHALE_MS)).toBe(4);
    expect(breathPhaseBeat(3_999, BREATH_INHALE_MS)).toBe(4);
    expect(breathPhaseBeat(4_000, BREATH_INHALE_MS)).toBe(4);
  });

  it('counts 1–3 through the hold and 1–6 through the exhale', () => {
    expect(breathPhaseBeat(0, BREATH_HOLD_MS)).toBe(1);
    expect(breathPhaseBeat(2_500, BREATH_HOLD_MS)).toBe(3);
    expect(breathPhaseBeat(0, BREATH_EXHALE_MS)).toBe(1);
    expect(breathPhaseBeat(5_000, BREATH_EXHALE_MS)).toBe(6);
  });
});
