import { createTranslator } from '@/i18n';
import { createBaselineState, migratePersistedState, STORAGE_VERSION } from '@/store/migrations';
import { CANON_WEEK_SLOT_COUNT } from '@/constants/canon';
import { createInitialTasks } from '@/constants/mockData';
import { HUMAN_DIMENSION_IDS, type AtomizedTask } from '@/types/grail';
import { atomInstruction, atomTitle } from '@/utils/atomContent';
import { computeAge } from '@/utils/birthDate';
import { dayVerdict } from '@/utils/dayVerdict';
import { chronicleWeekStart, isBeforeChronicle } from '@/utils/firstOpen';
import { createEmptyXpJournal, createStoppedLifeClocks } from '@/utils/lifeScore';
import { isoWeekday, localDateKey, shiftDateKey, weekMondayOf } from '@/utils/taskTime';

function findTask(tasks: readonly AtomizedTask[], id: string): AtomizedTask {
  const task = tasks.find((candidate) => candidate.id === id);

  if (task === undefined) {
    throw new Error(`missing atom ${id}`);
  }

  return task;
}

/** A snapshot as a v1 build wrote it: labels, an age number, Russian atom text. */
function v1Snapshot(overrides: { tasks?: unknown[] } = {}): unknown {
  return {
    profile: {
      id: 'user-28-baseline',
      age: 28,
      characterLevel: 17,
      disciplineScore: 71,
      currentStreak: 4,
      dimensions: Object.fromEntries(
        HUMAN_DIMENSION_IDS.map((id) => [
          id,
          {
            id,
            label: 'Физика',
            baseScore: 60,
            xp: 300,
            score: 73,
            isGated: id === 'craft_career',
            decayRate: 0.5,
          },
        ]),
      ),
      lifePotentialCaps: Object.fromEntries(HUMAN_DIMENSION_IDS.map((id) => [id, 94])),
      dailyCapacityCaps: Object.fromEntries(HUMAN_DIMENSION_IDS.map((id) => [id, 100])),
      lastDecayDate: '2026-02-01',
    },
    tasks: overrides.tasks ?? [
      {
        id: 'task-physical-morning-mobility',
        title: 'Утренняя зарядка',
        dimensionId: 'physical',
        ritualState: 'absorbed',
        isCompleted: true,
        isNonNegotiable: true,
        proofRequired: true,
        xpReward: 15,
        instruction: 'Проснись в теле. 12 минут мобильности: позвоночник, бёдра, плечи.',
        timeDeadline: '08:00',
        isOverdue: false,
      },
    ],
    viewMode: 'life',
  };
}

describe('migratePersistedState · profile', () => {
  it('keeps the stored score as life, plus discipline, streak and the gate', () => {
    const { profile } = migratePersistedState(v1Snapshot(), 1);

    expect(profile.disciplineScore).toBe(71);
    expect(profile.currentStreak).toBe(4);
    expect(profile.dimensions.physical.score).toBe(73);
    expect(profile.dimensions.craft_career.isGated).toBe(true);
    expect(profile.lifeClockStarted).toEqual(createStoppedLifeClocks());
    expect(Object.keys(profile.xpJournal.physical)).toHaveLength(0);
    expect(migratePersistedState(v1Snapshot(), 1).surveyAnswers).toEqual({});
    expect(migratePersistedState(v1Snapshot(), 1).surveyApplied).toBe(false);
    expect(migratePersistedState(v1Snapshot(), 1).driveLine).toBe('');
    expect(migratePersistedState(v1Snapshot(), 1).campaigns).toEqual([]);
  });

  it('reconstructs an approximate date of birth that yields the stored age today', () => {
    const { profile } = migratePersistedState(v1Snapshot(), 1);

    expect(profile.isBirthDateApproximate).toBe(true);
    expect(computeAge(profile.birthDate)).toBe(28);
  });

  it('drops the stored label, the age number, XP pools and the ceiling maps', () => {
    const { profile } = migratePersistedState(v1Snapshot(), 1);

    expect(profile).not.toHaveProperty('age');
    expect(profile).not.toHaveProperty('lifePotentialCaps');
    expect(profile).not.toHaveProperty('dailyCapacityCaps');
    expect(profile.dimensions.physical).not.toHaveProperty('label');
    expect(profile.dimensions.physical).not.toHaveProperty('baseScore');
    expect(profile.dimensions.physical).not.toHaveProperty('xp');
    expect(profile.dimensions.physical).not.toHaveProperty('decayRate');
  });

  it('recomputes the character level from the derived age', () => {
    const { profile } = migratePersistedState(v1Snapshot(), 1);

    expect(profile.characterLevel).toBeGreaterThan(1);
  });

  it('honours an exact date of birth that a later build already stored', () => {
    const snapshot = v1Snapshot() as { profile: Record<string, unknown> };
    snapshot.profile.birthDate = '1994-07-19';
    snapshot.profile.isBirthDateApproximate = false;

    const { profile } = migratePersistedState(snapshot, 1);

    expect(profile.birthDate).toBe('1994-07-19');
    expect(profile.isBirthDateApproximate).toBe(false);
  });
});

