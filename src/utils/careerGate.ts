import {
  clampPercentScore,
  PERCENT_SCORE_MAX,
  type HumanDimension,
  type HumanDimensionId,
} from '@/types/grail';

/** First career wall on Craft & Career in the life field. */
export const CAREER_GATE_FIRST = 50;
/** Written onto Craft & Career when the 50% wall is confirmed. */
export const CAREER_BREAK_SCORE = 51;
/** Each confirmed breakthrough raises the ceiling by this much, up to 100. */
export const CAREER_GATE_STEP = 15;

export const CAREER_BREAKTHROUGH_IDS = ['role', 'pay', 'skill', 'craft'] as const;
export type CareerBreakthroughId = (typeof CAREER_BREAKTHROUGH_IDS)[number];

export const CAREER_CEILINGS = [50, 65, 80, 95, 100] as const;
export const CAREER_FLOORS = [0, 50, 65, 80, 95] as const;

export function isCareerBreakthroughId(value: string): value is CareerBreakthroughId {
  return (CAREER_BREAKTHROUGH_IDS as readonly string[]).includes(value);
}

export function nextCareerCeiling(current: number): number {
  const clamped = clampPercentScore(current);
  if (clamped >= PERCENT_SCORE_MAX) {
    return PERCENT_SCORE_MAX;
  }

  return clampPercentScore(Math.min(PERCENT_SCORE_MAX, clamped + CAREER_GATE_STEP));
}

/**
 * The wall that practice can hit after a survey. The survey score itself
 * stays visible: 54 and 64 look at 65, 67 looks at 80.
 */
export function ceilingAboveScore(score: number): number {
  const clamped = clampPercentScore(score);
  for (const step of CAREER_CEILINGS) {
    if (step > clamped) {
      return step;
    }
  }

  return PERCENT_SCORE_MAX;
}

/** Score written onto Craft & Career when that wall is confirmed. */
export function careerBreakScore(wall: number): number {
  return clampPercentScore(wall + 1);
}

export function isAtCareerWall(score: number, ceiling: number): boolean {
  return ceiling < PERCENT_SCORE_MAX && score >= ceiling;
}

export function sanitizeCareerCeiling(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return CAREER_GATE_FIRST;
  }

  const clamped = clampPercentScore(value);
  let chosen: number = CAREER_GATE_FIRST;

  for (const step of CAREER_CEILINGS) {
    if (step <= clamped) {
      chosen = step;
    }
  }

  return chosen;
}

export function sanitizeCareerFloor(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const clamped = clampPercentScore(value);
  let chosen = 0;

  for (const step of CAREER_FLOORS) {
    if (step > 0 && step <= clamped) {
      chosen = step;
    }
  }

  return chosen;
}

/**
 * Last broken wall inferred from a raised ceiling. A finished path (100)
 * does not assume a 95% break — that may be a grandfathered open gate.
 */
export function inferCareerFloor(careerCeiling: number): number {
  const ceiling = sanitizeCareerCeiling(careerCeiling);
  if (ceiling <= CAREER_GATE_FIRST || ceiling >= PERCENT_SCORE_MAX) {
    return 0;
  }

  return ceiling - CAREER_GATE_STEP;
}

export function resolveCareerCeiling(profile: {
  readonly careerCeiling?: unknown;
  readonly dimensions: { readonly craft_career?: HumanDimension };
}): number {
  if (profile.careerCeiling !== undefined) {
    return sanitizeCareerCeiling(profile.careerCeiling);
  }

  return profile.dimensions.craft_career?.isGated === false
    ? PERCENT_SCORE_MAX
    : CAREER_GATE_FIRST;
}

export function resolveCareerFloor(profile: {
  readonly careerFloor?: unknown;
  readonly careerCeiling?: unknown;
}): number {
  if (profile.careerFloor !== undefined) {
    return sanitizeCareerFloor(profile.careerFloor);
  }

  if (profile.careerCeiling === undefined) {
    return 0;
  }

  return inferCareerFloor(sanitizeCareerCeiling(profile.careerCeiling));
}

export function careerBreakthroughKey(
  id: CareerBreakthroughId,
): `career.kind.${CareerBreakthroughId}` {
  return `career.kind.${id}`;
}

/**
 * After a wall is broken, Craft & Career sits at wall + 1 and the next
 * ceiling is 15 points up. If the life tick pulls the vector back onto
 * that wall, the same mark returns and must be broken again.
 */
export function applyCareerRelapse(
  dimensions: Record<HumanDimensionId, HumanDimension>,
  careerCeiling: number,
  pinned: boolean,
  careerFloor = 0,
): {
  readonly dimensions: Record<HumanDimensionId, HumanDimension>;
  readonly careerCeiling: number;
  readonly careerFloor: number;
  readonly careerWallPinned: boolean;
} {
  const craft = dimensions.craft_career;
  const lastWall = careerFloor > 0 ? sanitizeCareerFloor(careerFloor) : inferCareerFloor(careerCeiling);
  const shouldPin = pinned || (lastWall > 0 && craft.score <= lastWall);

  if (!shouldPin) {
    return { dimensions, careerCeiling, careerFloor: lastWall, careerWallPinned: false };
  }

  const wall = lastWall > 0 ? lastWall : CAREER_GATE_FIRST;

  return {
    careerCeiling: wall,
    careerFloor: wall,
    careerWallPinned: true,
    dimensions: {
      ...dimensions,
      craft_career: { ...craft, score: wall, isGated: true },
    },
  };
}
