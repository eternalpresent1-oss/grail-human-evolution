import { type HumanDimensionId } from '@/types/grail';

/** One node on a vector branch. Children nest under `parentId`. */
export interface TalentNode {
  readonly id: string;
  readonly dimensionId: HumanDimensionId;
  readonly title: string;
  readonly createdOn: string;
  readonly parentId?: string;
}

/**
 * Far below a daily atom (15 XP). Two nodes in a week fill the cap of one
 * vector — the tree can still grow after that, the octagon does not.
 */
export const TALENT_NODE_XP = 5;
export const TALENT_WEEKLY_XP_CAP = 10;
export const MAX_TALENTS_PER_VECTOR = 16;
