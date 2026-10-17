import { HUMAN_DIMENSION_IDS, type HumanDimensionId } from '@/types/grail';
import {
  MAX_TALENTS_PER_VECTOR,
  TALENT_NODE_XP,
  TALENT_WEEKLY_XP_CAP,
  type TalentNode,
} from '@/types/talent';
import { isIsoDateKey, weekMondayOf } from '@/utils/taskTime';

const TITLE_MAX = 80;

export function sanitizeTalentTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, TITLE_MAX);
}

export function sanitizeTalents(value: unknown): readonly TalentNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const nodes: TalentNode[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') {
      continue;
    }

    const raw = entry as {
      readonly id?: unknown;
      readonly dimensionId?: unknown;
      readonly title?: unknown;
      readonly createdOn?: unknown;
      readonly parentId?: unknown;
    };

    if (typeof raw.id !== 'string' || seen.has(raw.id)) {
      continue;
    }

    if (
      typeof raw.dimensionId !== 'string' ||
      !(HUMAN_DIMENSION_IDS as readonly string[]).includes(raw.dimensionId)
    ) {
      continue;
    }

    if (typeof raw.title !== 'string') {
      continue;
    }

    const title = sanitizeTalentTitle(raw.title);
    if (title.length === 0) {
      continue;
    }

    if (typeof raw.createdOn !== 'string' || !isIsoDateKey(raw.createdOn)) {
      continue;
    }

    seen.add(raw.id);

    const node: TalentNode = {
      id: raw.id,
      dimensionId: raw.dimensionId as HumanDimensionId,
      title,
      createdOn: raw.createdOn,
    };

    nodes.push(
      typeof raw.parentId === 'string' && raw.parentId.length > 0
        ? { ...node, parentId: raw.parentId }
        : node,
    );
  }

  return nodes.filter((node) => {
    if (node.parentId === undefined) {
      return true;
    }

    return nodes.some(
      (candidate) => candidate.id === node.parentId && candidate.dimensionId === node.dimensionId,
    );
  });
}

export function talentsOnVector(
  talents: readonly TalentNode[],
  dimensionId: HumanDimensionId,
): readonly TalentNode[] {
  return talents.filter((node) => node.dimensionId === dimensionId);
}

export function talentChildren(
  talents: readonly TalentNode[],
  parentId: string | undefined,
  dimensionId: HumanDimensionId,
): readonly TalentNode[] {
  return talents.filter(
    (node) =>
      node.dimensionId === dimensionId &&
      (parentId === undefined ? node.parentId === undefined : node.parentId === parentId),
  );
}

export function talentXpThisWeek(
  talents: readonly TalentNode[],
  dimensionId: HumanDimensionId,
  today: string,
): number {
  const monday = weekMondayOf(today);
  const count = talents.filter(
    (node) => node.dimensionId === dimensionId && weekMondayOf(node.createdOn) === monday,
  ).length;

  return count * TALENT_NODE_XP;
}

export function canGrantTalentXp(
  talents: readonly TalentNode[],
  dimensionId: HumanDimensionId,
  today: string,
): boolean {
  return talentXpThisWeek(talents, dimensionId, today) + TALENT_NODE_XP <= TALENT_WEEKLY_XP_CAP;
}

const TALENT_WEEK_SLOTS = TALENT_WEEKLY_XP_CAP / TALENT_NODE_XP;

/** Craft is biography only. The first two nodes of any other vector, this week, are the ones that moved the scale. */
export function nodeGrantedTalentXp(
  talents: readonly TalentNode[],
  node: TalentNode,
  today: string,
): boolean {
  if (node.dimensionId === 'craft_career') {
    return false;
  }

  const monday = weekMondayOf(today);
  if (weekMondayOf(node.createdOn) !== monday) {
    return false;
  }

  const index = talents.findIndex((candidate) => candidate.id === node.id);
  if (index < 0) {
    return false;
  }

  const earlier = talents
    .slice(0, index)
    .filter(
      (candidate) =>
        candidate.dimensionId === node.dimensionId && weekMondayOf(candidate.createdOn) === monday,
    ).length;

  return earlier < TALENT_WEEK_SLOTS;
}

export function canAddTalent(
  talents: readonly TalentNode[],
  dimensionId: HumanDimensionId,
): boolean {
  return talentsOnVector(talents, dimensionId).length < MAX_TALENTS_PER_VECTOR;
}

export function isTalentLeaf(
  talents: readonly TalentNode[],
  nodeId: string,
  dimensionId: HumanDimensionId,
): boolean {
  return talentChildren(talents, nodeId, dimensionId).length === 0;
}

export function lastTalentOnVector(
  talents: readonly TalentNode[],
  dimensionId: HumanDimensionId,
): TalentNode | undefined {
  const onVector = talentsOnVector(talents, dimensionId);
  if (onVector.length === 0) {
    return undefined;
  }

  const leaves = onVector.filter((node) => isTalentLeaf(talents, node.id, dimensionId));
  return leaves[leaves.length - 1] ?? onVector[onVector.length - 1];
}
