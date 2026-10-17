import { type PromiseJournal, type ShadowEvent } from '@/types/grail';
import { weekReview } from '@/utils/weekReview';

describe('weekReview', () => {
  it('sums Monday–Saturday of the ISO week and counts shadow in that week', () => {
    const journal: PromiseJournal = {
      '2026-09-07': { promised: 4, kept: 3 },
      '2026-09-08': { promised: 4, kept: 4 },
      '2026-09-13': { promised: 1, kept: 0 },
    };
    const events: readonly ShadowEvent[] = [
      { id: 's1', catalogId: 'broke_word', occurredOn: '2026-09-08' },
      { id: 's2', catalogId: 'impulse_spend', occurredOn: '2026-09-01' },
    ];

    const review = weekReview(journal, events, '2026-09-13');

    expect(review.weekStart).toBe('2026-09-07');
    expect(review.promised).toBe(8);
    expect(review.kept).toBe(7);
    expect(review.shadowCount).toBe(1);
  });
});
