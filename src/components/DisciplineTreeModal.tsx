import { useEffect, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import {
  disciplineStepBodyKey,
  disciplineStepNeedKey,
  disciplineStepTitleKey,
} from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, layout, motion, space, typography, withAlpha } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import {
  DISCIPLINE_EDGES,
  DISCIPLINE_LAYOUT,
  DISCIPLINE_STEP_IDS,
  type DisciplineStepId,
} from '@/types/discipline';
import { disciplineNodeState, isDisciplineTreeComplete } from '@/utils/disciplineTree';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TREE_W = 300;
const TREE_H = 420;
const NODE_R = 15;

function nodePoint(id: DisciplineStepId): { x: number; y: number } {
  const point = DISCIPLINE_LAYOUT[id];
  return { x: point.x * TREE_W, y: point.y * TREE_H };
}

function PulseHalo({ x, y }: { x: number; y: number }): ReactElement {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: pulse.value,
    r: NODE_R + 6 + pulse.value * 3,
  }));

  return (
    <AnimatedCircle
      cx={x}
      cy={y}
      fill="none"
      stroke={colors.accent.gold}
      strokeWidth={2}
      animatedProps={animatedProps}
    />
  );
}

function VictoryGlow(): ReactElement {
  const pulse = useSharedValue(0.28);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const inner = useAnimatedProps(() => ({
    opacity: 0.2 + pulse.value * 0.35,
    r: 36 + pulse.value * 10,
  }));
  const mid = useAnimatedProps(() => ({
    opacity: 0.12 + pulse.value * 0.22,
    r: 72 + pulse.value * 18,
  }));
  const outer = useAnimatedProps(() => ({
    opacity: 0.06 + pulse.value * 0.14,
    r: 118 + pulse.value * 28,
  }));

  const cx = TREE_W * 0.5;
  const cy = TREE_H * 0.42;

  return (
    <>
      <AnimatedCircle cx={cx} cy={cy} fill={colors.accent.gold} stroke="none" animatedProps={outer} />
      <AnimatedCircle cx={cx} cy={cy} fill={colors.accent.gold} stroke="none" animatedProps={mid} />
      <AnimatedCircle
        cx={cx}
        cy={cy}
        fill="none"
        stroke={colors.accent.gold}
        strokeWidth={2}
        animatedProps={inner}
      />
    </>
  );
}

