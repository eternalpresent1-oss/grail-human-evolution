import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { runIfAllowed } from '@/api/featureAccess';
import { shadowEntry } from '@/constants/shadow';
import {
  createBaselineState,
  migratePersistedState,
  STORAGE_VERSION,
  type PersistedGrailState,
} from '@/store/migrations';
import {
  atomDimensionIds,
  HUMAN_DIMENSION_IDS,
  isAtomDueInFuture,
  isAtomSealed,
  type AtomContent,
  type AtomKind,
  type AtomizedTask,
  type AtomRitualState,
  type HumanDimension,
  type HumanDimensionId,
  type OctagonViewMode,
  type ShadowCatalogId,
  type ShadowEvent,
  type UserProfile,
} from '@/types/grail';
import { applyBreathPracticeReward, canAwardBreathPractice } from '@/utils/breathPractice';
import { ensureClosedChronicle, tickCanonCalendar } from '@/utils/canonWeek';
import { computeDisciplineScore } from '@/utils/discipline';
import { applyFirstOpen } from '@/utils/firstOpen';
import {
  createAchievementId,
  createAtomId,
  createCampaignId,
  createShadowEventId,
  createTalentId,
} from '@/utils/ids';
import {
  advanceLifeDimensions,
  applyJournalXp,
  coupleCraftWealthDimensions,
  linkedPracticePartner,
  startLifeClock,
  trimXpJournal,
} from '@/utils/lifeScore';
import { scoreLifeSurvey, setSurveyAnswer } from '@/utils/lifeSurvey';
import { type SurveyQuestionId } from '@/constants/lifeSurvey';
import { sanitizeDriveLine } from '@/utils/driveLine';
import { sanitizeMethodSignals } from '@/utils/methodSignals';
import { type MethodSignals } from '@/types/methodSignals';
import { TALENT_NODE_XP, type TalentNode } from '@/types/talent';
import { type DisciplineStepId } from '@/types/discipline';
import { MAX_COUNSEL_MESSAGES, type CounselMessage } from '@/types/counsel';
import { MAX_ACHIEVEMENTS } from '@/types/achievement';
import { profileAge, withDerivedScores } from '@/utils/profile';
import { isDeadlinePassed, isSchedulableDateKey, localDateKey } from '@/utils/taskTime';
import { latestWindowShadow } from '@/utils/weekLedger';
import {
  canAddTalent,
  canGrantTalentXp,
  isTalentLeaf,
  nodeGrantedTalentXp,
  sanitizeTalentTitle,
} from '@/utils/talent';
import {
  isDisciplineTreeComplete,
  withCompletedDisciplineStep,
  withUncompletedDisciplineStep,
} from '@/utils/disciplineTree';
import { sanitizeAchievementDetail, sanitizeAchievementTitle, appendGoalAchievement } from '@/utils/achievements';
import {
  careerBreakScore,
  ceilingAboveScore,
  isAtCareerWall,
  isCareerBreakthroughId,
  nextCareerCeiling,
  type CareerBreakthroughId,
} from '@/utils/careerGate';
import { sanitizeApiKey } from '@/utils/grailSnapshot';
import {
  CAMPAIGN_ATOM_XP,
  HORIZON_MONTHS_MAX,
  HORIZON_MONTHS_MIN,
  MAX_PENDING_CAMPAIGN_ATOMS,
  MAX_SUPPORTING_VECTORS,
  activeCampaign,
  createdCampaign,
  type CampaignAdviceId,
} from '@/types/campaign';
import { proposeCampaignVectors } from '@/utils/campaignCompiler';
import {
  countPendingCampaignAtoms,
  mapCampaign,
  partitionCampaignAtoms,
  sanitizeCampaignTitle,
  seatActiveCampaign,
} from '@/utils/campaign';

const STORAGE_KEY = 'grail-human-evolution';

export interface NewAtomInput {
  id: string;
  title: string;
  dimensionId: HumanDimensionId;
  xp: number;
  instruction?: string;
  timeDeadline?: string;
  scheduledOn?: string;
  kind?: AtomKind;
  campaignId?: string;
  notify?: boolean;
}

