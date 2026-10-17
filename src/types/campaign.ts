import { CANON_SLOT_XP, type HumanDimensionId } from '@/types/grail';

export const CAMPAIGN_STATUSES = ['active', 'reserve', 'done'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_ADVICE_IDS = [
  'physical_session',
  'intellect_source',
  'mind_still',
  'drive_first',
  'craft_artifact',
  'wealth_count',
  'social_contact',
  'spirit_inspect',
  'engineer_course',
  'engineer_project',
  'engineer_mentor',
] as const;

export type CampaignAdviceId = (typeof CAMPAIGN_ADVICE_IDS)[number];

export const MAX_PENDING_CAMPAIGN_ATOMS = 3;
export const MAX_SUPPORTING_VECTORS = 3;
export const CAMPAIGN_TITLE_MAX = 120;
export const HORIZON_MONTHS_MIN = 1;
export const HORIZON_MONTHS_MAX = 360;
export const CAMPAIGN_ATOM_XP = CANON_SLOT_XP;

export interface Campaign {
  readonly id: string;
  readonly title: string;
  readonly horizonMonths: number;
  readonly startedOn: string;
  readonly status: CampaignStatus;
  readonly primary: HumanDimensionId;
  readonly supporting: readonly HumanDimensionId[];
  readonly vectorsConfirmed: boolean;
  /** User pressed «Цель создана» — the goal is live and discipline stages open. */
  readonly created: boolean;
  readonly takenAdviceIds: readonly CampaignAdviceId[];
}

export interface CampaignAdvice {
  readonly id: CampaignAdviceId;
  readonly dimensionId: HumanDimensionId;
}

export const CAMPAIGN_ADVICE: readonly CampaignAdvice[] = [
  { id: 'physical_session', dimensionId: 'physical' },
  { id: 'intellect_source', dimensionId: 'intellect' },
  { id: 'mind_still', dimensionId: 'mind_psyche' },
  { id: 'drive_first', dimensionId: 'drive' },
  { id: 'craft_artifact', dimensionId: 'craft_career' },
  { id: 'wealth_count', dimensionId: 'wealth' },
  { id: 'social_contact', dimensionId: 'social' },
  { id: 'spirit_inspect', dimensionId: 'spirit' },
  { id: 'engineer_course', dimensionId: 'intellect' },
  { id: 'engineer_project', dimensionId: 'craft_career' },
  { id: 'engineer_mentor', dimensionId: 'social' },
];

export function isCampaignAdviceId(value: string): value is CampaignAdviceId {
  return (CAMPAIGN_ADVICE_IDS as readonly string[]).includes(value);
}

export function isCampaignStatus(value: string): value is CampaignStatus {
  return (CAMPAIGN_STATUSES as readonly string[]).includes(value);
}

export function campaignAdvice(id: CampaignAdviceId): CampaignAdvice {
  const entry = CAMPAIGN_ADVICE.find((item) => item.id === id);
  if (entry === undefined) {
    throw new Error(`unknown campaign advice: ${id}`);
  }

  return entry;
}

export function activeCampaign(campaigns: readonly Campaign[]): Campaign | undefined {
  return campaigns.find((campaign) => campaign.status === 'active');
}

export function createdCampaign(campaigns: readonly Campaign[]): Campaign | undefined {
  const campaign = activeCampaign(campaigns);
  return campaign?.created === true ? campaign : undefined;
}

export function campaignVectorIds(campaign: Campaign): readonly HumanDimensionId[] {
  return [campaign.primary, ...campaign.supporting.filter((id) => id !== campaign.primary)];
}
