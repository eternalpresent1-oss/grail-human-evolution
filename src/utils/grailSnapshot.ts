import { createdCampaign, type Campaign } from '@/types/campaign';
import { type CounselMessage } from '@/types/counsel';
import { type Achievement } from '@/types/achievement';
import {
  HUMAN_DIMENSION_IDS,
  isOnDailyRoster,
  type AtomizedTask,
  type ShadowEvent,
  type UserProfile,
} from '@/types/grail';
import { type TalentNode } from '@/types/talent';
import { dimensionNameKey, shadowTitleKey, type Translator } from '@/i18n';
import { atomTitle } from '@/utils/atomContent';
import { formatScore } from '@/utils/formatScore';
import { computeAllShadowShares, tallyShadowCatalog } from '@/utils/weekLedger';

export interface GrailCounselSnapshotInput {
  readonly t: Translator;
  readonly profile: UserProfile;
  readonly tasks: readonly AtomizedTask[];
  readonly campaigns: readonly Campaign[];
  readonly talents: readonly TalentNode[];
  readonly achievements: readonly Achievement[];
  readonly driveLine: string;
  readonly shadowEvents: readonly ShadowEvent[];
  readonly asOf: string;
}

/**
 * Plain-language dump of in-app facts. Scores are reported as already
 * computed — the model must not invent new numbers or place atoms.
 */
export function buildGrailCounselSnapshot(input: GrailCounselSnapshotInput): string {
  const { t, profile, tasks, campaigns, talents, achievements, driveLine, shadowEvents, asOf } =
    input;
  const roster = tasks.filter((task) => isOnDailyRoster(task, asOf));
  const pending = roster.filter((task) => task.ritualState === 'pending');
  const absorbed = roster.filter((task) => task.ritualState === 'absorbed');
  const goal = createdCampaign(campaigns);

  const octagon = HUMAN_DIMENSION_IDS.map((id) => {
    const dimension = profile.dimensions[id];
    const score = dimension === undefined ? 0 : dimension.score;
    const gated =
      id === 'craft_career' && profile.careerCeiling < 100
        ? ` gated@${Math.round(profile.careerCeiling)}`
        : '';

    return `- ${t(dimensionNameKey(id))}: ${formatScore(score)}%${gated}`;
  });

  const tree = HUMAN_DIMENSION_IDS.flatMap((id) => {
    const names = talents
      .filter((node) => node.dimensionId === id)
      .map((node) => node.title);
    if (names.length === 0) {
      return [];
    }

    return [`- ${t(dimensionNameKey(id))}: ${names.join('; ')}`];
  });

  const desk = pending.map((task) => `- ${atomTitle(task, t)} (${t(dimensionNameKey(task.dimensionId))})`);
  const kept = absorbed.map((task) => `- ${atomTitle(task, t)}`);

  const feats = achievements.map((item) =>
    item.detail.length === 0 ? `- ${item.title}` : `- ${item.title} (${item.detail})`,
  );

  return [
    `Date: ${asOf}`,
    `Level: ${profile.characterLevel}`,
    `Discipline: ${formatScore(profile.disciplineScore)}%`,
    driveLine.length === 0 ? 'Drive: (empty)' : `Drive: ${driveLine}`,
    goal === undefined ? 'Goal: (none)' : `Goal: ${goal.title} (${goal.horizonMonths} mo)`,
    'Primary: the octagon. Rank the person from these eight life scores. Everything below is secondary.',
    'Octagon:',
    ...octagon,
    ...formatShadowSnapshot(t, shadowEvents, asOf),
    `Today pending (${pending.length}):`,
    desk.length === 0 ? '- none' : desk.join('\n'),
    `Today absorbed (${absorbed.length}):`,
    kept.length === 0 ? '- none' : kept.join('\n'),
    'Talent tree (biography only; secondary; not current practice):',
    tree.length === 0 ? '- none' : tree.join('\n'),
    `Achievements (${achievements.length}):`,
    feats.length === 0 ? '- none' : feats.join('\n'),
  ].join('\n');
}

