import { createTranslator } from '@/i18n';
import { HUMAN_DIMENSION_IDS, type AtomizedTask, type HumanDimension, type HumanDimensionId } from '@/types/grail';
import { analyzeGrailField, lifeScoreBand } from '@/utils/characterAnalytics';

const t = createTranslator('ru');

function dimensions(
  scores: Partial<Record<HumanDimensionId, number>> = {},
): Record<HumanDimensionId, HumanDimension> {
  return HUMAN_DIMENSION_IDS.reduce(
    (acc, id) => {
      const score = scores[id] ?? 50;
      acc[id] = {
        id,
        score,
        isGated: false,
      };
      return acc;
    },
    {} as Record<HumanDimensionId, HumanDimension>,
  );
}

function atom(overrides: Partial<AtomizedTask> = {}): AtomizedTask {
  return {
    id: 'atom-1',
    content: { source: 'custom', title: 'Атом' },
    dimensionId: 'physical',
    kind: 'custom',
    ritualState: 'pending',
    isCompleted: false,
    isNonNegotiable: true,
    proofRequired: false,
    xpReward: 15,
    isOverdue: false,
    ...overrides,
  };
}

describe('lifeScoreBand', () => {
  it('splits the five life colours on 20 / 40 / 60 / 80', () => {
    expect(lifeScoreBand(0)).toBe('veryLow');
    expect(lifeScoreBand(19.99)).toBe('veryLow');
    expect(lifeScoreBand(20)).toBe('low');
    expect(lifeScoreBand(39.99)).toBe('low');
    expect(lifeScoreBand(40)).toBe('mid');
    expect(lifeScoreBand(59.99)).toBe('mid');
    expect(lifeScoreBand(60)).toBe('high');
    expect(lifeScoreBand(79.99)).toBe('high');
    expect(lifeScoreBand(80)).toBe('veryHigh');
    expect(lifeScoreBand(100)).toBe('veryHigh');
  });
});

