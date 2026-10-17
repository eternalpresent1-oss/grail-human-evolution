import { type HumanDimensionId } from '@/types/grail';
import {
  CAMPAIGN_ADVICE,
  campaignVectorIds,
  type Campaign,
  type CampaignAdvice,
  type CampaignAdviceId,
} from '@/types/campaign';

export interface VectorProposal {
  readonly primary: HumanDimensionId;
  readonly supporting: readonly HumanDimensionId[];
}

interface Shape {
  readonly pattern: RegExp;
  readonly primary: HumanDimensionId;
  readonly supporting: readonly HumanDimensionId[];
  readonly extraAdvice: readonly CampaignAdviceId[];
}

const SHAPES: readonly Shape[] = [
  {
    pattern: /инженер|engineer|программист|developer|врач|doctor|юрист|lawyer|архитектор/,
    primary: 'craft_career',
    supporting: ['intellect', 'drive'],
    extraAdvice: ['engineer_course', 'engineer_project', 'engineer_mentor'],
  },
  {
    pattern: /мышц|качалк|спорт|бега|физик|muscle|gym|sport|run/,
    primary: 'physical',
    supporting: ['drive'],
    extraAdvice: [],
  },
  {
    pattern: /долг|богат|деньг|капитал|wealth|debt|money|save/,
    primary: 'wealth',
    supporting: ['drive', 'craft_career'],
    extraAdvice: [],
  },
  {
    pattern: /книг|уч[её]б|читать|book|study|read/,
    primary: 'intellect',
    supporting: ['drive'],
    extraAdvice: [],
  },
  {
    pattern: /контакт|семь|друг|социал|people|friend|family/,
    primary: 'social',
    supporting: ['mind_psyche'],
    extraAdvice: [],
  },
  {
    pattern: /дух|молитв|медит|spirit|pray|faith/,
    primary: 'spirit',
    supporting: ['mind_psyche'],
    extraAdvice: [],
  },
  {
    pattern: /привычк|режим|дисципл|habit|routine/,
    primary: 'drive',
    supporting: ['mind_psyche'],
    extraAdvice: [],
  },
];

function haystack(title: string): string {
  return title.toLowerCase().replace(/ё/g, 'е');
}

function matchShape(title: string): Shape | undefined {
  const text = haystack(title);
  return SHAPES.find((shape) => shape.pattern.test(text));
}

/**
 * A draft of axes from the title. The user must confirm — this never writes
 * the roster and never moves a score.
 */
export function proposeCampaignVectors(title: string): VectorProposal {
  const shape = matchShape(title);

  if (shape === undefined) {
    return { primary: 'craft_career', supporting: ['intellect'] };
  }

  return { primary: shape.primary, supporting: shape.supporting };
}

const GENERIC_BY_VECTOR: Record<HumanDimensionId, CampaignAdviceId> = {
  physical: 'physical_session',
  intellect: 'intellect_source',
  mind_psyche: 'mind_still',
  drive: 'drive_first',
  craft_career: 'craft_artifact',
  wealth: 'wealth_count',
  social: 'social_contact',
  spirit: 'spirit_inspect',
};

/**
 * Advice for confirmed vectors, plus a shape pack when the title matches.
 * Already-taken ids are dropped. The machine does not add atoms.
 */
export function proposeCampaignAdvice(campaign: Campaign): readonly CampaignAdvice[] {
  const taken = new Set(campaign.takenAdviceIds);
  const ids: CampaignAdviceId[] = [];

  const shape = matchShape(campaign.title);
  if (shape !== undefined) {
    for (const id of shape.extraAdvice) {
      ids.push(id);
    }
  }

  for (const vector of campaignVectorIds(campaign)) {
    ids.push(GENERIC_BY_VECTOR[vector]);
  }

  const unique: CampaignAdviceId[] = [];
  for (const id of ids) {
    if (taken.has(id) || unique.includes(id)) {
      continue;
    }

    unique.push(id);
  }

  return unique.flatMap((id) => {
    const entry = CAMPAIGN_ADVICE.find((item) => item.id === id);
    return entry === undefined ? [] : [entry];
  });
}
