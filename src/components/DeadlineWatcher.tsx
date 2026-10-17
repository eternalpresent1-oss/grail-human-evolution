import { useEffect, type ReactElement } from 'react';
import { AppState } from 'react-native';

import { useGrailStore } from '@/store/useGrailStore';

const POLL_MS = 15_000;

/**
 * Drives overdue flags and the midnight decay pass. Waits for rehydration so the
 * first check never runs against seed data and overwrites persisted progress.
 */
export function DeadlineWatcher(): ReactElement | null {
  const checkTaskDeadlines = useGrailStore((state) => state.checkTaskDeadlines);
  const isHydrated = useGrailStore((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    checkTaskDeadlines();

    const interval = setInterval(checkTaskDeadlines, POLL_MS);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkTaskDeadlines();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkTaskDeadlines, isHydrated]);

  return null;
}