describe('analyzeGrailField · daily', () => {
  it('scores vectors by today execution, not by lifetime value', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'daily',
      dimensions: dimensions({ physical: 90, wealth: 10 }),
      tasks: [
        atom({ id: 'a', dimensionId: 'physical' }),
        atom({
          id: 'b',
          dimensionId: 'wealth',
          ritualState: 'absorbed',
          isCompleted: true,
          absorbedOn: '2026-09-14',
        }),
      ],
      asOf: '2026-09-14',
    });

    const physical = analysis.vectors.find((vector) => vector.dimension.id === 'physical');
    const wealth = analysis.vectors.find((vector) => vector.dimension.id === 'wealth');

    expect(physical?.dimension.score).toBe(0);
    expect(wealth?.dimension.score).toBe(100);
    expect(analysis.scheduledToday).toBe(2);
    expect(analysis.completedToday).toBe(1);
  });

  it('names the unmet vector as the bottleneck of the day', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'daily',
      dimensions: dimensions(),
      tasks: [
        atom({
          id: 'a',
          dimensionId: 'drive',
          ritualState: 'absorbed',
          isCompleted: true,
          absorbedOn: '2026-09-14',
        }),
        atom({ id: 'b', dimensionId: 'spirit' }),
      ],
      asOf: '2026-09-14',
    });

    expect(analysis.bottlenecks[0]?.dimension.id).toBe('spirit');
    expect(analysis.strengths[0]?.dimension.id).toBe('drive');
    expect(analysis.openDayIds).toEqual(['spirit']);
    expect(analysis.dailyCards).toEqual([
      { kind: 'done', vectorIds: ['drive'] },
      { kind: 'missed', vectorIds: ['spirit'] },
    ]);
    expect(analysis.developmentPlan).toHaveLength(3);
  });

  it('groups two unfinished vectors onto one partial card', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'daily',
      dimensions: dimensions(),
      tasks: [
        atom({
          id: 'a',
          dimensionId: 'physical',
          ritualState: 'absorbed',
          isCompleted: true,
          absorbedOn: '2026-09-14',
        }),
        atom({ id: 'b', dimensionId: 'physical' }),
        atom({
          id: 'c',
          dimensionId: 'intellect',
          ritualState: 'absorbed',
          isCompleted: true,
          absorbedOn: '2026-09-14',
        }),
        atom({ id: 'd', dimensionId: 'intellect' }),
      ],
      asOf: '2026-09-14',
    });

    expect(analysis.dailyCards).toEqual([{ kind: 'partial', vectorIds: ['physical', 'intellect'] }]);
  });

  it('counts a burned atom as not done, not as an open day', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'daily',
      dimensions: dimensions(),
      tasks: [
        atom({
          id: 'a',
          dimensionId: 'spirit',
          ritualState: 'burned',
          scheduledOn: '2026-09-14',
        }),
      ],
      asOf: '2026-09-14',
    });

    expect(analysis.dailyCards).toEqual([{ kind: 'missed', vectorIds: ['spirit'] }]);
    expect(analysis.bottlenecks[0]?.dimension.id).toBe('spirit');
    expect(analysis.openDayIds).toEqual([]);
  });

  it('keeps a burned vector in not-done beside a closed one, never as the open day', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'daily',
      dimensions: dimensions(),
      tasks: [
        atom({
          id: 'a',
          dimensionId: 'drive',
          ritualState: 'absorbed',
          isCompleted: true,
          absorbedOn: '2026-09-14',
        }),
        atom({
          id: 'b',
          dimensionId: 'wealth',
          ritualState: 'burned',
          scheduledOn: '2026-09-14',
        }),
      ],
      asOf: '2026-09-14',
    });

    expect(analysis.dailyCards).toEqual([
      { kind: 'done', vectorIds: ['drive'] },
      { kind: 'missed', vectorIds: ['wealth'] },
    ]);
    expect(analysis.bottlenecks[0]?.dimension.id).toBe('wealth');
    expect(analysis.openDayIds).toEqual([]);
    expect(analysis.scheduledToday).toBe(2);
    expect(analysis.completedToday).toBe(1);
  });

  it('puts every pending atom and canon on the open day, ignoring the clock', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'daily',
      dimensions: dimensions(),
      tasks: [
        atom({
          id: 'a',
          dimensionId: 'wealth',
          ritualState: 'burned',
          scheduledOn: '2026-09-14',
        }),
        atom({
          id: 'b',
          dimensionId: 'drive',
          scheduledOn: '2026-09-14',
          timeDeadline: '08:00',
          isOverdue: true,
        }),
        atom({
          id: 'c',
          dimensionId: 'spirit',
          kind: 'canon',
          scheduledOn: '2026-09-14',
        }),
        atom({
          id: 'd',
          dimensionId: 'physical',
          scheduledOn: '2026-09-14',
        }),
      ],
      asOf: '2026-09-14',
    });

    expect(analysis.openDayIds).toEqual(['physical', 'drive', 'spirit']);
    expect(analysis.dailyCards).toEqual([
      { kind: 'missed', vectorIds: ['physical', 'drive', 'wealth', 'spirit'] },
    ]);
    expect(analysis.bottlenecks.map((vector) => vector.dimension.id)).toEqual([
      'physical',
      'drive',
      'wealth',
      'spirit',
    ]);
  });

  it('leads Sunday with a week card and still lists today’s atoms underneath', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'daily',
      dimensions: dimensions(),
      tasks: [atom({ id: 'a', dimensionId: 'drive', scheduledOn: '2026-09-13' })],
      promiseJournal: {
        '2026-09-07': { promised: 5, kept: 4 },
        '2026-09-08': { promised: 5, kept: 5 },
      },
      shadowEvents: [{ id: 's1', catalogId: 'broke_word', occurredOn: '2026-09-08' }],
      asOf: '2026-09-13',
    });

    expect(analysis.weekCard).toEqual({
      emptyWeek: false,
      keepShare: 90,
      hasShadow: true,
    });
    expect(analysis.dailyCards).toEqual([{ kind: 'missed', vectorIds: ['drive'] }]);
  });

  it('reports full harmony when nothing is scheduled', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'daily',
      dimensions: dimensions(),
      tasks: [],
    });

    expect(analysis.scheduledToday).toBe(0);
    expect(analysis.harmonyIndex).toBe(100);
    expect(Number.isNaN(analysis.averageScore)).toBe(false);
    expect(analysis.dailyCards).toEqual([]);
    expect(analysis.weekCard).toBeNull();
  });

  it('reads life harmony, not today’s even desk', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'daily',
      dimensions: dimensions({ physical: 90, wealth: 10 }),
      tasks: [],
    });

    expect(analysis.harmonyIndex).toBe(80);
  });
});

