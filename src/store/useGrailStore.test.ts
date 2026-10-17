import { SURVEY_QUESTIONS } from '@/constants/lifeSurvey';
import { createBaselineState } from '@/store/migrations';
import { useGrailStore } from '@/store/useGrailStore';
import { type Campaign } from '@/types/campaign';
import { DISCIPLINE_STEP_IDS } from '@/types/discipline';
import { type AtomizedTask } from '@/types/grail';
import { generateCanonWeek } from '@/utils/canonWeek';
import { dayVerdict } from '@/utils/dayVerdict';
import { needsFirstRunGate } from '@/utils/firstRun';
import { isoWeekday, localDateKey, shiftDateKey, weekMondayOf } from '@/utils/taskTime';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function yesterdayKey(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

function customAtom(overrides: Partial<AtomizedTask> = {}): AtomizedTask {
  return {
    id: 'atom-custom',
    content: { source: 'custom', title: 'Custom' },
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

function goal(): Campaign {
  return {
    id: 'campaign-1',
    title: 'Become an engineer',
    horizonMonths: 60,
    startedOn: '2026-01-01',
    status: 'active',
    primary: 'craft_career',
    supporting: ['intellect', 'drive'],
    vectorsConfirmed: true,
    created: true,
    takenAdviceIds: [],
  };
}

function resetStore(overrides: Partial<ReturnType<typeof createBaselineState>> = {}): void {
  useGrailStore.setState({
    ...createBaselineState(),
    isHydrated: true,
    ...overrides,
  });
}

describe('talent tree', () => {
  beforeEach(() => {
    resetStore();
  });

  it('returns this week’s scale points when that node is removed', () => {
    const today = localDateKey();
    useGrailStore.getState().addTalent({ dimensionId: 'physical', title: 'бокс' });
    expect(useGrailStore.getState().profile.xpJournal.physical[today]).toBe(5);

    const id = useGrailStore.getState().talents[0]?.id ?? '';
    useGrailStore.getState().removeTalent(id);

    expect(useGrailStore.getState().talents).toHaveLength(0);
    expect(useGrailStore.getState().profile.xpJournal.physical[today]).toBeUndefined();
  });

  it('keeps the week’s points when a later node, which did not move the scale, is removed', () => {
    const today = localDateKey();
    useGrailStore.getState().addTalent({ dimensionId: 'physical', title: 'бокс' });
    useGrailStore.getState().addTalent({ dimensionId: 'physical', title: 'спарринг' });
    useGrailStore.getState().addTalent({ dimensionId: 'physical', title: 'лапы' });
    expect(useGrailStore.getState().profile.xpJournal.physical[today]).toBe(10);

    const third = useGrailStore.getState().talents[2]?.id ?? '';
    useGrailStore.getState().removeTalent(third);

    expect(useGrailStore.getState().profile.xpJournal.physical[today]).toBe(10);
  });

  it('does not move the craft scale when a career talent is named', () => {
    const today = localDateKey();
    useGrailStore.getState().addTalent({ dimensionId: 'craft_career', title: 'сварка' });

    expect(useGrailStore.getState().talents).toHaveLength(1);
    expect(useGrailStore.getState().profile.xpJournal.craft_career[today]).toBeUndefined();
  });

  it('renames a talent without moving its year', () => {
    useGrailStore.getState().addTalent({ dimensionId: 'spirit', title: 'гитара' });
    const node = useGrailStore.getState().talents[0];
    useGrailStore.getState().renameTalent(node?.id ?? '', 'скрипка');

    const renamed = useGrailStore.getState().talents[0];
    expect(renamed?.title).toBe('скрипка');
    expect(renamed?.createdOn).toBe(node?.createdOn);
  });
});

describe('closed chronicle', () => {
  it('keeps unopened weekdays as not done across two months', () => {
    const today = localDateKey();
    const start = weekMondayOf(shiftDateKey(today, -70));
    const baseline = createBaselineState();

    resetStore({
      tasks: generateCanonWeek(start),
      profile: {
        ...baseline.profile,
        lastDecayDate: start,
        firstOpenOn: start,
        canonWeekStart: start,
      },
    });

    useGrailStore.getState().checkTaskDeadlines();

    const tasks = useGrailStore.getState().tasks;
    const tuesday = shiftDateKey(start, 1);
    expect(dayVerdict(tasks, tuesday, today, []).kind).toBe('scored');
    expect(
      tasks.filter((task) => task.scheduledOn === tuesday).every((task) => task.ritualState === 'burned'),
    ).toBe(true);
    expect(tasks.some((task) => task.kind === 'canon' && (task.scheduledOn ?? '') < start)).toBe(false);
    if (isoWeekday(today) !== 7) {
      expect(
        tasks.some((task) => task.scheduledOn === today && task.kind === 'canon' && task.ritualState === 'pending'),
      ).toBe(true);
    }
  });
});

describe('past-day ritual', () => {
  beforeEach(() => {
    resetStore();
  });

  it('does not absorb, burn, restore, remove or erase an atom that belongs to yesterday', () => {
    const yesterday = yesterdayKey();
    const leftover = customAtom({ id: 'past-pending', scheduledOn: yesterday });
    const absorbed = customAtom({
      id: 'past-absorbed',
      ritualState: 'absorbed',
      isCompleted: true,
      scheduledOn: yesterday,
      absorbedOn: yesterday,
    });
    const burned = customAtom({
      id: 'past-burned',
      ritualState: 'burned',
      scheduledOn: yesterday,
    });

    resetStore({
      tasks: [leftover, absorbed, burned],
    });

    const store = useGrailStore.getState();
    store.absorbTask('past-pending');
    store.burnTask('past-pending');
    store.restoreTask('past-absorbed');
    store.removeTask('past-pending');
    store.eraseChronicle('past-burned');

    const byId = Object.fromEntries(useGrailStore.getState().tasks.map((task) => [task.id, task]));
    expect(byId['past-pending']?.ritualState).toBe('pending');
    expect(byId['past-absorbed']?.ritualState).toBe('absorbed');
    expect(byId['past-burned']?.ritualState).toBe('burned');
  });

  it('wakes the wealth clock when a craft atom is absorbed today', () => {
    resetStore({
      tasks: [customAtom({ id: 'craft-today', dimensionId: 'craft_career' })],
    });

    useGrailStore.getState().absorbTask('craft-today');

    const clocks = useGrailStore.getState().profile.lifeClockStarted;
    expect(clocks.craft_career).toBe(true);
    expect(clocks.wealth).toBe(true);
    expect(clocks.physical).toBe(false);
  });
});

describe('resetProgress', () => {
  it('burns custom and campaign atoms and shadow, keeps canon and the life field', () => {
    const baseline = createBaselineState();
    const lifeScore = 41;
    const profile = {
      ...baseline.profile,
      dimensions: {
        ...baseline.profile.dimensions,
        physical: { ...baseline.profile.dimensions.physical, score: lifeScore },
      },
    };
    const canon = baseline.tasks.filter((task) => task.kind === 'canon');
    expect(canon.length).toBeGreaterThan(0);

    resetStore({
      profile,
      driveLine: 'Build the field',
      campaigns: [goal()],
      shadowEvents: [{ id: 'shadow-1', catalogId: 'broke_word', occurredOn: localDateKey() }],
      tasks: [
        ...canon,
        customAtom({ id: 'mine' }),
        customAtom({
          id: 'goal-atom',
          kind: 'campaign',
          campaignId: 'campaign-1',
        }),
      ],
    });

    useGrailStore.getState().resetProgress();

    const next = useGrailStore.getState();
    expect(next.tasks.every((task) => task.kind === 'canon')).toBe(true);
    expect(next.tasks).toHaveLength(canon.length);
    expect(next.shadowEvents).toEqual([]);
    expect(next.campaigns).toEqual([goal()]);
    expect(next.driveLine).toBe('Build the field');
    expect(next.profile.dimensions.physical.score).toBe(lifeScore);
  });
});

describe('resetAllData', () => {
  it('returns the save to the first opening and opens the first-run gate', () => {
    const baseline = createBaselineState();
    const named = {
      ...baseline.profile,
      name: 'Tony',
      dimensions: {
        ...baseline.profile.dimensions,
        physical: { ...baseline.profile.dimensions.physical, score: 41 },
      },
    };

    resetStore({
      profile: named,
      driveLine: 'Build the field',
      surveyApplied: true,
      surveyAnswers: { phys_sport: 'life' },
      campaigns: [goal()],
      shadowEvents: [{ id: 'shadow-1', catalogId: 'broke_word', occurredOn: localDateKey() }],
      counselThread: [{ id: 'c1', role: 'user', text: 'What now?' }],
      achievements: [
        {
          id: 'ach-1',
          title: 'A mark',
          detail: '',
          achievedOn: localDateKey(),
        },
      ],
      tasks: [
        ...baseline.tasks,
        customAtom({ id: 'mine' }),
      ],
    });

    useGrailStore.getState().resetAllData();

    const next = useGrailStore.getState();
    expect(next.profile.name).toBe('');
    expect(next.profile.dimensions.physical.score).toBe(0);
    expect(next.driveLine).toBe('');
    expect(next.surveyApplied).toBe(false);
    expect(next.surveyAnswers).toEqual({});
    expect(next.campaigns).toEqual([]);
    expect(next.shadowEvents).toEqual([]);
    expect(next.counselThread).toEqual([]);
    expect(next.achievements).toEqual([]);
    expect(next.tasks.every((task) => task.kind === 'canon')).toBe(true);
    expect(next.tasks.some((task) => task.kind === 'custom')).toBe(false);
    expect(
      next.tasks.every((task) => (task.scheduledOn ?? localDateKey()) >= localDateKey()),
    ).toBe(true);
    expect(next.isHydrated).toBe(true);
    expect(needsFirstRunGate({ surveyApplied: next.surveyApplied, profile: next.profile })).toBe(
      true,
    );
  });
});

describe('applyLifeSurvey', () => {
  it('writes the survey onto the octagon and marks it applied', () => {
    const answers = Object.fromEntries(
      SURVEY_QUESTIONS.filter((question) => question.tier === 'base').map((question) => [
        question.id,
        question.options[question.options.length - 1]?.id ?? 'none',
      ]),
    );

    resetStore({ surveyAnswers: answers });
    expect(useGrailStore.getState().profile.dimensions.physical.score).toBe(0);

    useGrailStore.getState().applyLifeSurvey();

    const next = useGrailStore.getState();
    expect(next.surveyApplied).toBe(true);
    expect(next.profile.dimensions.physical.score).toBeGreaterThan(0);
  });

  it('lifts wealth when craft scores and wealth answers stay empty', () => {
    const answers = Object.fromEntries(
      SURVEY_QUESTIONS.filter((question) => question.tier === 'base').map((question) => [
        question.id,
        question.section === 'craft_career'
          ? (question.options[question.options.length - 1]?.id ?? 'none')
          : (question.options[0]?.id ?? 'none'),
      ]),
    );

    resetStore({ surveyAnswers: answers });
    useGrailStore.getState().applyLifeSurvey();

    const next = useGrailStore.getState();
    expect(next.profile.dimensions.craft_career.score).toBeGreaterThan(0);
    expect(next.profile.dimensions.wealth.score).toBeGreaterThan(0);
    expect(next.profile.dimensions.wealth.score).toBeLessThan(
      next.profile.dimensions.craft_career.score,
    );
  });

  it('keeps a high survey score and sets the next career wall above it', () => {
    const answers = Object.fromEntries(
      SURVEY_QUESTIONS.map((question) => {
        const strongest = question.options.reduce((best, option) => {
          const bestRank = best.units ?? best.fill;
          const rank = option.units ?? option.fill;
          return rank > bestRank ? option : best;
        });
        return [question.id, strongest.id];
      }),
    );

    resetStore({ surveyAnswers: answers });
    useGrailStore.getState().applyLifeSurvey();

    const craft = useGrailStore.getState().profile.dimensions.craft_career.score;
    expect(craft).toBeGreaterThan(50);
    expect(useGrailStore.getState().profile.careerCeiling).toBe(100);
    expect(useGrailStore.getState().profile.careerFloor).toBe(0);
    expect(useGrailStore.getState().profile.careerWallPinned).toBe(false);
  });
});

describe('completeDisciplineStep vs completeCampaign', () => {
  it('strips campaign atoms from the desk when the tree closes the goal', () => {
    const almostDone = DISCIPLINE_STEP_IDS.slice(0, -1);
    const last = DISCIPLINE_STEP_IDS[DISCIPLINE_STEP_IDS.length - 1];
    if (last === undefined) {
      throw new Error('discipline tree has no last step');
    }

    resetStore({
      campaigns: [goal()],
      disciplineCompleted: almostDone,
      tasks: [
        customAtom({ id: 'keep-custom' }),
        customAtom({
          id: 'goal-pending',
          kind: 'campaign',
          campaignId: 'campaign-1',
        }),
        customAtom({
          id: 'goal-absorbed',
          kind: 'campaign',
          campaignId: 'campaign-1',
          ritualState: 'absorbed',
          isCompleted: true,
          absorbedOn: localDateKey(),
        }),
      ],
    });

    useGrailStore.getState().completeDisciplineStep(last);

    const next = useGrailStore.getState();
    expect(next.campaigns[0]?.status).toBe('done');
    expect(next.tasks.map((task) => task.id)).toEqual(['keep-custom']);
    expect(next.achievements.some((item) => item.title === 'Become an engineer')).toBe(true);
  });

  it('strips the same atoms when the goal is closed from the campaign screen', () => {
    resetStore({
      campaigns: [goal()],
      tasks: [
        customAtom({ id: 'keep-custom' }),
        customAtom({
          id: 'goal-pending',
          kind: 'campaign',
          campaignId: 'campaign-1',
        }),
      ],
    });

    useGrailStore.getState().completeCampaign('campaign-1');

    const next = useGrailStore.getState();
    expect(next.campaigns[0]?.status).toBe('done');
    expect(next.tasks.map((task) => task.id)).toEqual(['keep-custom']);
  });
});

describe('broke-word shadow and discipline', () => {
  beforeEach(() => {
    resetStore();
  });

  it('cuts a perfect first day from 100 to 90 and restores it when retracted', () => {
    const today = localDateKey();
    resetStore({
      tasks: [
        customAtom({
          id: 'kept',
          ritualState: 'absorbed',
          isCompleted: true,
          scheduledOn: today,
          absorbedOn: today,
        }),
      ],
    });

    useGrailStore.getState().confessShadow('broke_word');
    expect(useGrailStore.getState().profile.disciplineScore).toBe(90);

    useGrailStore.getState().retractShadow('broke_word');
    expect(useGrailStore.getState().profile.disciplineScore).toBe(100);
  });
});

describe('dropLastCounselUserMessage', () => {
  it('takes back the last user turn and leaves an assistant reply alone', () => {
    resetStore({
      counselThread: [
        { id: 'a1', role: 'assistant', text: 'Stay with the octagon.' },
        { id: 'u1', role: 'user', text: 'What now?' },
      ],
    });

    useGrailStore.getState().dropLastCounselUserMessage();
    expect(useGrailStore.getState().counselThread.map((item) => item.id)).toEqual(['a1']);

    useGrailStore.getState().dropLastCounselUserMessage();
    expect(useGrailStore.getState().counselThread.map((item) => item.id)).toEqual(['a1']);
  });
});

describe('removeTask', () => {
  beforeEach(() => {
    resetStore();
  });

  it('drops a pending custom atom the person added', () => {
    resetStore({
      tasks: [customAtom({ id: 'mine' })],
    });

    useGrailStore.getState().removeTask('mine');
    expect(useGrailStore.getState().tasks.some((task) => task.id === 'mine')).toBe(false);
  });

  it('drops a pending campaign atom', () => {
    resetStore({
      tasks: [
        customAtom({
          id: 'goal-atom',
          kind: 'campaign',
          campaignId: 'campaign-1',
        }),
      ],
    });

    useGrailStore.getState().removeTask('goal-atom');
    expect(useGrailStore.getState().tasks).toEqual([]);
  });

  it('drops a future custom atom that has not been sealed', () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const tomorrow = localDateKey(date);

    resetStore({
      tasks: [customAtom({ id: 'later', scheduledOn: tomorrow })],
    });

    useGrailStore.getState().removeTask('later');
    expect(useGrailStore.getState().tasks.some((task) => task.id === 'later')).toBe(false);
  });

  it('does not drop canon or an already settled atom', () => {
    const baseline = createBaselineState();
    const canon = baseline.tasks.find((task) => task.kind === 'canon');
    expect(canon).toBeDefined();

    resetStore({
      tasks: [
        ...(canon === undefined ? [] : [canon]),
        customAtom({
          id: 'done',
          ritualState: 'absorbed',
          isCompleted: true,
          absorbedOn: localDateKey(),
        }),
      ],
    });

    const store = useGrailStore.getState();
    if (canon !== undefined) {
      store.removeTask(canon.id);
    }
    store.removeTask('done');

    const ids = useGrailStore.getState().tasks.map((task) => task.id);
    if (canon !== undefined) {
      expect(ids).toContain(canon.id);
    }
    expect(ids).toContain('done');
  });
});