function formatShadowSnapshot(
  t: Translator,
  events: readonly ShadowEvent[],
  asOf: string,
): readonly string[] {
  const shares = computeAllShadowShares(events, asOf);
  const tally = tallyShadowCatalog(events, asOf);
  if (tally.length === 0) {
    return ['Shadow this week: none'];
  }

  const axes = HUMAN_DIMENSION_IDS.filter((id) => (shares[id] ?? 0) > 0).map(
    (id) => `${t(dimensionNameKey(id))}: ${formatScore(shares[id] ?? 0)}%`,
  );
  const confessions = tally.map((entry) => `- ${t(shadowTitleKey(entry.catalogId))} × ${entry.count}`);

  return [
    'Shadow this week (share of weekly norm):',
    ...axes,
    'Shadow confessions:',
    ...confessions,
  ];
}

export function counselSystemPrompt(language: 'ru' | 'en'): string {
  if (language === 'ru') {
    return [
      'Ты советник приложения Arche: Architect of the Self.',
      'Отвечай только по снимку данных. Не выдумывай и не меняй цифры шкал.',
      'Не ставь атомы, не назначай дедлайны, не пиши XP.',
      'Главное — октагон: восемь жизненных шкал. Читай человека по ним.',
      'Дерево талантов — биография на фоне, не расписание и не центр рассказа.',
      'Не говори, что человек сейчас занимается навыком из дерева, пока этого нет среди сегодняшних дел.',
      'Не ставь диагнозов. Если в снимке есть тень — упомяни её вскользь, не выводи на первый план. Коротко, по делу, на русском.',
    ].join(' ');
  }

  return [
    'You are the counsellor inside Arche: Architect of the Self.',
    'Answer only from the snapshot. Never invent or rewrite scores.',
    'Do not place atoms, set deadlines, or award XP.',
    'The octagon is primary: eight life scores. Read the person from those numbers.',
    'The talent tree is biography in the background, not a timetable and not the centre of the reading.',
    'Do not say they currently practice a tree skill unless it is among today\'s deeds.',
    'No diagnoses. If the snapshot has a shadow, mention it in passing; do not let it take the lead. Be brief. Answer in English.',
  ].join(' ');
}

export function lifeVectorPrompt(language: 'ru' | 'en'): string {
  if (language === 'ru') {
    return [
      'По снимку напиши вектор жизни как живую речь.',
      'Три коротких шага, как будто говоришь человеку рядом.',
      'Опирайся на октагон: сильные и слабые стороны по восьми шкалам — это и есть чтение.',
      'Дерево талантов не главное. Не строй на нём рассказ. Если назовёшь навык из дерева — только вскользь, и не как то, чем человек занимается сейчас.',
      'Если есть тень — упомяни её вскользь, не ставь в центр.',
      'Без слов «атом», «вектор», «ядро», «октагон», «XP». Без новых цифр. Не ставь задания в список.',
    ].join(' ');
  }

  return [
    'From the snapshot, write the vector of a life as spoken language.',
    'Three short steps, as if talking to the person beside you.',
    'Ground the reading in the octagon: the high and low of the eight life scores.',
    'The talent tree is not the lead. Do not build the story on it. If you name a tree skill, only in passing, and not as what they do now.',
    'If there is a shadow, mention it in passing; do not let it take the lead.',
    'No words like atom, vector, core, octagon, or XP. No new numbers. Do not place tasks on the list.',
  ].join(' ');
}

export function sanitizeCounselThread(value: unknown): readonly CounselMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const messages: CounselMessage[] = [];

  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') {
      continue;
    }

    const raw = entry as { readonly id?: unknown; readonly role?: unknown; readonly text?: unknown };
    if (typeof raw.id !== 'string' || raw.id.length === 0) {
      continue;
    }

    if (raw.role !== 'user' && raw.role !== 'assistant') {
      continue;
    }

    if (typeof raw.text !== 'string') {
      continue;
    }

    const text = raw.text.trim();
    if (text.length === 0) {
      continue;
    }

    messages.push({ id: raw.id, role: raw.role, text: text.slice(0, 4_000) });
  }

  return messages.slice(-40);
}

export function sanitizeApiKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function sanitizeProofUri(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function sanitizeLifeVectorReading(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 4_000) : '';
}
