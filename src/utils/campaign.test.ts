import {
  CAMPAIGN_TITLE_MAX,
  MAX_PENDING_CAMPAIGN_ATOMS,
  createdCampaign,
  type Campaign,
} from '@/types/campaign';
import { type AtomizedTask } from '@/types/grail';
import {
  campaignMonthsLeft,
  campaignCountdown,
  campaignDeadline,
  countPendingCampaignAtoms,
  horizonFromYearsMonths,
  partitionCampaignAtoms,
  sanitizeCampaignTitle,
  sanitizeCampaigns,
  seatActiveCampaign,
  toggleSupporting,
} from '@/utils/campaign';
import { proposeCampaignAdvice, proposeCampaignVectors } from '@/utils/campaignCompiler';

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-1',
    title: 'стать инженером',
    horizonMonths: 60,
    startedOn: '2026-01-01',
    status: 'active',
    primary: 'craft_career',
    supporting: ['intellect', 'drive'],
    vectorsConfirmed: true,
    created: false,
    takenAdviceIds: [],
    ...overrides,
  };
}

function atom(overrides: Partial<AtomizedTask> = {}): AtomizedTask {
  return {
    id: 'atom-1',
    content: { source: 'custom', title: 'Ход' },
    dimensionId: 'craft_career',
    kind: 'campaign',
    ritualState: 'pending',
    isCompleted: false,
    isNonNegotiable: true,
    proofRequired: false,
    xpReward: 15,
    isOverdue: false,
    campaignId: 'campaign-1',
    ...overrides,
  };
}

describe('proposeCampaignVectors', () => {
  it('reads an engineering goal as craft, intellect and drive', () => {
    expect(proposeCampaignVectors('стать инженером')).toEqual({
      primary: 'craft_career',
      supporting: ['intellect', 'drive'],
    });
  });

  it('reads a body goal as physical', () => {
    expect(proposeCampaignVectors('накачать мышцы')).toEqual({
      primary: 'physical',
      supporting: ['drive'],
    });
  });

  it('falls back to craft and intellect', () => {
    expect(proposeCampaignVectors('разобрать жизнь')).toEqual({
      primary: 'craft_career',
      supporting: ['intellect'],
    });
  });
});

describe('proposeCampaignAdvice', () => {
  it('adds the engineering pack and drops taken ids', () => {
    const ids = proposeCampaignAdvice(campaign()).map((item) => item.id);

    expect(ids).toContain('engineer_project');
    expect(ids).toContain('craft_artifact');
    expect(
      proposeCampaignAdvice(campaign({ takenAdviceIds: ['engineer_project'] })).map(
        (item) => item.id,
      ),
    ).not.toContain('engineer_project');
  });
});

describe('sanitizeCampaigns', () => {
  it('keeps a single active campaign and shelves the rest', () => {
    const cleaned = sanitizeCampaigns([
      campaign({ id: 'a', status: 'active' }),
      campaign({ id: 'b', title: 'вторая', status: 'active' }),
    ]);

    expect(cleaned.filter((item) => item.status === 'active')).toHaveLength(1);
    expect(cleaned).toHaveLength(2);
    expect(cleaned[1]?.status).toBe('reserve');
  });

  it('drops an empty title', () => {
    expect(sanitizeCampaigns([campaign({ title: '   ' })])).toEqual([]);
  });

  it('does not treat a draft as created', () => {
    const cleaned = sanitizeCampaigns([campaign({ created: false })]);
    expect(cleaned[0]?.created).toBe(false);
    expect(createdCampaign(cleaned)).toBeUndefined();
  });

  it('keeps a declared goal as created', () => {
    const cleaned = sanitizeCampaigns([campaign({ created: true })]);
    expect(cleaned[0]?.created).toBe(true);
    expect(createdCampaign(cleaned)?.id).toBe('campaign-1');
  });
});

describe('campaign helpers', () => {
  it('trims and caps the title', () => {
    expect(sanitizeCampaignTitle('  стать   инженером  ')).toBe('стать инженером');
    expect(sanitizeCampaignTitle('x'.repeat(CAMPAIGN_TITLE_MAX + 20))).toHaveLength(
      CAMPAIGN_TITLE_MAX,
    );
  });

  it('refuses a second active goal', () => {
    const next = seatActiveCampaign(
      [campaign({ id: 'old', status: 'active' })],
      campaign({ id: 'new', title: 'долг' }),
    );

    expect(next.find((item) => item.id === 'old')?.status).toBe('active');
    expect(next.find((item) => item.id === 'new')).toBeUndefined();
  });

  it('seats a goal when none is active', () => {
    const next = seatActiveCampaign(
      [campaign({ id: 'old', status: 'done' })],
      campaign({ id: 'new', title: 'долг' }),
    );

    expect(next.find((item) => item.id === 'new')?.status).toBe('active');
  });

  it('caps supporting vectors at three', () => {
    const three = toggleSupporting(['intellect', 'drive', 'wealth'], 'social', 'craft_career');
    expect(three).toEqual(['intellect', 'drive', 'wealth']);
  });

  it('parses a horizon from years and months', () => {
    expect(horizonFromYearsMonths(5, 0)).toBe(60);
    expect(horizonFromYearsMonths(0, 0)).toBeNull();
    expect(horizonFromYearsMonths(31, 0)).toBeNull();
  });

  it('counts down from the start date to the calendar horizon', () => {
    const goal = campaign({ startedOn: '2026-01-15', horizonMonths: 1 });
    const deadline = campaignDeadline(goal);
    expect(deadline?.getFullYear()).toBe(2026);
    expect(deadline?.getMonth()).toBe(1);
    expect(deadline?.getDate()).toBe(15);

    const parts = campaignCountdown(goal, new Date(2026, 0, 15, 0, 0, 0, 0));
    expect(parts.ended).toBe(false);
    expect(parts.days).toBe(31);
    expect(parts.hours).toBe(23);
  });

  it('clips January 31 onto the last day of February', () => {
    const deadline = campaignDeadline(campaign({ startedOn: '2026-01-31', horizonMonths: 1 }));
    expect(deadline?.getMonth()).toBe(1);
    expect(deadline?.getDate()).toBe(28);
  });

  it('ends when the horizon has passed', () => {
    expect(
      campaignCountdown(campaign({ startedOn: '2026-01-01', horizonMonths: 1 }), new Date(2026, 2, 5))
        .ended,
    ).toBe(true);
  });

  it('still reports months left on a 30-day grid', () => {
    expect(campaignMonthsLeft(campaign({ startedOn: '2026-01-01', horizonMonths: 12 }), '2026-01-01')).toBe(
      12,
    );
  });

  it('counts pending campaign atoms against the cap', () => {
    expect(
      countPendingCampaignAtoms(
        [atom(), atom({ id: 'atom-2', ritualState: 'absorbed' }), atom({ id: 'atom-3' })],
        'campaign-1',
      ),
    ).toBe(2);
    expect(MAX_PENDING_CAMPAIGN_ATOMS).toBe(3);
  });

  it('strips every atom of a closed campaign and leaves other desk work', () => {
    const { kept, absorbed } = partitionCampaignAtoms(
      [
        atom(),
        atom({ id: 'atom-done', ritualState: 'absorbed', absorbedOn: '2026-09-16' }),
        atom({ id: 'atom-burned', ritualState: 'burned' }),
        atom({ id: 'atom-other', campaignId: 'campaign-2' }),
      ],
      'campaign-1',
    );

    expect(kept.map((item) => item.id)).toEqual(['atom-other']);
    expect(absorbed.map((item) => item.id)).toEqual(['atom-done']);
  });
});
