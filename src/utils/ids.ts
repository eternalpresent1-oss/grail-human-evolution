let sequence = 0;

/**
 * Collision-free atom id. `Date.now()` alone repeats when two atoms are created
 * inside the same millisecond, which broke ritual actions keyed by id.
 */
export function createAtomId(): string {
  sequence += 1;
  return `atom-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function createShadowEventId(): string {
  sequence += 1;
  return `shadow-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function createCampaignId(): string {
  sequence += 1;
  return `campaign-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function createMethodSignalId(): string {
  sequence += 1;
  return `signal-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function createTalentId(): string {
  sequence += 1;
  return `talent-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function createCounselId(): string {
  sequence += 1;
  return `counsel-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function createAchievementId(): string {
  sequence += 1;
  return `feat-${Date.now().toString(36)}-${sequence.toString(36)}`;
}
