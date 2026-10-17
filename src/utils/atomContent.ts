import {
  seedAtomInstructionKey,
  seedAtomTitleKey,
  type Translator,
} from '@/i18n';
import { type AtomizedTask } from '@/types/grail';

/**
 * Title as it should read right now. A seed atom follows the current language;
 * a title the user typed is returned untouched, whatever language it is in.
 */
export function atomTitle(task: AtomizedTask, t: Translator): string {
  return task.content.source === 'seed'
    ? t(seedAtomTitleKey(task.content.seedId))
    : task.content.title;
}

/**
 * Briefing shown in the ritual sheet. Composed here rather than at creation
 * time: an atom created without its own briefing keeps no text on disk, so the
 * default follows the language the user is reading in today.
 */
export function atomInstruction(task: AtomizedTask, t: Translator): string {
  if (task.content.source === 'seed') {
    return t(seedAtomInstructionKey(task.content.seedId));
  }

  return (
    task.content.instruction ??
    t('atom.instruction.default', { title: task.content.title })
  );
}