describe('migratePersistedState · atoms', () => {
  const ru = createTranslator('ru');
  const en = createTranslator('en');

  it('replaces the old daily seeds with this week of canon', () => {
    const { tasks, shadowEvents, profile } = migratePersistedState(v1Snapshot(), 1);
    const mobility = tasks.find(
      (task) => task.content.source === 'seed' && task.content.seedId === 'physical_morning_mobility',
    );

    expect(tasks).toHaveLength(CANON_WEEK_SLOT_COUNT);
    expect(tasks.every((task) => task.kind === 'canon')).toBe(true);
    expect(mobility).toBeDefined();
    expect(mobility?.timeDeadline).toBeUndefined();
    expect(atomTitle(mobility as AtomizedTask, ru)).toBe('Утренняя зарядка');
    expect(atomTitle(mobility as AtomizedTask, en)).toBe('Morning exercise');
    expect(shadowEvents).toEqual([]);
    expect(profile.promiseJournal).toEqual({});
    expect(profile.canonWeekStart.length).toBe(10);
  });

  it('leaves a title the user typed exactly as they typed it', () => {
    const task = findTask(
      migratePersistedState(
        v1Snapshot({
          tasks: [
            {
              id: 'atom-custom-1',
              title: 'Позвонить бабушке',
              dimensionId: 'social',
              ritualState: 'pending',
              xpReward: 15,
              instruction: 'Не откладывай до воскресенья.',
              isOverdue: false,
            },
          ],
        }),
        1,
      ).tasks,
      'atom-custom-1',
    );

    expect(task.content).toEqual({
      source: 'custom',
      title: 'Позвонить бабушке',
      instruction: 'Не откладывай до воскресенья.',
    });
    expect(task.kind).toBe('custom');
    expect(atomTitle(task, en)).toBe('Позвонить бабушке');
    expect(atomInstruction(task, en)).toBe('Не откладывай до воскресенья.');
  });

  it('drops a briefing that was only the generated template', () => {
    const task = findTask(
      migratePersistedState(
        v1Snapshot({
          tasks: [
            {
              id: 'atom-custom-2',
              title: 'Холодный душ',
              dimensionId: 'drive',
              ritualState: 'pending',
              xpReward: 15,
              instruction:
                'Выполни атом «Холодный душ» полностью. Без замены, без переноса, без театра.',
              isOverdue: false,
            },
          ],
        }),
        1,
      ).tasks,
      'atom-custom-2',
    );

    expect(task.content).toEqual({ source: 'custom', title: 'Холодный душ' });
    expect(atomInstruction(task, en)).toBe(
      'Complete the atom “Холодный душ” fully. No substitute, no postponement, no theatre.',
    );
  });

  it('does not mistake a user atom on another vector for a seed', () => {
    const task = findTask(
      migratePersistedState(
        v1Snapshot({
          tasks: [
            {
              id: 'atom-custom-3',
              title: 'Холодный старт дня',
              dimensionId: 'spirit',
              ritualState: 'pending',
              xpReward: 15,
              isOverdue: false,
            },
          ],
        }),
        1,
      ).tasks,
      'atom-custom-3',
    );

    expect(task.content).toEqual({ source: 'custom', title: 'Холодный старт дня' });
  });

  it('discards an entry that carries no identity at all', () => {
    const { tasks } = migratePersistedState(
      v1Snapshot({ tasks: [{ dimensionId: 'social' }, { id: 'orphan' }] }),
      1,
    );

    expect(tasks).toHaveLength(CANON_WEEK_SLOT_COUNT);
    expect(tasks.every((task) => task.kind === 'canon')).toBe(true);
  });
});

