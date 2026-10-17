import { CANON_SLOT_XP, WEEKLY_NORM_XP } from '@/types/grail';
import { createEmptyXpJournal } from '@/utils/lifeScore';
import {
  computeNetDayShare,
  computeShadowShare,
  latestWindowShadow,
  tallyShadowCatalog,
} from '@/utils/weekLedger';

describe('latestWindowShadow', () => {
  it('returns the last confession of that kind in the seven-day window', () => {
    const events = [
      { id: 's1', catalogId: 'impulse_spend' as const, occurredOn: '2026-09-08' },
      { id: 's2', catalogId: 'impulse_spend' as const, occurredOn: '2026-09-10' },
      { id: 's3', catalogId: 'broke_word' as const, occurredOn: '2026-09-14' },
    ];

    expect(latestWindowShadow(events, 'impulse_spend', '2026-09-14')?.id).toBe('s2');
    expect(latestWindowShadow(events, 'broke_word', '2026-09-14')?.id).toBe('s3');
    expect(latestWindowShadow(events, 'spite_or_lie', '2026-09-14')).toBeUndefined();
  });
});

describe('tallyShadowCatalog', () => {
  it('keeps the days each confession stood on', () => {
    expect(
      tallyShadowCatalog(
        [
          { id: 's1', catalogId: 'impulse_spend', occurredOn: '2026-09-08' },
          { id: 's2', catalogId: 'impulse_spend', occurredOn: '2026-09-10' },
          { id: 's3', catalogId: 'broke_word', occurredOn: '2026-09-14' },
        ],
        '2026-09-14',
      ),
    ).toEqual([
      {
        catalogId: 'impulse_spend',
        count: 2,
        occurredOn: ['2026-09-08', '2026-09-10'],
      },
      {
        catalogId: 'broke_word',
        count: 1,
        occurredOn: ['2026-09-14'],
      },
    ]);
  });
});

describe('computeNetDayShare', () => {
  it('is absorbed minus shadow in the same weekly pocket', () => {
    const journal = createEmptyXpJournal();
    journal.physical = { '2026-09-08': 30, '2026-09-07': 15 };

    const share = computeNetDayShare(
      journal.physical,
      [
        {
          id: 's1',
          catalogId: 'substance_or_sleep',
          occurredOn: '2026-09-08',
        },
      ],
      'physical',
      '2026-09-08',
    );

    expect(share).toBe(((45 - CANON_SLOT_XP) / WEEKLY_NORM_XP) * 100);
  });

  it('does not drop the week below zero', () => {
    expect(
      computeNetDayShare(
        {},
        [{ id: 's1', catalogId: 'substance_or_sleep', occurredOn: '2026-09-08' }],
        'physical',
        '2026-09-08',
      ),
    ).toBe(0);
  });

  it('ignores a shadow on another vector', () => {
    const days = { '2026-09-08': 45 };
    expect(
      computeNetDayShare(
        days,
        [{ id: 's1', catalogId: 'impulse_spend', occurredOn: '2026-09-08' }],
        'physical',
        '2026-09-08',
      ),
    ).toBe(100);
  });
});

describe('computeShadowShare', () => {
  it('is the eaten share of the weekly norm', () => {
    expect(
      computeShadowShare(
        [{ id: 's1', catalogId: 'substance_or_sleep', occurredOn: '2026-09-08' }],
        'physical',
        '2026-09-08',
      ),
    ).toBe((CANON_SLOT_XP / WEEKLY_NORM_XP) * 100);
  });
});

