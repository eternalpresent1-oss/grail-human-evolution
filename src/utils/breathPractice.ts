import { clampPercentScore, type HumanDimensionId, type UserProfile } from '@/types/grail';
import { applyJournalXp, startLifeClock, trimXpJournal } from '@/utils/lifeScore';
import { withDerivedScores } from '@/utils/profile';

export const BREATH_INHALE_MS = 4_000;
export const BREATH_HOLD_MS = 3_000;
export const BREATH_EXHALE_MS = 6_000;
export const BREATH_PREP_MS = 5_000;

/** Counts 1..N through a phase so the label can read «Вдох 1» … «Вдох 4». */
export function breathPhaseBeat(elapsedMs: number, durationMs: number): number {
  const max = Math.max(1, Math.round(durationMs / 1000));
  return Math.min(max, Math.max(1, Math.floor(Math.max(0, elapsedMs) / 1000) + 1));
}

export const BREATH_SESSION_MS = 3 * 60 * 1_000;
export const BREATH_SCORE_DELTA = 3;
export const BREATH_XP = 5;
export const BREATH_DIMENSIONS = ['mind_psyche', 'spirit'] as const satisfies readonly HumanDimensionId[];

export function canAwardBreathPractice(awardedOn: string | undefined, today: string): boolean {
  return awardedOn !== today && today.length > 0;
}

export function applyBreathPracticeReward(profile: UserProfile, today: string): UserProfile {
  let xpJournal = profile.xpJournal;
  let lifeClockStarted = profile.lifeClockStarted;
  const dimensions = { ...profile.dimensions };

  for (const id of BREATH_DIMENSIONS) {
    xpJournal = applyJournalXp(xpJournal, id, today, BREATH_XP);
    lifeClockStarted = startLifeClock(lifeClockStarted, id);
    const current = dimensions[id];
    dimensions[id] = {
      ...current,
      score: clampPercentScore(current.score + BREATH_SCORE_DELTA),
    };
  }

  return withDerivedScores({
    ...profile,
    xpJournal: trimXpJournal(xpJournal, today),
    lifeClockStarted,
    dimensions,
  });
}
