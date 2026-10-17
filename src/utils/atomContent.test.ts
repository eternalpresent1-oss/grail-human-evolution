import { createTranslator } from '@/i18n';
import { type AtomizedTask, type SeedAtomId } from '@/types/grail';
import { atomInstruction, atomTitle } from '@/utils/atomContent';

function seed(seedId: SeedAtomId): AtomizedTask {
  return {
    id: 'canon:test',
    content: { source: 'seed', seedId },
    dimensionId: seedId === 'spirit_gratitude' ? 'spirit' : 'intellect',
    kind: 'canon',
    ritualState: 'pending',
    isCompleted: false,
    isNonNegotiable: true,
    proofRequired: false,
    xpReward: 15,
    isOverdue: false,
  };
}

describe('atomContent', () => {
  const ru = createTranslator('ru');
  const en = createTranslator('en');

  it('follows the current language for a seed atom', () => {
    const task = seed('spirit_gratitude');

    expect(atomTitle(task, ru)).toBe('Практика благодарности');
    expect(atomTitle(task, en)).toBe('Practice of gratitude');
    expect(atomInstruction(task, ru)).toContain('благодарен');
  });

  it('leaves a title the user typed untouched', () => {
    const task: AtomizedTask = {
      ...seed('spirit_gratitude'),
      content: { source: 'custom', title: 'Позвонить бабушке', instruction: 'Сегодня.' },
    };

    expect(atomTitle(task, en)).toBe('Позвонить бабушке');
    expect(atomInstruction(task, en)).toBe('Сегодня.');
  });
});
