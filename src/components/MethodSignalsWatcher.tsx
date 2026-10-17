import { useEffect, type ReactElement } from 'react';
import { useRouter } from 'expo-router';

import { useTranslator } from '@/i18n/TranslatorProvider';
import { useGrailStore } from '@/store/useGrailStore';
import { canScheduleMethodSignals } from '@/utils/runtimeEnv';
import {
  subscribeMethodNotificationResponse,
  syncMethodNotificationSchedule,
} from '@/utils/syncMethodNotifications';

/**
 * Keeps method clocks in sync with settings and language.
 * Does nothing in Expo Go or on web — `expo-notifications` must not load there.
 */
export function MethodSignalsWatcher(): ReactElement | null {
  const t = useTranslator();
  const router = useRouter();
  const isHydrated = useGrailStore((state) => state.isHydrated);
  const methodSignals = useGrailStore((state) => state.methodSignals);
  const atomNotifyKey = useGrailStore((state) =>
    state.tasks
      .filter((task) => task.kind === 'custom' || task.kind === 'canon')
      .map(
        (task) =>
          `${task.id}:${task.ritualState}:${task.notify === true ? '1' : '0'}:${task.scheduledOn ?? ''}:${task.timeDeadline ?? ''}`,
      )
      .join('|'),
  );

  useEffect(() => {
    if (!isHydrated || !canScheduleMethodSignals()) {
      return;
    }

    void syncMethodNotificationSchedule(t).catch(() => {
      // A simulator without a notification backend must not take the app down.
    });
  }, [isHydrated, methodSignals, atomNotifyKey, t]);

  useEffect(() => {
    if (!canScheduleMethodSignals()) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void subscribeMethodNotificationResponse(() => {
      router.push('/atomizer');
    })
      .then((remove) => {
        if (cancelled) {
          remove();
          return;
        }

        unsubscribe = remove;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return null;
}
