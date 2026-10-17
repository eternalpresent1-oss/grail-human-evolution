import { type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassPanel } from '@/components/GlassPanel';
import { TaskAtomCard } from '@/components/TaskAtomCard';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, radius, space, typography } from '@/theme';
import { type AtomizedTask } from '@/types/grail';
import {
  DAY_VERDICT_MAX,
  dayVerdictLineKey,
  type DayVerdict,
} from '@/utils/dayVerdict';
import { formatScore } from '@/utils/formatScore';

interface DayVerdictCardProps {
  verdict: DayVerdict;
  history: readonly AtomizedTask[];
  dayDiscipline: number;
}

export function DayVerdictCard({
  verdict,
  history,
  dayDiscipline,
}: DayVerdictCardProps): ReactElement {
  const t = useTranslator();
  const scoreColor =
    verdict.kind === 'scored' && verdict.score === 5
      ? colors.accent.gold
      : verdict.kind === 'scored' && verdict.score <= 2
        ? colors.state.dangerText
        : colors.text.ivory;

  return (
    <View>
      <GlassPanel style={styles.panel} intensity={34}>
        <Text style={styles.kicker}>{t('verdict.kicker')}</Text>
        {verdict.kind === 'empty' ? (
          <Text style={styles.line}>
            {t(verdict.sunday ? 'verdict.empty.sunday' : 'verdict.empty')}
          </Text>
        ) : (
          <>
            <Text style={[styles.score, { color: scoreColor }]}>
              {t('verdict.score', { score: verdict.score, max: DAY_VERDICT_MAX })}
            </Text>
            <Text style={styles.discipline}>
              {t('verdict.discipline', { value: formatScore(dayDiscipline) })}
            </Text>
            <Text style={styles.line}>{t(dayVerdictLineKey(verdict.score))}</Text>
            {verdict.shadowCount > 0 ? (
              <Text style={styles.shadow}>{t('verdict.shadow')}</Text>
            ) : null}
          </>
        )}
      </GlassPanel>
      {history.length > 0 ? (
        <View style={styles.list}>
          {history.map((task) => (
            <TaskAtomCard key={task.id} task={task} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: space.sm,
    borderRadius: radius.xl,
    padding: space.lg,
  },
  kicker: {
    ...typography.micro,
    color: colors.accent.goldMuted,
  },
  score: {
    ...typography.modalTitle,
    marginTop: space.sm,
  },
  discipline: {
    ...typography.captionStrong,
    marginTop: space.sm,
    color: colors.accent.goldMuted,
  },
  line: {
    ...typography.bodyLead,
    marginTop: space.sm,
    color: colors.text.muted,
  },
  shadow: {
    ...typography.caption,
    marginTop: space.sm,
    color: colors.text.faint,
  },
  list: {
    marginTop: space.lg,
    gap: space.sm + 2,
  },
});
