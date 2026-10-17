/** Ten steps of the goal path, drawn as the Tree of Life. */
export const DISCIPLINE_STEP_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type DisciplineStepId = (typeof DISCIPLINE_STEP_IDS)[number];

export const DISCIPLINE_EDGES: readonly (readonly [DisciplineStepId, DisciplineStepId])[] = [
  [1, 2],
  [1, 3],
  [1, 6],
  [2, 3],
  [2, 4],
  [2, 6],
  [3, 5],
  [3, 6],
  [4, 5],
  [4, 6],
  [4, 7],
  [5, 6],
  [5, 8],
  [6, 7],
  [6, 8],
  [6, 9],
  [7, 8],
  [7, 9],
  [8, 9],
  [9, 10],
];

/** Normalised positions inside the tree canvas (x, y from 0 to 1). */
export const DISCIPLINE_LAYOUT: Record<DisciplineStepId, { readonly x: number; readonly y: number }> =
  {
    1: { x: 0.5, y: 0.07 },
    2: { x: 0.74, y: 0.22 },
    3: { x: 0.26, y: 0.22 },
    4: { x: 0.82, y: 0.4 },
    5: { x: 0.18, y: 0.4 },
    6: { x: 0.5, y: 0.4 },
    7: { x: 0.7, y: 0.58 },
    8: { x: 0.3, y: 0.58 },
    9: { x: 0.5, y: 0.74 },
    10: { x: 0.5, y: 0.91 },
  };

export type DisciplineNodeState = 'locked' | 'active' | 'completed';
