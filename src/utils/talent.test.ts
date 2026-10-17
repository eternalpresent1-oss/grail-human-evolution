import { TALENT_NODE_XP, TALENT_WEEKLY_XP_CAP } from '@/types/talent';
import {
  canGrantTalentXp,
  isTalentLeaf,
  lastTalentOnVector,
  nodeGrantedTalentXp,
  sanitizeTalents,
  talentXpThisWeek,
} from '@/utils/talent';

describe('sanitizeTalents', () => {
  it('drops junk and broken parents', () => {
    expect(
      sanitizeTalents([
        { id: 'a', dimensionId: 'physical', title: 'бокс', createdOn: '2026-09-08' },
        { id: 'b', dimensionId: 'physical', title: 'медаль', createdOn: '2026-09-08', parentId: 'missing' },
        { id: 'c', dimensionId: 'nope', title: 'x', createdOn: '2026-09-08' },
      ]),
    ).toEqual([
      { id: 'a', dimensionId: 'physical', title: 'бокс', createdOn: '2026-09-08' },
    ]);
  });
});

describe('talent weekly cap', () => {
  it('lets two nodes through and blocks the third', () => {
    const monday = '2026-09-07';
    const first = [{ id: '1', dimensionId: 'spirit' as const, title: 'гитара', createdOn: monday }];
    const second = [
      ...first,
      { id: '2', dimensionId: 'spirit' as const, title: 'аккорд', createdOn: '2026-09-08' },
    ];

    expect(talentXpThisWeek(first, 'spirit', '2026-09-10')).toBe(TALENT_NODE_XP);
    expect(canGrantTalentXp(first, 'spirit', '2026-09-10')).toBe(true);
    expect(talentXpThisWeek(second, 'spirit', '2026-09-10')).toBe(TALENT_WEEKLY_XP_CAP);
    expect(canGrantTalentXp(second, 'spirit', '2026-09-10')).toBe(false);
  });
});

describe('talent week grant', () => {
  const monday = '2026-09-07';
  const nodes = [
    { id: '1', dimensionId: 'spirit' as const, title: 'гитара', createdOn: monday },
    { id: '2', dimensionId: 'spirit' as const, title: 'аккорд', createdOn: '2026-09-08' },
    { id: '3', dimensionId: 'spirit' as const, title: 'песня', createdOn: '2026-09-09' },
    { id: 'old', dimensionId: 'spirit' as const, title: 'хор', createdOn: '2026-08-31' },
    { id: 'craft', dimensionId: 'craft_career' as const, title: 'сварка', createdOn: monday },
  ];

  it('marks only the first two nodes of this week, never craft or an older week', () => {
    expect(nodeGrantedTalentXp(nodes, nodes[0], '2026-09-10')).toBe(true);
    expect(nodeGrantedTalentXp(nodes, nodes[1], '2026-09-10')).toBe(true);
    expect(nodeGrantedTalentXp(nodes, nodes[2], '2026-09-10')).toBe(false);
    expect(nodeGrantedTalentXp(nodes, nodes[3], '2026-09-10')).toBe(false);
    expect(nodeGrantedTalentXp(nodes, nodes[4], '2026-09-10')).toBe(false);
  });
});

describe('talent leaves', () => {
  it('marks only the last node on a chain as a leaf', () => {
    const chain = [
      { id: 'a', dimensionId: 'physical' as const, title: 'бокс', createdOn: '2026-09-07' },
      {
        id: 'b',
        dimensionId: 'physical' as const,
        title: 'спарринг',
        createdOn: '2026-09-08',
        parentId: 'a',
      },
    ];

    expect(isTalentLeaf(chain, 'a', 'physical')).toBe(false);
    expect(isTalentLeaf(chain, 'b', 'physical')).toBe(true);
    expect(lastTalentOnVector(chain, 'physical')?.id).toBe('b');
  });
});