export interface GrailState extends PersistedGrailState {
  /** False until AsyncStorage rehydration settles, so the UI never flashes seeds. */
  isHydrated: boolean;
  accessBlock: 'premium' | 'limit' | null;
  clearAccessBlock: () => void;
  addTask: (input: NewAtomInput) => void;
  absorbTask: (taskId: string) => void;
  burnTask: (taskId: string) => void;
  restoreTask: (taskId: string) => void;
  /** Drops a pending custom or campaign atom the person added. Canon stays. */
  removeTask: (taskId: string) => void;
  eraseChronicle: (taskId: string) => void;
  setTaskNotify: (taskId: string, notify: boolean) => void;
  setTaskDeadline: (taskId: string, time: string | undefined) => void;
  setViewMode: (mode: OctagonViewMode) => void;
  setName: (name: string) => void;
  setBirthDate: (birthDate: string) => void;
  setSurveyAnswer: (questionId: SurveyQuestionId, optionId: string | undefined) => void;
  /** Writes the survey reading onto the life octagon. Does not start life clocks. */
  applyLifeSurvey: () => void;
  setDriveLine: (value: string) => void;
  setMethodSignals: (value: MethodSignals) => void;
  startCampaign: (title: string, horizonMonths: number) => void;
  setCampaignVectors: (
    campaignId: string,
    primary: HumanDimensionId,
    supporting: readonly HumanDimensionId[],
  ) => void;
  confirmCampaignVectors: (campaignId: string) => void;
  declareCampaign: (campaignId: string) => void;
  acceptCampaignAdvice: (
    campaignId: string,
    adviceId: CampaignAdviceId,
    copy: { readonly title: string; readonly instruction: string; readonly dimensionId: HumanDimensionId },
  ) => void;
  addCampaignAtom: (
    campaignId: string,
    input: { readonly title: string; readonly instruction?: string; readonly dimensionId: HumanDimensionId },
  ) => void;
  completeCampaign: (campaignId: string) => void;
  shelveCampaign: (campaignId: string) => void;
  /** Burns custom and campaign atoms (including future ones) and wipes shadow. Keeps the week's canon, language, name, date, drive, the goal itself, survey, life octagon, talents, achievements, career ceiling, signals. */
  resetProgress: () => void;
  /** Returns persisted state to the first opening: empty life, empty desk of custom work, first-run corridor. */
  resetAllData: () => void;
  confessShadow: (catalogId: ShadowCatalogId) => void;
  retractShadow: (catalogId: ShadowCatalogId) => void;
  breakCareerGate: (input: {
    readonly kind: CareerBreakthroughId;
    readonly title: string;
    readonly kindLabel: string;
  }) => void;
  addTalent: (input: {
    readonly dimensionId: HumanDimensionId;
    readonly title: string;
    readonly parentId?: string;
  }) => void;
  removeTalent: (id: string) => void;
  renameTalent: (id: string, title: string) => void;
  addAchievement: (title: string, detail: string) => void;
  removeAchievement: (id: string) => void;
  completeDisciplineStep: (id: DisciplineStepId) => void;
  uncompleteDisciplineStep: (id: DisciplineStepId) => void;
  setProofBackgroundUri: (uri: string) => void;
  setAiApiKey: (value: string) => void;
  appendCounselMessage: (message: CounselMessage) => void;
  dropLastCounselUserMessage: () => void;
  setLifeVectorReading: (value: string) => void;
  setSoundEnabled: (value: boolean) => void;
  setMusicEnabled: (value: boolean) => void;
  setDisciplineBeacon: (value: boolean) => void;
  awardBreathPractice: () => boolean;
  checkTaskDeadlines: () => void;
}

function applyAbsorption(
  profile: UserProfile,
  task: AtomizedTask,
  dateKey: string,
  absorb: boolean,
): UserProfile {
  const direction = absorb ? 1 : -1;
  let xpJournal = profile.xpJournal;
  let lifeClockStarted = profile.lifeClockStarted;

  for (const dimensionId of atomDimensionIds(task)) {
    xpJournal = applyJournalXp(xpJournal, dimensionId, dateKey, direction * task.xpReward);
    if (absorb) {
      lifeClockStarted = startLifeClock(lifeClockStarted, dimensionId);
      const partner = linkedPracticePartner(dimensionId);
      if (partner !== null) {
        lifeClockStarted = startLifeClock(lifeClockStarted, partner);
      }
    }
  }

  return withDerivedScores({
    ...profile,
    xpJournal: trimXpJournal(xpJournal, dateKey),
    lifeClockStarted,
  });
}

function stampDiscipline(
  profile: UserProfile,
  tasks: readonly AtomizedTask[],
  shadowEvents: readonly ShadowEvent[],
): UserProfile {
  return {
    ...profile,
    disciplineScore: computeDisciplineScore({
      tasks,
      today: localDateKey(),
      journal: profile.promiseJournal,
      firstOpenOn: profile.firstOpenOn,
      shadowEvents,
    }),
  };
}

function closeCampaignDesk(
  state: Pick<PersistedGrailState, 'tasks' | 'campaigns' | 'achievements' | 'profile' | 'shadowEvents'>,
  campaign: { readonly id: string; readonly title: string },
) {
  const { kept } = partitionCampaignAtoms(state.tasks, campaign.id);

  return {
    tasks: kept,
    profile: stampDiscipline(state.profile, kept, state.shadowEvents),
    campaigns: mapCampaign(state.campaigns, campaign.id, (item) => ({
      ...item,
      status: 'done' as const,
    })),
    achievements: appendGoalAchievement(
      state.achievements,
      campaign.title,
      createAchievementId(),
      localDateKey(),
    ),
    disciplineBeacon: false as const,
  };
}

