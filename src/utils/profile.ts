import { applyDimensionCaps, computeCharacterLevel, type UserProfile } from '@/types/grail';
import { computeAge } from '@/utils/birthDate';
import { applyCareerRelapse, resolveCareerCeiling, resolveCareerFloor } from '@/utils/careerGate';

/** Current age of the user, derived from the stored date of birth. */
export function profileAge(profile: UserProfile, today: Date = new Date()): number {
  return computeAge(profile.birthDate, today);
}

/**
 * Re-applies the career ceiling and rebuilds the character level after a birth
 * date change, a life tick, or a gate unlock. Shared by the store and by
 * persist migrations, so a rehydrated profile is derived exactly like a live one.
 */
export function withDerivedScores(
  profile: Omit<UserProfile, 'careerCeiling' | 'careerFloor' | 'careerWallPinned'> & {
    readonly careerCeiling?: number;
    readonly careerFloor?: number;
    readonly careerWallPinned?: boolean;
  },
): UserProfile {
  const relapse = applyCareerRelapse(
    profile.dimensions,
    resolveCareerCeiling(profile),
    profile.careerWallPinned === true,
    resolveCareerFloor(profile),
  );
  const dimensions = applyDimensionCaps(relapse.dimensions, relapse.careerCeiling);

  return {
    ...profile,
    careerCeiling: relapse.careerCeiling,
    careerFloor: relapse.careerFloor,
    careerWallPinned: relapse.careerWallPinned,
    dimensions,
    characterLevel: computeCharacterLevel(computeAge(profile.birthDate), dimensions),
  };
}