describe('analyzeGrailField · life', () => {
  it('reads the stored life score, not a ceiling cut by misses', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'life',
      dimensions: dimensions({ social: 80 }),
      tasks: [],
    });

    const social = analysis.vectors.find((vector) => vector.dimension.id === 'social');

    expect(social?.dimension.score).toBe(80);
    expect(analysis.averageScore).toBeGreaterThan(0);
  });

  it('flags the widest gaps as strengths and bottlenecks', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'life',
      dimensions: dimensions({ intellect: 95, wealth: 12 }),
      tasks: [],
    });

    expect(analysis.strengths[0]?.dimension.id).toBe('intellect');
    expect(analysis.strengths[0]?.band).toBe('dominant');
    expect(analysis.bottlenecks[0]?.dimension.id).toBe('wealth');
    expect(analysis.bottlenecks[0]?.band).toBe('underperforming');
    expect(analysis.strengths.every((vector) => vector.dimension.score >= 40)).toBe(true);
    expect(analysis.bottlenecks.every((vector) => vector.dimension.score < 40)).toBe(true);
  });

  it('keeps a mid vector in the top cards and leaves a full mid field without debts', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'life',
      dimensions: dimensions(),
      tasks: [],
    });

    expect(analysis.strengths).toHaveLength(2);
    expect(analysis.bottlenecks).toHaveLength(0);
    expect(analysis.strengths[0]?.dimension.id).toBe('physical');
    expect(analysis.strengths[1]?.dimension.id).toBe('intellect');
  });

  it('leaves the top empty when nothing reaches 40%', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'life',
      dimensions: dimensions({
        physical: 18,
        intellect: 22,
        mind_psyche: 30,
        drive: 25,
        craft_career: 10,
        wealth: 8,
        social: 33,
        spirit: 12,
      }),
      tasks: [],
    });

    expect(analysis.strengths).toHaveLength(0);
    expect(analysis.bottlenecks).toHaveLength(2);
    expect(analysis.bottlenecks.map((vector) => vector.dimension.id)).toEqual(['wealth', 'craft_career']);
  });

  it('talks about the weekly norm rather than a lost ceiling', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'life',
      dimensions: dimensions({ wealth: 12, intellect: 95 }),
      tasks: [],
    });

    expect(analysis.developmentPlan[2]).toContain('Три конкретных дела');
    expect(analysis.developmentPlan[2]).not.toContain('потол');
  });

  it('mentions a shadow in the life vector without naming the axis', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'life',
      dimensions: dimensions({ intellect: 95, wealth: 12 }),
      tasks: [],
      shadowEvents: [{ id: 's1', catalogId: 'spite_or_lie', occurredOn: '2026-09-14' }],
      asOf: '2026-09-14',
    });

    expect(analysis.shadowThreats.map((item) => item.dimensionId)).toEqual(['social', 'spirit']);
    expect(analysis.developmentPlan[2]).toContain('Три конкретных дела');
    expect(analysis.developmentPlan[2]).toContain('Есть тень, на которую стоит обратить внимание');
    expect(analysis.developmentPlan[2]).not.toContain('Социальность');
  });

  it('says so when the shadow already sits on the weak spot', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'life',
      dimensions: dimensions({ intellect: 95, wealth: 12 }),
      tasks: [],
      shadowEvents: [{ id: 's1', catalogId: 'impulse_spend', occurredOn: '2026-09-14' }],
      asOf: '2026-09-14',
    });

    expect(analysis.shadowThreats[0]?.dimensionId).toBe('wealth');
    expect(analysis.developmentPlan[2]).toContain('Три конкретных дела');
    expect(analysis.developmentPlan[2]).toContain('Есть тень, на которую стоит обратить внимание');
    expect(analysis.shadowReading.title).toContain('Импульсная');
    expect(analysis.shadowReading.body).toContain('утром');
  });

  it('writes one quiet card when the week has no shadow', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'life',
      dimensions: dimensions(),
      tasks: [],
      shadowEvents: [],
      asOf: '2026-09-14',
    });

    expect(analysis.shadowReading.title).toBe('Тень недели');
    expect(analysis.shadowReading.body).toContain('спокойно');
    expect(analysis.shadowReading.share).toBe(0);
  });
});