describe('migratePersistedState · language and versions', () => {
  it('follows the system language after v17', () => {
    expect(migratePersistedState(v1Snapshot(), 1).language).toBe('system');
  });

  it('drops a stored language preference in favour of the system', () => {
    const snapshot = { ...(v1Snapshot() as object), language: 'en' };

    expect(migratePersistedState(snapshot, 1).language).toBe('system');
  });

  it('keeps the persisted view mode', () => {
    expect(migratePersistedState(v1Snapshot(), 1).viewMode).toBe('life');
  });

  it('falls back to the baseline when there is no profile to salvage', () => {
    const fresh = migratePersistedState(null, 0);

    expect(fresh.tasks).toEqual(createInitialTasks());
    expect(fresh.tasks.every((task) => (task.scheduledOn ?? '') >= localDateKey())).toBe(true);
    expect(fresh.language).toBe('system');
    expect(fresh.profile.name).toBe('');
  });

  it('passes a current snapshot straight through', () => {
    const current = migratePersistedState(v1Snapshot(), 1);

    expect(migratePersistedState(current, STORAGE_VERSION)).toBe(current);
  });

  it('drops proof from canon already saved at v19', () => {
    const current = migratePersistedState(v1Snapshot(), 1);
    const canon = current.tasks.find((task) => task.kind === 'canon');
    expect(canon).toBeDefined();
    const saved = {
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === canon?.id ? { ...task, proofRequired: true } : task,
      ),
    };

    const next = migratePersistedState(saved, 19);
    expect(next.tasks.find((task) => task.id === canon?.id)?.proofRequired).toBe(false);
    expect(next.tasks.filter((task) => task.kind !== 'canon')).toEqual(
      saved.tasks.filter((task) => task.kind !== 'canon'),
    );
  });

  it('lifts a v6 snapshot onto an empty drive line without touching life', () => {
    const v6 = migratePersistedState(v1Snapshot(), 1);
    const { driveLine, profile } = migratePersistedState(
      {
        profile: v6.profile,
        tasks: v6.tasks,
        viewMode: v6.viewMode,
        language: v6.language,
        surveyAnswers: v6.surveyAnswers,
        surveyApplied: v6.surveyApplied,
        shadowEvents: v6.shadowEvents,
      },
      6,
    );

    expect(driveLine).toBe('');
    expect(profile.dimensions.physical.score).toBe(v6.profile.dimensions.physical.score);
  });

  it('lifts a v8 snapshot onto campaigns and keeps a single active', () => {
    const v8 = migratePersistedState(v1Snapshot(), 1);
    const { campaigns } = migratePersistedState(
      {
        ...v8,
        campaigns: [
          {
            id: 'a',
            title: 'one',
            horizonMonths: 12,
            startedOn: '2026-01-01',
            status: 'active',
            primary: 'physical',
            supporting: [],
            vectorsConfirmed: true,
            takenAdviceIds: [],
          },
          {
            id: 'b',
            title: 'two',
            horizonMonths: 12,
            startedOn: '2026-02-01',
            status: 'active',
            primary: 'drive',
            supporting: [],
            vectorsConfirmed: false,
            takenAdviceIds: [],
          },
        ],
      },
      8,
    );

    expect(campaigns).toHaveLength(2);
    expect(campaigns.filter((item) => item.status === 'active')).toHaveLength(1);
  });

  it('lifts a v9 snapshot onto silent method clocks and drops school and book', () => {
    const v9 = migratePersistedState(v1Snapshot(), 1);
    const upgraded = migratePersistedState(v9, 9);

    expect(upgraded).not.toHaveProperty('practice');
    expect(upgraded.methodSignals.enabled).toBe(false);
    expect(upgraded.methodSignals.items).toEqual([]);
    expect(upgraded.talents).toEqual([]);
  });

  it('drops school and book from a v10 snapshot and keeps method clocks', () => {
    const v9 = migratePersistedState(v1Snapshot(), 1);
    const upgraded = migratePersistedState(
      {
        ...v9,
        practice: {
          schoolName: 'Стоя',
          maxim: 'держи слово',
          bookTitle: 'Медитации',
          bookAuthor: 'Марк Аврелий',
        },
        methodSignals: {
          enabled: true,
          morning: '07:00',
          evening: '22:00',
          sunday: '11:00',
        },
      },
      10,
    );

    expect(upgraded).not.toHaveProperty('practice');
    expect(upgraded.methodSignals.enabled).toBe(true);
    expect(upgraded.methodSignals.items).toHaveLength(3);
    expect(upgraded.methodSignals.items[0]?.time).toBe('07:00');
    expect(upgraded.methodSignals.items[0]?.enabled).toBe(true);
    expect(upgraded.talents).toEqual([]);
    expect(upgraded.aiApiKey).toBe('');
  });

  it('rebuilds a pre-v1 snapshot that has scores but no XP pool', () => {
    const legacy = {
      profile: {
        age: 31,
        dimensions: Object.fromEntries(
          HUMAN_DIMENSION_IDS.map((id) => [id, { id, label: 'Дух', score: 44 }]),
        ),
      },
    };

    const { profile } = migratePersistedState(legacy, 0);

    expect(profile.dimensions.spirit.score).toBe(44);
    expect(profile.dimensions.spirit).not.toHaveProperty('baseScore');
    expect(profile.dimensions.spirit).not.toHaveProperty('xp');
  });

  it('lifts a v2 snapshot onto the empty journal without moving life', () => {
    const v2 = migratePersistedState(v1Snapshot(), 1) as unknown as {
      profile: Record<string, unknown>;
    };
    v2.profile.lifePotentialCaps = Object.fromEntries(
      HUMAN_DIMENSION_IDS.map((id) => [id, 88]),
    );
    v2.profile.dimensions = Object.fromEntries(
      HUMAN_DIMENSION_IDS.map((id) => [
        id,
        { id, baseScore: 60, xp: 300, score: 73, isGated: id === 'craft_career', decayRate: 0.5 },
      ]),
    );

    const { profile } = migratePersistedState(v2, 2);

    expect(profile.dimensions.physical.score).toBe(73);
    expect(profile.lifeClockStarted).toEqual(createStoppedLifeClocks());
    expect(Object.keys(profile.xpJournal.social)).toHaveLength(0);
    expect(profile).not.toHaveProperty('lifePotentialCaps');
    expect(profile.dimensions.physical).not.toHaveProperty('xp');
  });

  it('splits a v3 global clock into per-vector latches without dropping the journal', () => {
    const v3 = migratePersistedState(v1Snapshot(), 1);
    const journal = createEmptyXpJournal();
    journal.physical = { '2026-09-07': 15 };

    const upgraded = migratePersistedState(
      {
        ...v3,
        profile: {
          ...v3.profile,
          xpJournal: journal,
          lifeClockStarted: true,
        },
      },
      3,
    );

    expect(upgraded.profile.xpJournal.physical['2026-09-07']).toBe(15);
    expect(upgraded.profile.lifeClockStarted.physical).toBe(true);
    expect(upgraded.profile.lifeClockStarted.wealth).toBe(false);
    expect(upgraded.profile.dimensions.physical.score).toBe(73);
  });

  it('lifts a v12 snapshot onto an empty achievements ledger', () => {
    const current = migratePersistedState(v1Snapshot(), 1);
    const { achievements: _dropped, ...v12 } = current;
    const upgraded = migratePersistedState(v12, 12);

    expect(upgraded.achievements).toEqual([]);
    expect(upgraded.talents).toEqual(current.talents);
  });

  it('keeps a v12 achievement that already has a date and a title', () => {
    const current = migratePersistedState(v1Snapshot(), 1);
    const upgraded = migratePersistedState(
      {
        ...current,
        achievements: [
          {
            id: 'feat-1',
            title: 'Пробежал 20км',
            detail: 'время: 01:36:47',
            achievedOn: '2026-09-08',
          },
          { id: 'junk', title: '', achievedOn: '2026-09-08' },
        ],
      },
      12,
    );

    expect(upgraded.achievements).toEqual([
      {
        id: 'feat-1',
        title: 'Пробежал 20км',
        detail: 'время: 01:36:47',
        achievedOn: '2026-09-08',
      },
    ]);
  });

  it('lifts a gated v13 snapshot onto a 50% career ceiling', () => {
    const current = migratePersistedState(v1Snapshot(), 1);
    const { careerCeiling: _dropped, ...profile } = current.profile;
    const upgraded = migratePersistedState(
      {
        ...current,
        profile: {
          ...profile,
          dimensions: {
            ...profile.dimensions,
            craft_career: { ...profile.dimensions.craft_career, isGated: true },
          },
        },
      },
      13,
    );

    expect(upgraded.profile.careerCeiling).toBe(50);
    expect(upgraded.profile.dimensions.craft_career.isGated).toBe(true);
  });

  it('lifts an ungated v13 snapshot onto an open career path', () => {
    const current = migratePersistedState(v1Snapshot(), 1);
    const { careerCeiling: _dropped, ...profile } = current.profile;
    const upgraded = migratePersistedState(
      {
        ...current,
        profile: {
          ...profile,
          dimensions: {
            ...profile.dimensions,
            craft_career: { ...profile.dimensions.craft_career, isGated: false, score: 72 },
          },
        },
      },
      13,
    );

    expect(upgraded.profile.careerCeiling).toBe(100);
    expect(upgraded.profile.careerFloor).toBe(0);
    expect(upgraded.profile.dimensions.craft_career.isGated).toBe(false);
    expect(upgraded.profile.dimensions.craft_career.score).toBe(72);
    expect(upgraded.profile.careerWallPinned).toBe(false);
  });

  it('pins a v14 snapshot that decayed back to 50% after a raised ceiling', () => {
    const current = migratePersistedState(v1Snapshot(), 1);
    const upgraded = migratePersistedState(
      {
        ...current,
        profile: {
          ...current.profile,
          careerCeiling: 65,
          dimensions: {
            ...current.profile.dimensions,
            craft_career: {
              ...current.profile.dimensions.craft_career,
              score: 49.4,
              isGated: true,
            },
          },
        },
      },
      14,
    );

    expect(upgraded.profile.careerCeiling).toBe(50);
    expect(upgraded.profile.careerFloor).toBe(50);
    expect(upgraded.profile.careerWallPinned).toBe(true);
    expect(upgraded.profile.dimensions.craft_career.score).toBe(50);
  });

  it('pins a v15 snapshot that decayed back to 65% after that wall', () => {
    const current = migratePersistedState(v1Snapshot(), 1);
    const upgraded = migratePersistedState(
      {
        ...current,
        profile: {
          ...current.profile,
          careerCeiling: 80,
          careerWallPinned: false,
          dimensions: {
            ...current.profile.dimensions,
            craft_career: {
              ...current.profile.dimensions.craft_career,
              score: 65,
              isGated: true,
            },
          },
        },
      },
      15,
    );

    expect(upgraded.profile.careerCeiling).toBe(65);
    expect(upgraded.profile.careerFloor).toBe(65);
    expect(upgraded.profile.careerWallPinned).toBe(true);
    expect(upgraded.profile.dimensions.craft_career.score).toBe(65);
  });

  it('lifts a v18 snapshot onto a blank breath award day', () => {
    const current = migratePersistedState(v1Snapshot(), 1);
    const { breathAwardedOn: _dropped, ...v18 } = current;
    const upgraded = migratePersistedState(v18, 18);

    expect(upgraded.breathAwardedOn).toBe('');
  });

  it('drops canon placed on days before the first launch', () => {
    const today = localDateKey();
    const baseline = createBaselineState();
    const earlier = shiftDateKey(today, -1);
    const sample = baseline.tasks[0];
    const { firstOpenOn: _ignored, ...profile } = baseline.profile;

    expect(sample).toBeDefined();

    const upgraded = migratePersistedState(
      {
        ...baseline,
        profile: {
          ...profile,
          lastDecayDate: today,
          promiseJournal: { [earlier]: { promised: 2, kept: 0 } },
        },
        tasks: [
          { ...sample, id: 'unlived', scheduledOn: earlier, ritualState: 'burned' as const },
          ...baseline.tasks,
        ],
      },
      20,
    );

    expect(upgraded.profile.firstOpenOn).toBe(today);
    expect(upgraded.tasks.some((task) => task.scheduledOn === earlier)).toBe(false);
    expect(upgraded.profile.promiseJournal[earlier]).toBeUndefined();
    expect(chronicleWeekStart(upgraded.profile.firstOpenOn ?? today)).toBe(weekMondayOf(today));
    expect(isBeforeChronicle(shiftDateKey(weekMondayOf(today), -7), upgraded.profile.firstOpenOn ?? today)).toBe(
      true,
    );
    expect(dayVerdict(upgraded.tasks, earlier, today, [])).toEqual({
      kind: 'empty',
      sunday: isoWeekday(earlier) === 7,
    });
  });
});
