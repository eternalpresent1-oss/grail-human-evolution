import { type Translator } from '@/i18n';
import { type AtomizedTask } from '@/types/grail';
import { atomTitle } from '@/utils/atomContent';
import { methodSignalFireAt } from '@/utils/methodSignals';

export interface AtomNotifyPlan {
  readonly identifier: string;
  readonly fireAt: Date;
  readonly title: string;
  readonly body: string;
}

export function planAtomNotifications(
  tasks: readonly AtomizedTask[],
  t: Translator,
  now: Date = new Date(),
): readonly AtomNotifyPlan[] {
  return tasks.flatMap((task) => {
    if (
      (task.kind !== 'custom' && task.kind !== 'canon') ||
      task.notify !== true ||
      task.ritualState !== 'pending' ||
      task.scheduledOn === undefined ||
      task.timeDeadline === undefined
    ) {
      return [];
    }

    const fireAt = methodSignalFireAt(task.scheduledOn, task.timeDeadline);
    if (fireAt === null || fireAt.getTime() <= now.getTime()) {
      return [];
    }

    return [
      {
        identifier: `grail-atom-${task.id}`,
        fireAt,
        title: atomTitle(task, t),
        body: t('atom.signal.body'),
      },
    ];
  });
}
