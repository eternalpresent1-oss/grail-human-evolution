import { createTranslator } from '@/i18n';
import { createInitialProfile } from '@/constants/mockData';
import { buildGrailCounselSnapshot, counselSystemPrompt, lifeVectorPrompt } from '@/utils/grailSnapshot';

const t = createTranslator('ru');

describe('counselSystemPrompt', () => {
  it('forbids writing scores and placing atoms', () => {
    const ru = counselSystemPrompt('ru');
    const en = counselSystemPrompt('en');

    expect(ru).toContain('Не выдумывай и не меняй цифры шкал');
    expect(ru).toContain('Не ставь атомы');
    expect(ru).toContain('тень');
    expect(ru).toContain('октагон');
    expect(ru).toContain('биография');
    expect(en).toContain('Never invent or rewrite scores');
    expect(en).toContain('Do not place atoms');
    expect(en).toContain('shadow');
    expect(en).toContain('octagon is primary');
    expect(en).toContain('biography');
  });
});

describe('lifeVectorPrompt', () => {
  it('reads from the octagon and keeps the talent tree secondary', () => {
    expect(lifeVectorPrompt('ru')).toContain('октагон');
    expect(lifeVectorPrompt('ru')).toContain('не главное');
    expect(lifeVectorPrompt('en')).toContain('octagon');
    expect(lifeVectorPrompt('en')).toContain('not the lead');
  });
});

describe('buildGrailCounselSnapshot', () => {
  it('says when the week has no shadow', () => {
    const text = buildGrailCounselSnapshot({
      t,
      profile: createInitialProfile(),
      tasks: [],
      campaigns: [],
      talents: [],
      achievements: [],
      driveLine: '',
      shadowEvents: [],
      asOf: '2026-09-14',
    });

    expect(text).toContain('Shadow this week: none');
  });

  it('reports the axes the shadow ate this week', () => {
    const text = buildGrailCounselSnapshot({
      t,
      profile: createInitialProfile(),
      tasks: [],
      campaigns: [],
      talents: [],
      achievements: [],
      driveLine: '',
      shadowEvents: [{ id: 's1', catalogId: 'impulse_spend', occurredOn: '2026-09-14' }],
      asOf: '2026-09-14',
    });

    expect(text).toContain('Shadow this week (share of weekly norm):');
    expect(text).toContain('Богатство:');
    expect(text).toContain('Shadow confessions:');
  });

  it('puts the octagon first and keeps the talent tree off the score line', () => {
    const text = buildGrailCounselSnapshot({
      t,
      profile: createInitialProfile(),
      tasks: [],
      campaigns: [],
      talents: [
        {
          id: 't1',
          dimensionId: 'physical',
          title: 'Кикбоксинг',
          createdOn: '2026-01-01',
        },
      ],
      achievements: [],
      driveLine: '',
      shadowEvents: [],
      asOf: '2026-09-14',
    });

    expect(text).toContain('Primary: the octagon');
    expect(text).toContain('Octagon:');
    expect(text).toContain('- Физика: 0.00%');
    expect(text).not.toContain('history: Кикбоксинг');
    expect(text).not.toContain('talents: Кикбоксинг');
    expect(text.indexOf('Octagon:')).toBeLessThan(text.indexOf('Talent tree'));
    expect(text).toContain('Talent tree (biography only; secondary; not current practice):');
    expect(text).toContain('- Физика: Кикбоксинг');
  });
});
