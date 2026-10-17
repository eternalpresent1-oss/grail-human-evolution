import { HUMAN_DIMENSION_IDS, type UserProfile } from '@/types/grail';
import { journalHasAnyXp } from '@/utils/lifeScore';

/**
 * A new life has empty scales. Anyone who already lived in the field — XP or
 * a non-zero octagon from an older build — is not sent back through the gate.
 */
export function needsFirstRunGate(input: {
  readonly surveyApplied: boolean;
  readonly profile: UserProfile;
}): boolean {
  if (input.surveyApplied) {
    return false;
  }

  if (journalHasAnyXp(input.profile.xpJournal)) {
    return false;
  }

  return !HUMAN_DIMENSION_IDS.some((id) => (input.profile.dimensions[id]?.score ?? 0) > 0);
}
