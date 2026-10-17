import { useMemo } from 'react';

import { useTranslator } from '@/i18n/TranslatorProvider';
import { useGrailStore } from '@/store/useGrailStore';
import { analyzeGrailField, type CharacterAnalysis } from '@/utils/characterAnalytics';
import { localDateKey } from '@/utils/taskTime';

/**
 * Store-bound view of {@link analyzeGrailField}. Kept apart from the analysis
 * itself so the pure logic stays importable without pulling in native modules.
 */
export function useCharacterAnalytics(): CharacterAnalysis {
  const t = useTranslator();
  const viewMode = useGrailStore((state) => state.viewMode);
  const dimensions = useGrailStore((state) => state.profile.dimensions);
  const tasks = useGrailStore((state) => state.tasks);
  const shadowEvents = useGrailStore((state) => state.shadowEvents);
  const promiseJournal = useGrailStore((state) => state.profile.promiseJournal);

  return useMemo(
    () =>
      analyzeGrailField({
        t,
        viewMode,
        dimensions,
        tasks,
        shadowEvents,
        promiseJournal,
        asOf: localDateKey(),
      }),
    [dimensions, promiseJournal, shadowEvents, t, tasks, viewMode],
  );
}
