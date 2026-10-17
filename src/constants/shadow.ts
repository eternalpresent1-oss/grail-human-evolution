import {
  CANON_SLOT_XP,
  HUMAN_DIMENSION_IDS,
  SHADOW_CATALOG_IDS,
  type HumanDimensionId,
  type ShadowCatalogId,
} from '@/types/grail';

export interface ShadowCatalogEntry {
  readonly id: ShadowCatalogId;
  readonly dimensionIds: readonly HumanDimensionId[];
  readonly xpCost: number;
  readonly hitsDiscipline: boolean;
}

export const SHADOW_CATALOG: readonly ShadowCatalogEntry[] = [
  {
    id: 'substance_or_sleep',
    dimensionIds: ['physical', 'mind_psyche'],
    xpCost: CANON_SLOT_XP,
    hitsDiscipline: false,
  },
  {
    id: 'feed_instead_of_contact',
    dimensionIds: HUMAN_DIMENSION_IDS,
    xpCost: CANON_SLOT_XP,
    hitsDiscipline: false,
  },
  {
    id: 'impulse_spend',
    dimensionIds: ['wealth'],
    xpCost: CANON_SLOT_XP,
    hitsDiscipline: false,
  },
  {
    id: 'broke_word',
    dimensionIds: ['drive'],
    xpCost: CANON_SLOT_XP,
    hitsDiscipline: true,
  },
  {
    id: 'spite_or_lie',
    dimensionIds: ['social', 'spirit'],
    xpCost: CANON_SLOT_XP,
    hitsDiscipline: false,
  },
];

const SHADOW_BY_ID = new Map<ShadowCatalogId, ShadowCatalogEntry>(
  SHADOW_CATALOG.map((entry) => [entry.id, entry]),
);

export function shadowEntry(id: ShadowCatalogId): ShadowCatalogEntry {
  const entry = SHADOW_BY_ID.get(id);
  if (entry === undefined) {
    throw new Error(`unknown shadow catalog id: ${id}`);
  }

  return entry;
}

export function isShadowCatalogId(value: string): value is ShadowCatalogId {
  return (SHADOW_CATALOG_IDS as readonly string[]).includes(value);
}

/**
 * When two confessions have the same count, the more specific stain is read
 * first. The feed fills every axis, so it must not steal the card.
 */
export const SHADOW_READING_PRIORITY: readonly ShadowCatalogId[] = [
  'substance_or_sleep',
  'broke_word',
  'spite_or_lie',
  'impulse_spend',
  'feed_instead_of_contact',
];
