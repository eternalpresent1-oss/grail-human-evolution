import { sanitizeAchievements } from '@/utils/achievements';

describe('sanitizeAchievements', () => {
  it('keeps a titled feat and drops junk', () => {
    expect(
      sanitizeAchievements([
        {
          id: 'feat-1',
          title: 'Пробежал 20км',
          detail: 'время: 01:36:47',
          achievedOn: '2026-09-08',
        },
        { id: 'feat-2', title: '   ', achievedOn: '2026-09-08' },
        { id: 'feat-3', title: 'Война и мир', achievedOn: 'not-a-date' },
        {
          id: 'feat-1',
          title: 'duplicate id',
          detail: '',
          achievedOn: '2026-09-09',
        },
      ]),
    ).toEqual([
      {
        id: 'feat-1',
        title: 'Пробежал 20км',
        detail: 'время: 01:36:47',
        achievedOn: '2026-09-08',
      },
    ]);
  });
});
