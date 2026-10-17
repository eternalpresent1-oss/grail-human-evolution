import { createInitialProfile } from '@/constants/mockData';
import { HUMAN_DIMENSION_IDS } from '@/types/grail';
import { needsFirstRunGate } from '@/utils/firstRun';
import { isSurveyBaseComplete, surveyProgress } from '@/utils/lifeSurvey';
import { SURVEY_QUESTIONS } from '@/constants/lifeSurvey';

describe('createInitialProfile', () => {
  it('starts the octagon empty so a first launch is not a fake life', () => {
    const profile = createInitialProfile();

    for (const id of HUMAN_DIMENSION_IDS) {
      expect(profile.dimensions[id]?.score).toBe(0);
    }
    expect(profile.disciplineScore).toBe(50);
    expect(profile.currentStreak).toBe(0);
  });
});

describe('needsFirstRunGate', () => {
  it('stops a fresh profile until the survey is written', () => {
    expect(
      needsFirstRunGate({ surveyApplied: false, profile: createInitialProfile() }),
    ).toBe(true);
  });

  it('lets a finished survey through', () => {
    expect(
      needsFirstRunGate({ surveyApplied: true, profile: createInitialProfile() }),
    ).toBe(false);
  });

  it('does not send an older save with a living octagon back to the gate', () => {
    const baseline = createInitialProfile();
    const physical = baseline.dimensions.physical;
    const profile = {
      ...baseline,
      dimensions: {
        ...baseline.dimensions,
        physical: { ...physical, score: 64 },
      },
    };

    expect(needsFirstRunGate({ surveyApplied: false, profile })).toBe(false);
  });
});

describe('isSurveyBaseComplete', () => {
  it('is true only when every base question has an answer', () => {
    expect(isSurveyBaseComplete(surveyProgress({}))).toBe(false);

    const answers = Object.fromEntries(
      SURVEY_QUESTIONS.filter((question) => question.tier === 'base').map((question) => [
        question.id,
        question.options[0]?.id ?? 'none',
      ]),
    );

    expect(isSurveyBaseComplete(surveyProgress(answers))).toBe(true);
  });
});
