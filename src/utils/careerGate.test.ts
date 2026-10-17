import {
  HUMAN_DIMENSION_IDS,
  type HumanDimension,
  type HumanDimensionId,
} from '@/types/grail';
import { createInitialProfile } from '@/constants/mockData';
import { withDerivedScores } from '@/utils/profile';
import {
  applyCareerRelapse,
  careerBreakScore,
  CAREER_BREAK_SCORE,
  CAREER_GATE_FIRST,
  inferCareerFloor,
  isAtCareerWall,
  nextCareerCeiling,
  ceilingAboveScore,
  resolveCareerCeiling,
  resolveCareerFloor,
  sanitizeCareerCeiling,
} from '@/utils/careerGate';

function field(craftScore: number): Record<HumanDimensionId, HumanDimension> {
  return HUMAN_DIMENSION_IDS.reduce(
    (next, id) => {
      next[id] = {
        id,
        score: id === 'craft_career' ? craftScore : 40,
        isGated: id === 'craft_career',
      };
      return next;
    },
    {} as Record<HumanDimensionId, HumanDimension>,
  );
}

describe('career ceiling', () => {
  it('raises 50 → 65 → 80 → 95 → 100 and then holds', () => {
    expect(nextCareerCeiling(CAREER_GATE_FIRST)).toBe(65);
    expect(nextCareerCeiling(65)).toBe(80);
    expect(nextCareerCeiling(80)).toBe(95);
    expect(nextCareerCeiling(95)).toBe(100);
    expect(nextCareerCeiling(100)).toBe(100);
  });

  it('places the next wall above the survey score', () => {
    expect(ceilingAboveScore(40)).toBe(50);
    expect(ceilingAboveScore(50)).toBe(65);
    expect(ceilingAboveScore(54)).toBe(65);
    expect(ceilingAboveScore(64)).toBe(65);
    expect(ceilingAboveScore(67)).toBe(80);
    expect(ceilingAboveScore(80)).toBe(95);
    expect(ceilingAboveScore(100)).toBe(100);
  });

  it('writes wall + 1% on every breakthrough', () => {
    expect(careerBreakScore(50)).toBe(CAREER_BREAK_SCORE);
    expect(careerBreakScore(65)).toBe(66);
    expect(careerBreakScore(80)).toBe(81);
    expect(careerBreakScore(95)).toBe(96);
  });

  it('treats the wall as score at a ceiling below 100', () => {
    expect(isAtCareerWall(50, 50)).toBe(true);
    expect(isAtCareerWall(49.9, 50)).toBe(false);
    expect(isAtCareerWall(100, 100)).toBe(false);
  });

  it('snaps a stored ceiling down onto a real step', () => {
    expect(sanitizeCareerCeiling(undefined)).toBe(50);
    expect(sanitizeCareerCeiling(70)).toBe(65);
    expect(sanitizeCareerCeiling(100)).toBe(100);
  });

  it('reads an old ungated craft vector as an open path', () => {
    expect(
      resolveCareerCeiling({
        dimensions: { craft_career: { id: 'craft_career', score: 50, isGated: false } },
      }),
    ).toBe(100);
    expect(
      resolveCareerCeiling({
        dimensions: { craft_career: { id: 'craft_career', score: 50, isGated: true } },
      }),
    ).toBe(50);
  });

  it('infers the last broken wall from a raised ceiling', () => {
    expect(inferCareerFloor(50)).toBe(0);
    expect(inferCareerFloor(65)).toBe(50);
    expect(inferCareerFloor(80)).toBe(65);
    expect(inferCareerFloor(95)).toBe(80);
    expect(inferCareerFloor(100)).toBe(0);
    expect(resolveCareerFloor({ careerCeiling: 80 })).toBe(65);
    expect(resolveCareerFloor({ careerFloor: 95, careerCeiling: 100 })).toBe(95);
  });

  it('pins Craft & Career back on each last wall after decay', () => {
    const atFifty = applyCareerRelapse(field(49.2), 65, false, 50);
    expect(atFifty.careerCeiling).toBe(50);
    expect(atFifty.careerFloor).toBe(50);
    expect(atFifty.careerWallPinned).toBe(true);
    expect(atFifty.dimensions.craft_career.score).toBe(50);

    const atSixtyFive = applyCareerRelapse(field(65), 80, false, 65);
    expect(atSixtyFive.careerCeiling).toBe(65);
    expect(atSixtyFive.careerWallPinned).toBe(true);
    expect(atSixtyFive.dimensions.craft_career.score).toBe(65);

    const atNinetyFive = applyCareerRelapse(field(94.8), 100, false, 95);
    expect(atNinetyFive.careerCeiling).toBe(95);
    expect(atNinetyFive.careerWallPinned).toBe(true);
    expect(atNinetyFive.dimensions.craft_career.score).toBe(95);
  });

  it('leaves wall + 1% under the next ceiling alone', () => {
    const held = applyCareerRelapse(field(66), 80, false, 65);

    expect(held.careerCeiling).toBe(80);
    expect(held.careerFloor).toBe(65);
    expect(held.careerWallPinned).toBe(false);
    expect(held.dimensions.craft_career.score).toBe(66);
  });

  it('does not pin a finished path that never broke 95%', () => {
    const open = applyCareerRelapse(field(40), 100, false, 0);

    expect(open.careerCeiling).toBe(100);
    expect(open.careerWallPinned).toBe(false);
    expect(open.dimensions.craft_career.score).toBe(40);
  });

  it('keeps a pinned wall in place until the next breakthrough', () => {
    const held = applyCareerRelapse(field(65), 65, true, 65);

    expect(held.careerCeiling).toBe(65);
    expect(held.careerWallPinned).toBe(true);
    expect(held.dimensions.craft_career.score).toBe(65);
  });
});

describe('career breakthrough derivation', () => {
  it('writes +1% after each wall and pins again when decay hits that mark', () => {
    const baseline = createInitialProfile();
    const walls = [
      { wall: 50, next: 65, broken: 51 },
      { wall: 65, next: 80, broken: 66 },
      { wall: 80, next: 95, broken: 81 },
      { wall: 95, next: 100, broken: 96 },
    ] as const;

    for (const step of walls) {
      const broken = withDerivedScores({
        ...baseline,
        careerCeiling: step.next,
        careerFloor: step.wall,
        careerWallPinned: false,
        dimensions: {
          ...baseline.dimensions,
          craft_career: {
            ...baseline.dimensions.craft_career,
            score: step.broken,
            isGated: step.next < 100,
          },
        },
      });

      expect(broken.careerCeiling).toBe(step.next);
      expect(broken.careerFloor).toBe(step.wall);
      expect(broken.careerWallPinned).toBe(false);
      expect(broken.dimensions.craft_career.score).toBe(step.broken);

      const decayed = withDerivedScores({
        ...broken,
        dimensions: {
          ...broken.dimensions,
          craft_career: { ...broken.dimensions.craft_career, score: step.wall },
        },
      });

      expect(decayed.careerCeiling).toBe(step.wall);
      expect(decayed.careerFloor).toBe(step.wall);
      expect(decayed.careerWallPinned).toBe(true);
      expect(decayed.dimensions.craft_career.score).toBe(step.wall);
      expect(isAtCareerWall(decayed.dimensions.craft_career.score, decayed.careerCeiling)).toBe(
        true,
      );
    }
  });
});