export function DisciplineTreeModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): ReactElement {
  const t = useTranslator();
  const completed = useGrailStore((state) => state.disciplineCompleted);
  const completeDisciplineStep = useGrailStore((state) => state.completeDisciplineStep);
  const uncompleteDisciplineStep = useGrailStore((state) => state.uncompleteDisciplineStep);
  const [selected, setSelected] = useState<DisciplineStepId>(1);

  const selectedState = disciplineNodeState(selected, completed);
  const laterSteps = completed.some((step) => step > selected);
  const treeComplete = isDisciplineTreeComplete(completed);

  const markDone = (): void => {
    if (selectedState !== 'active') {
      return;
    }

    completeDisciplineStep(selected);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const unmark = (): void => {
    if (selectedState !== 'completed') {
      return;
    }

    uncompleteDisciplineStep(selected);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      align="center"
      panelStyle={styles.sheet}
      accessibilityLabel={t('discipline.title')}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.sheetContent}
        bounces={false}
      >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t('discipline.title')}</Text>
          <Text style={styles.body}>{t('discipline.body')}</Text>
          {treeComplete ? <Text style={styles.victory}>{t('discipline.victory')}</Text> : null}
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={layout.hitSlop}
          style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
        >
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.treeWrap}>
        <Svg width={TREE_W} height={TREE_H}>
          {treeComplete ? <VictoryGlow /> : null}
          {DISCIPLINE_EDGES.map(([from, to]) => {
            const a = nodePoint(from);
            const b = nodePoint(to);
            const live = treeComplete || disciplineNodeState(from, completed) === 'completed';
            return (
              <Line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={live ? colors.accent.gold : withAlpha(colors.text.faint, 0.35)}
                strokeWidth={live ? 2 : 1}
              />
            );
          })}
          <PulseHalo
            key={`halo-${selected}`}
            x={nodePoint(selected).x}
            y={nodePoint(selected).y}
          />
          {DISCIPLINE_STEP_IDS.map((id) => {
            const point = nodePoint(id);
            const state = disciplineNodeState(id, completed);
            const fill =
              state === 'completed'
                ? colors.accent.gold
                : state === 'active'
                  ? colors.tint.goldStrong
                  : withAlpha(colors.text.faint, 0.2);
            const stroke =
              state === 'locked' ? withAlpha(colors.text.faint, 0.55) : colors.accent.gold;
            return (
              <Circle
                key={`node-${id}`}
                cx={point.x}
                cy={point.y}
                r={NODE_R}
                fill={fill}
                stroke={stroke}
                strokeWidth={state === 'locked' ? 1 : 1.8}
                opacity={state === 'locked' ? 0.3 : 1}
              />
            );
          })}
        </Svg>
        {DISCIPLINE_STEP_IDS.map((id) => {
          const point = nodePoint(id);
          const state = disciplineNodeState(id, completed);
          return (
            <Pressable
              key={`hit-${id}`}
              onPress={() => {
                setSelected(id);
                void Haptics.selectionAsync();
              }}
              accessibilityRole="button"
              accessibilityLabel={t(disciplineStepTitleKey(id))}
              accessibilityState={{ selected: selected === id, disabled: state === 'locked' }}
              style={[
                styles.hit,
                {
                  left: point.x - NODE_R - 8,
                  top: point.y - NODE_R - 8,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.detail}>
        <Text style={styles.stepTitle}>{t(disciplineStepTitleKey(selected))}</Text>
        <Text style={styles.stepBody}>{t(disciplineStepBodyKey(selected))}</Text>
        <Text style={styles.needLabel}>{t('discipline.need')}</Text>
        <Text style={styles.stepNeed}>{t(disciplineStepNeedKey(selected))}</Text>
        {selectedState === 'locked' ? (
          <Text style={styles.note}>{t('discipline.locked')}</Text>
        ) : null}
        {selectedState === 'completed' ? (
          <>
            <Text style={styles.noteGold}>{t('discipline.done')}</Text>
            {treeComplete ? (
              <Text style={styles.noteGold}>{t('discipline.victory.moved')}</Text>
            ) : null}
            {laterSteps ? <Text style={styles.note}>{t('discipline.unmark.hint')}</Text> : null}
            <ActionButton
              label={t('discipline.unmark')}
              variant="outline"
              sound="deny"
              onPress={unmark}
            />
          </>
        ) : null}
        {selectedState === 'active' ? (
          <ActionButton label={t('discipline.mark')} onPress={markDone} />
        ) : null}
      </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
  },
  sheetContent: {
    paddingBottom: space.xs,
  },
  header: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    ...typography.modalTitle,
    color: colors.text.ivory,
  },
  body: {
    ...typography.caption,
    marginTop: space.xs,
    color: colors.text.faint,
  },
  victory: {
    ...typography.captionStrong,
    marginTop: space.sm,
    color: colors.accent.gold,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    ...typography.cardTitle,
    color: colors.text.primary,
  },
  pressed: {
    opacity: motion.pressOpacity,
  },
  treeWrap: {
    alignSelf: 'center',
    width: TREE_W,
    height: TREE_H,
  },
  hit: {
    position: 'absolute',
    width: (NODE_R + 8) * 2,
    height: (NODE_R + 8) * 2,
  },
  detail: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    gap: space.sm,
  },
  stepTitle: {
    ...typography.heading,
    color: colors.accent.gold,
  },
  stepBody: {
    ...typography.body,
    color: colors.text.muted,
  },
  needLabel: {
    ...typography.eyebrow,
    marginTop: space.xs,
    color: colors.accent.goldMuted,
  },
  stepNeed: {
    ...typography.caption,
    color: colors.text.primary,
  },
  note: {
    ...typography.caption,
    color: colors.text.faint,
  },
  noteGold: {
    ...typography.captionStrong,
    color: colors.accent.gold,
  },
});