describe('analyzeGrailField · shadow', () => {
  it('ranks vectors by shadow share, not by lifetime value', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'shadow',
      dimensions: dimensions({ physical: 90, wealth: 10 }),
      tasks: [],
      shadowEvents: [{ id: 's1', catalogId: 'impulse_spend', occurredOn: '2026-09-14' }],
      asOf: '2026-09-14',
    });

    expect(analysis.viewMode).toBe('shadow');
    expect(analysis.strengths[0]?.dimension.id).toBe('wealth');
    expect(analysis.strengths[0]?.dimension.score).toBeGreaterThan(0);
    expect(analysis.strengths[0]?.dimension.score).not.toBe(10);
  });

  it('leaves the field empty when the week has no shadow', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'shadow',
      dimensions: dimensions(),
      tasks: [],
      shadowEvents: [],
      asOf: '2026-09-14',
    });

    expect(analysis.strengths).toEqual([]);
    expect(analysis.bottlenecks).toEqual([]);
    expect(analysis.harmonyIndex).toBe(100);
  });

  it('reads the most serious confession, not the first one logged', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'shadow',
      dimensions: dimensions(),
      tasks: [],
      shadowEvents: [
        { id: 's1', catalogId: 'feed_instead_of_contact', occurredOn: '2026-09-12' },
        { id: 's2', catalogId: 'substance_or_sleep', occurredOn: '2026-09-13' },
        { id: 's3', catalogId: 'broke_word', occurredOn: '2026-09-14' },
        { id: 's4', catalogId: 'spite_or_lie', occurredOn: '2026-09-14' },
        { id: 's5', catalogId: 'impulse_spend', occurredOn: '2026-09-11' },
      ],
      asOf: '2026-09-14',
    });

    expect(analysis.shadowReading.title).toBe('Тень недели');
    expect(analysis.shadowReading.body).toContain('привычки');
    expect(analysis.shadowReading.body).toContain('злость');
    expect(analysis.shadowReading.body).toContain('обещания');
    expect(analysis.shadowReading.body).toContain('финансовых');
    expect(analysis.shadowReading.body).toContain('телефон');
    expect(analysis.shadowReading.body.split('\n\n')).toHaveLength(5);
    expect(analysis.shadowReading.body).not.toContain('Ещё висит');
    expect(analysis.shadowReading.share).toBe(analysis.averageScore);
    expect(analysis.shadowReading.share).toBeLessThan(100);
  });

  it('helps with every hanging shadow, starting from the most frequent', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'shadow',
      dimensions: dimensions(),
      tasks: [],
      shadowEvents: [
        { id: 's1', catalogId: 'feed_instead_of_contact', occurredOn: '2026-09-12' },
        { id: 's2', catalogId: 'feed_instead_of_contact', occurredOn: '2026-09-13' },
        { id: 's3', catalogId: 'substance_or_sleep', occurredOn: '2026-09-14' },
      ],
      asOf: '2026-09-14',
    });

    expect(analysis.shadowReading.title).toBe('Тень недели');
    expect(analysis.shadowReading.body.indexOf('телефон')).toBeLessThan(
      analysis.shadowReading.body.indexOf('привычки'),
    );
    expect(analysis.shadowReading.body).toContain('\n\n');
    expect(analysis.shadowReading.share).toBe(analysis.averageScore);
  });

  it('puts the field average on the card, not the worst axis', () => {
    const analysis = analyzeGrailField({
      t,
      viewMode: 'shadow',
      dimensions: dimensions(),
      tasks: [],
      shadowEvents: [{ id: 's1', catalogId: 'impulse_spend', occurredOn: '2026-09-14' }],
      asOf: '2026-09-14',
    });

    expect(analysis.shadowReading.title).toContain('Импульсная');
    expect(analysis.shadowReading.share).toBe(analysis.averageScore);
    expect(analysis.vectors.find((vector) => vector.dimension.id === 'wealth')?.dimension.score)
      .toBeGreaterThan(analysis.shadowReading.share);
  });
});
