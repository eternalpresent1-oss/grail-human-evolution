import { useEffect, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GlassPanel } from '@/components/GlassPanel';
import { dimensionNameKey, type TranslationKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, elevation, motion, radius, space, typography, withAlpha } from '@/theme';
import { type AtomizedTask } from '@/types/grail';
import { atomTitle } from '@/utils/atomContent';

interface TaskAtomCardProps {
  task: AtomizedTask;
  onPress?: (task: AtomizedTask) => void;
}

/** Fills are per-state, so they live next to the card rather than in the theme. */
const SURFACE = {
  alarm: [withAlpha(colors.state.danger, 0.2), withAlpha(colors.state.dangerDim, 0.05)],
  absorbed: [colors.tint.cyanStrong, colors.tint.gold],
  burned: [colors.tint.burned, withAlpha(colors.void, 0.2)],
  pending: [colors.surface.sheen, colors.surface.sheenFaint],
} as const;

const STATUS_KEY: Record<AtomizedTask['ritualState'], TranslationKey> = {
  pending: 'atom.status.pending',
  absorbed: 'atom.status.absorbed',
  burned: 'atom.status.burned',
};

export function TaskAtomCard({ task, onPress }: TaskAtomCardProps): ReactElement {
  const t = useTranslator();
  const alarm = useSharedValue(0);
  const isAlarm = task.ritualState === 'pending' && task.isOverdue;
  const isAbsorbed = task.ritualState === 'absorbed';
  const isBurned = task.ritualState === 'burned';
  const isSettled = isAbsorbed || isBurned;

  const settle = useSharedValue(isSettled ? 1 : 0);

  useEffect(() => {
    if (!isAlarm) {
      cancelAnimation(alarm);
      alarm.value = withTiming(0, { duration: motion.instant });
      return;
    }

    alarm.value = 0;
    alarm.value = withRepeat(
      withTiming(1, {
        duration: 700,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(alarm);
    };
  }, [alarm, isAlarm]);

  // Absorbing or burning an atom is the emotional beat of the app; the card
  // eases into its resting state instead of snapping.
  useEffect(() => {
    settle.value = withTiming(isSettled ? 1 : 0, {
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
    });
  }, [isSettled, settle]);

  const restingBorder = isAbsorbed
    ? colors.border.cyan
    : isBurned
      ? colors.border.burned
      : colors.border.hairline;
  const restingGlow = isAbsorbed ? colors.accent.cyan : colors.void;

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: isAlarm
      ? interpolateColor(alarm.value, [0, 1], [colors.state.dangerDim, colors.state.danger])
      : interpolateColor(settle.value, [0, 1], [colors.border.hairline, restingBorder]),
    shadowColor: isAlarm ? colors.state.danger : restingGlow,
    shadowOpacity: isAlarm ? 0.3 + alarm.value * 0.4 : isAbsorbed ? 0.3 * settle.value : 0.25,
    // Closed atoms recede so the live ritual keeps the eye — but stay legible
    // in the history drawer, where every row is settled.
    opacity: 1 - settle.value * 0.1,
  }));

  const title = atomTitle(task, t);
  const dimensionLabel = t(dimensionNameKey(task.dimensionId));
  const deadline = task.timeDeadline;
  const statusLabel = t(STATUS_KEY[task.ritualState]);
  const deadlineLabel = deadline === undefined ? '' : `. ${t('atom.deadline', { time: deadline })}`;
  const overdueLabel = isAlarm ? `. ${t('atom.overdue')}` : '';
  const surface = isAlarm
    ? SURFACE.alarm
    : isAbsorbed
      ? SURFACE.absorbed
      : isBurned
        ? SURFACE.burned
        : SURFACE.pending;

  const card = (
    <Animated.View style={[styles.card, cardStyle]}>
      <GlassPanel style={styles.glass} intensity={38}>
        <LinearGradient
          colors={surface}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={styles.inner}
        >
          <View style={styles.body}>
            <Text style={styles.kicker}>
              {task.kind === 'canon'
                ? t('atom.canon')
                : task.kind === 'campaign'
                  ? t('atom.campaign')
                  : statusLabel}
            </Text>
            <Text style={[styles.title, isSettled ? styles.titleSettled : null]}>{title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.dimension}>{dimensionLabel}</Text>
              {deadline !== undefined ? (
                <View style={[styles.deadlineBadge, isAlarm ? styles.deadlineBadgeAlarm : null]}>
                  <Text style={[styles.deadlineText, isAlarm ? styles.deadlineTextAlarm : null]}>
                    {deadline}
                  </Text>
                </View>
              ) : null}
              {task.notify === true && task.kind === 'custom' ? (
                <Text style={styles.proof}>{t('atom.notify.on')}</Text>
              ) : null}
              {task.proofRequired ? (
                <Text style={styles.proof}>{t('atom.proof')}</Text>
              ) : null}
            </View>
          </View>

          {onPress !== undefined ? (
            <View style={styles.trail}>
              <Text style={styles.chevron}>{isSettled ? '↺' : '⟩'}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </GlassPanel>
    </Animated.View>
  );

  if (onPress === undefined) {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${title}. ${dimensionLabel}. ${statusLabel}${deadlineLabel}${overdueLabel}`}
      >
        {card}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(task)}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${dimensionLabel}. ${statusLabel}${deadlineLabel}${overdueLabel}`}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {card}
    </Pressable>
  );
}

const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 1, y: 1 } as const;

const styles = StyleSheet.create({
  pressed: {
    transform: [{ scale: motion.pressScale }],
    opacity: motion.pressOpacity,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...elevation.row,
    // Rows repeat, so the halo stays centred and tight rather than wide.
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  glass: {
    borderRadius: radius.lg - 2,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg - 1,
    paddingHorizontal: space.lg,
  },
  body: {
    flex: 1,
  },
  kicker: {
    ...typography.micro,
    color: colors.accent.cyanMuted,
  },
  title: {
    ...typography.itemTitle,
    marginTop: space.xs,
    color: colors.text.primary,
  },
  titleSettled: {
    color: colors.text.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.snug,
  },
  dimension: {
    ...typography.caption,
    color: colors.text.muted,
  },
  deadlineBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.hair,
    backgroundColor: colors.tint.cyan,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  deadlineBadgeAlarm: {
    backgroundColor: colors.tint.dangerStrong,
    borderColor: colors.state.danger,
  },
  deadlineText: {
    ...typography.captionStrong,
    color: colors.accent.gold,
    fontVariant: ['tabular-nums'],
  },
  deadlineTextAlarm: {
    color: colors.state.danger,
  },
  proof: {
    ...typography.micro,
    color: colors.accent.gold,
  },
  trail: {
    alignItems: 'flex-end',
    gap: space.snug,
  },
  chevron: {
    ...typography.cardTitle,
    color: colors.text.faint,
  },
});