function withRitualState(
  task: AtomizedTask,
  ritualState: AtomRitualState,
  absorbedOn?: string,
): AtomizedTask {
  const deadline = task.timeDeadline;
  const today = localDateKey();
  const dueToday = task.scheduledOn === undefined || task.scheduledOn === today;
  const next: AtomizedTask = {
    id: task.id,
    content: task.content,
    dimensionId: task.dimensionId,
    kind: task.kind,
    ritualState,
    isCompleted: ritualState === 'absorbed',
    isNonNegotiable: task.isNonNegotiable,
    proofRequired: task.proofRequired,
    xpReward: task.xpReward,
    isOverdue:
      ritualState === 'pending' &&
      dueToday &&
      deadline !== undefined &&
      isDeadlinePassed(deadline),
  };

  const withDeadline =
    deadline === undefined ? next : { ...next, timeDeadline: deadline };
  const withSchedule =
    task.scheduledOn === undefined
      ? withDeadline
      : { ...withDeadline, scheduledOn: task.scheduledOn };
  const withDual =
    task.dualDimensionId === undefined
      ? withSchedule
      : { ...withSchedule, dualDimensionId: task.dualDimensionId };
  const withCampaign =
    task.campaignId === undefined ? withDual : { ...withDual, campaignId: task.campaignId };
  const withNotify =
    task.notify === true ? { ...withCampaign, notify: true as const } : withCampaign;

  if (ritualState === 'absorbed' && absorbedOn !== undefined) {
    return { ...withNotify, absorbedOn };
  }

  return withNotify;
}

function toAtomizedTask(input: NewAtomInput): AtomizedTask {
  // No briefing means no stored text: the default one is composed at render
  // time, in the language the user is reading in then.
  const content: AtomContent =
    input.instruction === undefined
      ? { source: 'custom', title: input.title }
      : { source: 'custom', title: input.title, instruction: input.instruction };

  const task: AtomizedTask = {
    id: input.id,
    content,
    dimensionId: input.dimensionId,
    kind: input.kind ?? 'custom',
    ritualState: 'pending',
    isCompleted: false,
    isNonNegotiable: true,
    proofRequired: false,
    xpReward: input.xp,
    isOverdue: false,
  };

  const withCampaign =
    input.campaignId === undefined ? task : { ...task, campaignId: input.campaignId };
  const withSchedule =
    input.scheduledOn === undefined ? withCampaign : { ...withCampaign, scheduledOn: input.scheduledOn };
  const withNotify =
    input.notify === true && input.timeDeadline !== undefined && input.scheduledOn !== undefined
      ? { ...withSchedule, notify: true as const }
      : withSchedule;

  if (input.timeDeadline === undefined) {
    return withNotify;
  }

  return withRitualState({ ...withNotify, timeDeadline: input.timeDeadline }, 'pending');
}

export const useGrailStore = create<GrailState>()(
  persist<GrailState, [], [], PersistedGrailState>(
    (set, get) => ({
      ...createBaselineState(),
      isHydrated: false,
      accessBlock: null,
      clearAccessBlock: () => set({ accessBlock: null }),

      addTask: (input) => {
        runIfAllowed('custom_atom', localDateKey(), () => {
        if (
          input.scheduledOn !== undefined &&
          !isSchedulableDateKey(input.scheduledOn, localDateKey())
        ) {
          return;
        }

        set((state) => {
          const task = toAtomizedTask(input);
          const tasks = [...state.tasks, task];
          const profile = stampDiscipline(state.profile, tasks, state.shadowEvents);
          if (task.notify !== true) {
            return { tasks, profile };
          }

          return {
            tasks,
            profile,
            methodSignals: sanitizeMethodSignals({ ...state.methodSignals, enabled: true }),
          };
        });
        }, (reason) => set({ accessBlock: reason }));
      },

      absorbTask: (taskId) => {
        const task = get().tasks.find((candidate) => candidate.id === taskId);
        if (task === undefined || task.ritualState !== 'pending') {
          return;
        }

        const today = localDateKey();
        if (isAtomDueInFuture(task, today) || isAtomSealed(task, today)) {
          return;
        }

        set((state) => {
          const tasks = state.tasks.map((candidate) =>
            candidate.id === taskId ? withRitualState(candidate, 'absorbed', today) : candidate,
          );

          return {
            tasks,
            profile: stampDiscipline(applyAbsorption(state.profile, task, today, true), tasks, state.shadowEvents),
          };
        });
      },

      burnTask: (taskId) => {
        const task = get().tasks.find((candidate) => candidate.id === taskId);
        if (task === undefined || task.ritualState !== 'pending') {
          return;
        }

        if (isAtomSealed(task, localDateKey())) {
          return;
        }

        set((state) => {
          const tasks = state.tasks.map((candidate) =>
            candidate.id === taskId ? withRitualState(candidate, 'burned') : candidate,
          );

          return { tasks, profile: stampDiscipline(state.profile, tasks, state.shadowEvents) };
        });
      },

      removeTask: (taskId) => {
        const task = get().tasks.find((candidate) => candidate.id === taskId);
        if (
          task === undefined ||
          task.kind === 'canon' ||
          task.ritualState !== 'pending' ||
          isAtomSealed(task, localDateKey())
        ) {
          return;
        }

        set((state) => {
          const tasks = state.tasks.filter((candidate) => candidate.id !== taskId);
          return { tasks, profile: stampDiscipline(state.profile, tasks, state.shadowEvents) };
        });
      },

      restoreTask: (taskId) => {
        const task = get().tasks.find((candidate) => candidate.id === taskId);
        if (task === undefined || task.ritualState === 'pending') {
          return;
        }

        if (isAtomSealed(task, localDateKey())) {
          return;
        }

        set((state) => {
          const tasks = state.tasks.map((candidate) =>
            candidate.id === taskId ? withRitualState(candidate, 'pending') : candidate,
          );

          if (task.ritualState !== 'absorbed') {
            return { tasks, profile: stampDiscipline(state.profile, tasks, state.shadowEvents) };
          }

          // A migrated absorb was never written to the journal — do not invent
          // a day to subtract from.
          if (task.absorbedOn === undefined) {
            return { tasks, profile: stampDiscipline(state.profile, tasks, state.shadowEvents) };
          }

          return {
            tasks,
            profile: stampDiscipline(
              applyAbsorption(state.profile, task, task.absorbedOn, false),
              tasks,
              state.shadowEvents,
            ),
          };
        });
      },

      eraseChronicle: (taskId) => {
        const task = get().tasks.find((candidate) => candidate.id === taskId);
        if (
          task === undefined ||
          task.kind === 'canon' ||
          task.ritualState === 'pending' ||
          isAtomSealed(task, localDateKey())
        ) {
          return;
        }

        set((state) => {
          const tasks = state.tasks.filter((candidate) => candidate.id !== taskId);

          if (task.ritualState === 'absorbed' && task.absorbedOn !== undefined) {
            return {
              tasks,
              profile: stampDiscipline(
                applyAbsorption(state.profile, task, task.absorbedOn, false),
                tasks,
                state.shadowEvents,
              ),
            };
          }

          return { tasks, profile: stampDiscipline(state.profile, tasks, state.shadowEvents) };
        });
      },

      setTaskNotify: (taskId, notify) => {
        set((state) => {
          let didEnable = false;
          const tasks = state.tasks.map((task) => {
            if (
              task.id !== taskId ||
              (task.kind !== 'custom' && task.kind !== 'canon') ||
              task.ritualState !== 'pending' ||
              isAtomSealed(task, localDateKey())
            ) {
              return task;
            }

            if (notify && (task.timeDeadline === undefined || task.scheduledOn === undefined)) {
              return task;
            }

            if (notify) {
              didEnable = true;
            }

            return withRitualState({ ...task, notify }, 'pending', task.absorbedOn);
          });

          if (!didEnable) {
            return { tasks };
          }

          return {
            tasks,
            methodSignals: sanitizeMethodSignals({ ...state.methodSignals, enabled: true }),
          };
        });
      },

      setTaskDeadline: (taskId, time) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (
              task.id !== taskId ||
              task.kind !== 'canon' ||
              task.ritualState !== 'pending' ||
              isAtomSealed(task, localDateKey())
            ) {
              return task;
            }

            const { timeDeadline: _previousDeadline, notify: previousNotify, ...rest } = task;
            const next: AtomizedTask = {
              ...rest,
              ...(time === undefined ? {} : { timeDeadline: time }),
              ...(time !== undefined && previousNotify === true ? { notify: true as const } : {}),
            };

            return withRitualState(next, 'pending', task.absorbedOn);
          }),
        }));
      },

      breakCareerGate: (input) => {
        runIfAllowed('career_boundary', localDateKey(), () => {
        if (!isCareerBreakthroughId(input.kind)) {
          return;
        }

        const title = sanitizeAchievementTitle(input.title);
        if (title.length === 0) {
          return;
        }

        const state = get();
        const ceiling = state.profile.careerCeiling;
        const craft = state.profile.dimensions.craft_career;

        if (!isAtCareerWall(craft.score, ceiling)) {
          return;
        }

        if (state.achievements.length >= MAX_ACHIEVEMENTS) {
          return;
        }

        const nextCeiling = nextCareerCeiling(ceiling);
        if (nextCeiling <= ceiling) {
          return;
        }

        set({
          achievements: [
            ...state.achievements,
            {
              id: createAchievementId(),
              title,
              detail: sanitizeAchievementDetail(input.kindLabel),
              achievedOn: localDateKey(),
            },
          ],
          profile: withDerivedScores({
            ...state.profile,
            careerCeiling: nextCeiling,
            careerFloor: ceiling,
            careerWallPinned: false,
            dimensions: {
              ...state.profile.dimensions,
              craft_career: {
                ...craft,
                score: careerBreakScore(ceiling),
                isGated: nextCeiling < 100,
              },
            },
          }),
        });
        }, (reason) => set({ accessBlock: reason }));
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setName: (name) => {
        set((state) => ({ profile: { ...state.profile, name: name.trim() } }));
      },

      setBirthDate: (birthDate) => {
        set((state) => ({
          profile: withDerivedScores({
            ...state.profile,
            birthDate,
            isBirthDateApproximate: false,
          }),
        }));
      },

      setSurveyAnswer: (questionId, optionId) => {
        set((state) => ({
          surveyAnswers: setSurveyAnswer(state.surveyAnswers, questionId, optionId),
          surveyApplied: false,
        }));
      },

      applyLifeSurvey: () => {
        set((state) => {
          const scores = scoreLifeSurvey(state.surveyAnswers, profileAge(state.profile));
          const dimensions = HUMAN_DIMENSION_IDS.reduce(
            (next, id) => {
              const current = state.profile.dimensions[id];
              const scored = scores[id];
              next[id] = scored === undefined ? current : { ...current, score: scored };
              return next;
            },
            {} as Record<HumanDimensionId, HumanDimension>,
          );
          const coupled = coupleCraftWealthDimensions(dimensions);
          const craftScore = coupled.craft_career.score;
          const careerCeiling = Math.max(state.profile.careerCeiling, ceilingAboveScore(craftScore));
          const derived = withDerivedScores({
            ...state.profile,
            careerCeiling,
            careerFloor: 0,
            careerWallPinned: false,
            dimensions: coupled,
          });

          return {
            surveyApplied: true,
            profile: {
              ...derived,
              careerCeiling,
              careerFloor: 0,
              careerWallPinned: false,
              dimensions: {
                ...derived.dimensions,
                craft_career: { ...derived.dimensions.craft_career, score: craftScore },
              },
            },
          };
        });
      },

      setDriveLine: (value) => {
        set({ driveLine: sanitizeDriveLine(value) });
      },

      setMethodSignals: (value) => {
        runIfAllowed('custom_signal', localDateKey(), () => {
          set({ methodSignals: sanitizeMethodSignals(value) });
        }, (reason) => set({ accessBlock: reason }));
      },

      startCampaign: (title, horizonMonths) => {
        runIfAllowed('goal', localDateKey(), () => {
        if (activeCampaign(get().campaigns) !== undefined) {
          return;
        }
        const cleaned = sanitizeCampaignTitle(title);
        if (cleaned.length === 0 || !Number.isInteger(horizonMonths)) {
          return;
        }

        const horizon = Math.min(HORIZON_MONTHS_MAX, Math.max(HORIZON_MONTHS_MIN, horizonMonths));
        const proposal = proposeCampaignVectors(cleaned);

        set((state) => ({
          campaigns: seatActiveCampaign(state.campaigns, {
            id: createCampaignId(),
            title: cleaned,
            horizonMonths: horizon,
            startedOn: localDateKey(),
            status: 'active',
            primary: proposal.primary,
            supporting: proposal.supporting,
            vectorsConfirmed: false,
            created: false,
            takenAdviceIds: [],
          }),
          disciplineCompleted: [],
        }));
        }, (reason) => set({ accessBlock: reason }));
      },

      setCampaignVectors: (campaignId, primary, supporting) => {
        set((state) => ({
          campaigns: mapCampaign(state.campaigns, campaignId, (campaign) => ({
            ...campaign,
            primary,
            supporting: supporting.filter((id) => id !== primary).slice(0, MAX_SUPPORTING_VECTORS),
          })),
        }));
      },

      confirmCampaignVectors: (campaignId) => {
        set((state) => ({
          campaigns: mapCampaign(state.campaigns, campaignId, (campaign) => ({
            ...campaign,
            vectorsConfirmed: true,
          })),
        }));
      },

      declareCampaign: (campaignId) => {
        set((state) => {
          const campaign = state.campaigns.find((item) => item.id === campaignId);
          if (
            campaign === undefined ||
            campaign.status !== 'active' ||
            !campaign.vectorsConfirmed ||
            campaign.created
          ) {
            return {};
          }

          return {
            campaigns: mapCampaign(state.campaigns, campaignId, (item) => ({
              ...item,
              created: true,
              startedOn: localDateKey(),
            })),
            disciplineBeacon: true,
          };
        });
      },

      acceptCampaignAdvice: (campaignId, adviceId, copy) => {
        runIfAllowed('goal', localDateKey(), () => {
        const state = get();
        const campaign = state.campaigns.find((candidate) => candidate.id === campaignId);
        if (campaign === undefined || campaign.status !== 'active' || !campaign.vectorsConfirmed) {
          return;
        }

        if (campaign.takenAdviceIds.includes(adviceId)) {
          return;
        }

        if (countPendingCampaignAtoms(state.tasks, campaignId) >= MAX_PENDING_CAMPAIGN_ATOMS) {
          return;
        }

        const title = copy.title.trim();
        if (title.length === 0) {
          return;
        }

        const instruction = copy.instruction.trim();
        const input: NewAtomInput = {
          id: createAtomId(),
          title,
          dimensionId: copy.dimensionId,
          xp: CAMPAIGN_ATOM_XP,
          kind: 'campaign',
          campaignId,
        };

        const nextTasks = [
          ...state.tasks,
          toAtomizedTask(
            instruction.length === 0 ? input : { ...input, instruction },
          ),
        ];

        set({
          tasks: nextTasks,
          profile: stampDiscipline(state.profile, nextTasks, state.shadowEvents),
          campaigns: mapCampaign(state.campaigns, campaignId, (current) => ({
            ...current,
            takenAdviceIds: [...current.takenAdviceIds, adviceId],
          })),
        });
        }, (reason) => set({ accessBlock: reason }));
      },

      addCampaignAtom: (campaignId, input) => {
        runIfAllowed('goal', localDateKey(), () => {
        const state = get();
        const campaign = state.campaigns.find((candidate) => candidate.id === campaignId);
        if (campaign === undefined || campaign.status !== 'active' || !campaign.vectorsConfirmed) {
          return;
        }

        if (countPendingCampaignAtoms(state.tasks, campaignId) >= MAX_PENDING_CAMPAIGN_ATOMS) {
          return;
        }

        const title = input.title.trim();
        if (title.length === 0) {
          return;
        }

        const instruction = input.instruction?.trim();
        const atom: NewAtomInput = {
          id: createAtomId(),
          title,
          dimensionId: input.dimensionId,
          xp: CAMPAIGN_ATOM_XP,
          kind: 'campaign',
          campaignId,
        };

        const nextTasks = [
          ...state.tasks,
          toAtomizedTask(
            instruction === undefined || instruction.length === 0
              ? atom
              : { ...atom, instruction },
          ),
        ];

        set({
          tasks: nextTasks,
          profile: stampDiscipline(state.profile, nextTasks, state.shadowEvents),
        });
        }, (reason) => set({ accessBlock: reason }));
      },

      completeCampaign: (campaignId) => {
        set((state) => {
          const campaign = state.campaigns.find((item) => item.id === campaignId);
          if (campaign === undefined || campaign.status !== 'active') {
            return {};
          }

          return closeCampaignDesk(state, campaign);
        });
      },

      shelveCampaign: (campaignId) => {
        set((state) => {
          const { kept, absorbed } = partitionCampaignAtoms(state.tasks, campaignId);
          let profile = state.profile;

          for (const task of absorbed) {
            if (task.absorbedOn !== undefined) {
              profile = applyAbsorption(profile, task, task.absorbedOn, false);
            }
          }

          return {
            tasks: kept,
            profile: stampDiscipline(profile, kept, state.shadowEvents),
            campaigns: mapCampaign(state.campaigns, campaignId, (campaign) => ({
              ...campaign,
              status: 'reserve' as const,
            })),
            disciplineBeacon: false,
          };
        });
      },

      resetProgress: () => {
        const {
          profile,
          language,
          surveyAnswers,
          surveyApplied,
          driveLine,
          campaigns,
          methodSignals,
          talents,
          achievements,
          proofBackgroundUri,
          aiApiKey,
          counselThread,
          lifeVectorReading,
          tasks,
          disciplineCompleted,
          soundEnabled,
          musicEnabled,
          breathAwardedOn,
        } = get();
        const baseline = createBaselineState();

        const nextTasks = tasks.filter((task) => task.kind === 'canon');

        set({
          ...baseline,
          language,
          surveyAnswers,
          surveyApplied,
          driveLine,
          campaigns,
          methodSignals,
          talents,
          achievements,
          proofBackgroundUri,
          aiApiKey,
          counselThread,
          lifeVectorReading,
          disciplineCompleted,
          profile: stampDiscipline(profile, nextTasks, []),
          soundEnabled,
          musicEnabled,
          breathAwardedOn,
          tasks: nextTasks,
          disciplineBeacon: false,
        });
      },

      resetAllData: () => {
        set({
          ...createBaselineState(),
          isHydrated: true,
        });
      },

      confessShadow: (catalogId) => {
        runIfAllowed('shadow_mark', localDateKey(), () => {
        const today = localDateKey();
        const entry = shadowEntry(catalogId);

        set((state) => {
          let lifeClockStarted = state.profile.lifeClockStarted;
          for (const dimensionId of entry.dimensionIds) {
            lifeClockStarted = startLifeClock(lifeClockStarted, dimensionId);
          }

          const shadowEvents = [
            ...state.shadowEvents,
            { id: createShadowEventId(), catalogId, occurredOn: today },
          ];

          return {
            shadowEvents,
            profile: stampDiscipline(
              withDerivedScores({
                ...state.profile,
                lifeClockStarted,
              }),
              state.tasks,
              shadowEvents,
            ),
          };
        });
        }, (reason) => set({ accessBlock: reason }));
      },

      retractShadow: (catalogId) => {
        runIfAllowed('shadow_retract', localDateKey(), () => {
        const today = localDateKey();

        set((state) => {
          const event = latestWindowShadow(state.shadowEvents, catalogId, today);
          if (event === undefined) {
            return {};
          }

          const shadowEvents = state.shadowEvents.filter((item) => item.id !== event.id);

          return {
            shadowEvents,
            profile: stampDiscipline(state.profile, state.tasks, shadowEvents),
          };
        });
        }, (reason) => set({ accessBlock: reason }));
      },

      addTalent: (input) => {
        runIfAllowed('talent', localDateKey(), () => {
        const title = sanitizeTalentTitle(input.title);
        if (title.length === 0) {
          return;
        }

        const today = localDateKey();
        const state = get();

        if (!canAddTalent(state.talents, input.dimensionId)) {
          return;
        }

        if (input.parentId !== undefined) {
          const parent = state.talents.find((node) => node.id === input.parentId);
          if (parent === undefined || parent.dimensionId !== input.dimensionId) {
            return;
          }
        }

        const node: TalentNode = {
          id: createTalentId(),
          dimensionId: input.dimensionId,
          title,
          createdOn: today,
          ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
        };

        const grantXp =
          input.dimensionId !== 'craft_career' &&
          canGrantTalentXp(state.talents, input.dimensionId, today);
        let profile = state.profile;

        if (grantXp) {
          let lifeClockStarted = startLifeClock(profile.lifeClockStarted, input.dimensionId);
          const partner = linkedPracticePartner(input.dimensionId);
          if (partner !== null) {
            lifeClockStarted = startLifeClock(lifeClockStarted, partner);
          }

          profile = withDerivedScores({
            ...profile,
            xpJournal: applyJournalXp(profile.xpJournal, input.dimensionId, today, TALENT_NODE_XP),
            lifeClockStarted,
          });
        }

        set({
          talents: [...state.talents, node],
          profile,
        });
        }, (reason) => set({ accessBlock: reason }));
      },

      removeTalent: (id) => {
        const state = get();
        const node = state.talents.find((item) => item.id === id);

        if (node === undefined || !isTalentLeaf(state.talents, node.id, node.dimensionId)) {
          return;
        }

        const today = localDateKey();
        const profile = nodeGrantedTalentXp(state.talents, node, today)
          ? withDerivedScores({
              ...state.profile,
              xpJournal: applyJournalXp(
                state.profile.xpJournal,
                node.dimensionId,
                node.createdOn,
                -TALENT_NODE_XP,
              ),
            })
          : state.profile;

        set({
          talents: state.talents.filter((item) => item.id !== id),
          profile,
        });
      },

      renameTalent: (id, title) => {
        const clean = sanitizeTalentTitle(title);
        if (clean.length === 0) {
          return;
        }

        const state = get();
        if (!state.talents.some((node) => node.id === id)) {
          return;
        }

        set({
          talents: state.talents.map((node) => (node.id === id ? { ...node, title: clean } : node)),
        });
      },

      addAchievement: (title, detail) => {
        runIfAllowed('achievement', localDateKey(), () => {
        const cleanTitle = sanitizeAchievementTitle(title);
        if (cleanTitle.length === 0) {
          return;
        }

        const state = get();
        if (state.achievements.length >= MAX_ACHIEVEMENTS) {
          return;
        }

        set({
          achievements: [
            ...state.achievements,
            {
              id: createAchievementId(),
              title: cleanTitle,
              detail: sanitizeAchievementDetail(detail),
              achievedOn: localDateKey(),
            },
          ],
        });
        }, (reason) => set({ accessBlock: reason }));
      },

      removeAchievement: (id) => {
        set((state) => ({
          achievements: state.achievements.filter((item) => item.id !== id),
        }));
      },

      completeDisciplineStep: (id) => {
        runIfAllowed('goal', localDateKey(), () => {
        set((state) => {
          const disciplineCompleted = withCompletedDisciplineStep(state.disciplineCompleted, id);
          if (
            !isDisciplineTreeComplete(disciplineCompleted) ||
            isDisciplineTreeComplete(state.disciplineCompleted)
          ) {
            return { disciplineCompleted };
          }

          const campaign = createdCampaign(state.campaigns);
          if (campaign === undefined) {
            return { disciplineCompleted };
          }

          return {
            disciplineCompleted,
            ...closeCampaignDesk(state, campaign),
          };
        });
        }, (reason) => set({ accessBlock: reason }));
      },

      uncompleteDisciplineStep: (id) => {
        set((state) => ({
          disciplineCompleted: withUncompletedDisciplineStep(state.disciplineCompleted, id),
        }));
      },

      setProofBackgroundUri: (uri) => {
        runIfAllowed('grail_card', localDateKey(), () => {
          set({ proofBackgroundUri: uri.trim() });
        }, (reason) => set({ accessBlock: reason }));
      },

      setAiApiKey: (value) => {
        set({ aiApiKey: sanitizeApiKey(value) });
      },

      appendCounselMessage: (message) => {
        set((state) => ({
          counselThread: [...state.counselThread, message].slice(-MAX_COUNSEL_MESSAGES),
        }));
      },

      dropLastCounselUserMessage: () => {
        set((state) => {
          const last = state.counselThread[state.counselThread.length - 1];
          if (last === undefined || last.role !== 'user') {
            return {};
          }

          return { counselThread: state.counselThread.slice(0, -1) };
        });
      },

      setLifeVectorReading: (value) => {
        set({ lifeVectorReading: value.trim() });
      },

      setSoundEnabled: (value) => {
        set({ soundEnabled: value });
      },

      setMusicEnabled: (value) => {
        set({ musicEnabled: value });
      },

      setDisciplineBeacon: (value) => {
        set({ disciplineBeacon: value });
      },

      awardBreathPractice: () => {
        const today = localDateKey();
        const state = get();
        if (!canAwardBreathPractice(state.breathAwardedOn, today)) {
          return false;
        }

        set({
          breathAwardedOn: today,
          profile: applyBreathPracticeReward(state.profile, today),
        });
        return true;
      },

      checkTaskDeadlines: () => {
        const { profile, tasks, shadowEvents } = get();
        const today = localDateKey();
        const tick = tickCanonCalendar({
          lastDecayDate: profile.lastDecayDate,
          today,
          canonWeekStart: profile.canonWeekStart,
          promiseJournal: profile.promiseJournal,
          disciplineScore: profile.disciplineScore,
          currentStreak: profile.currentStreak,
          tasks,
        });

        let nextTasks = tick.tasks.map((task) =>
          withRitualState(task, task.ritualState, task.absorbedOn),
        );
        let nextProfile = profile;

        if (tick.daysElapsed > 0) {
          nextProfile = withDerivedScores({
            ...profile,
            dimensions: advanceLifeDimensions(
              profile.dimensions,
              profile.xpJournal,
              tick.daysElapsed,
              today,
              profile.lifeClockStarted,
              shadowEvents,
              profile.careerCeiling,
            ),
            xpJournal: trimXpJournal(profile.xpJournal, today),
            promiseJournal: tick.promiseJournal,
            canonWeekStart: tick.canonWeekStart,
            currentStreak: tick.currentStreak,
            lastDecayDate: today,
          });
        }

        const opened = applyFirstOpen({
          firstOpenOn: nextProfile.firstOpenOn,
          lastDecayDate: nextProfile.lastDecayDate,
          tasks: nextTasks,
          journal: nextProfile.promiseJournal,
          today,
        });
        nextTasks = ensureClosedChronicle(opened.tasks, opened.firstOpenOn, today);
        nextProfile = {
          ...nextProfile,
          firstOpenOn: opened.firstOpenOn,
          promiseJournal: opened.journal,
        };
        nextProfile = stampDiscipline(nextProfile, nextTasks, shadowEvents);

        const tasksChanged = nextTasks.some((task, index) => {
          const previous = tasks[index];
          return (
            previous === undefined ||
            task.isOverdue !== previous.isOverdue ||
            task.ritualState !== previous.ritualState ||
            task.absorbedOn !== previous.absorbedOn ||
            task.id !== previous.id ||
            task.timeDeadline !== previous.timeDeadline
          );
        });

        if (
          tick.daysElapsed === 0 &&
          !tasksChanged &&
          nextTasks.length === tasks.length &&
          nextProfile.firstOpenOn === profile.firstOpenOn &&
          nextProfile.disciplineScore === profile.disciplineScore
        ) {
          return;
        }

        set({ tasks: nextTasks, profile: nextProfile });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        tasks: state.tasks,
        viewMode: state.viewMode,
        language: state.language,
        surveyAnswers: state.surveyAnswers,
        surveyApplied: state.surveyApplied,
        shadowEvents: state.shadowEvents,
        driveLine: state.driveLine,
        campaigns: state.campaigns,
        methodSignals: state.methodSignals,
        talents: state.talents,
        proofBackgroundUri: state.proofBackgroundUri,
        aiApiKey: state.aiApiKey,
        counselThread: state.counselThread,
        lifeVectorReading: state.lifeVectorReading,
        achievements: state.achievements,
        disciplineCompleted: state.disciplineCompleted,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        disciplineBeacon: state.disciplineBeacon,
        breathAwardedOn: state.breathAwardedOn,
      }),
      migrate: migratePersistedState,
      onRehydrateStorage: () => (_persisted, _error) => {
        const state = useGrailStore.getState();
        useGrailStore.setState({
          isHydrated: true,
          methodSignals: sanitizeMethodSignals(state.methodSignals),
        });
      },
    },
  ),
);
