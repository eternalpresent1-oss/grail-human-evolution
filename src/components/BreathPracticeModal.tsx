import { useEffect, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ModalSheet } from '@/components/ModalSheet';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, layout, motion, space, typography, withAlpha } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import {
  BREATH_EXHALE_MS,
  BREATH_HOLD_MS,
  BREATH_INHALE_MS,
  BREATH_PREP_MS,
  BREATH_SESSION_MS,
  breathPhaseBeat,
} from '@/utils/breathPractice';
import { playExhale, playInhale, setBreathSession, stopBreathVoices } from '@/utils/grailSound';

type BreathPhase = 'prep' | 'inhale' | 'hold' | 'exhale';

const EMPTY = 0.42;
const FULL = 1;

function formatElapsed(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

function formatPrep(ms: number): string {
  return String(Math.max(1, Math.ceil(ms / 1000)));
}

export function BreathPracticeModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): ReactElement {
  const t = useTranslator();
  const awardBreathPractice = useGrailStore((state) => state.awardBreathPractice);
  const [phase, setPhase] = useState<BreathPhase>('prep');
  const [phaseBeat, setPhaseBeat] = useState(1);
  const [elapsed, setElapsed] = useState(BREATH_PREP_MS);
  const [awarded, setAwarded] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  const scale = useSharedValue(EMPTY);
  const fill = useSharedValue(0);

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setPhase('prep');
      setPhaseBeat(1);
      setElapsed(BREATH_PREP_MS);
      setAwarded(false);
    }
  }

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    let granted = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let practiceStarted: number | null = null;
    let phaseStartedAt = Date.now();
    let phaseDuration = BREATH_PREP_MS;
    const opened = Date.now();

    const enterPhase = (next: BreathPhase, duration: number): void => {
      phaseStartedAt = Date.now();
      phaseDuration = duration;
      setPhase(next);
      setPhaseBeat(1);
    };
    scale.value = EMPTY;
    fill.value = 0;
    void setBreathSession(true);

    const tick = setInterval(() => {
      if (cancelled) {
        return;
      }

      if (practiceStarted === null) {
        setElapsed(Math.max(0, BREATH_PREP_MS - (Date.now() - opened)));
        return;
      }

      const passed = Date.now() - practiceStarted;
      setElapsed(passed);
      setPhaseBeat(breathPhaseBeat(Date.now() - phaseStartedAt, phaseDuration));

      if (!granted && passed >= BREATH_SESSION_MS) {
        granted = true;
        setAwarded(true);
        if (awardBreathPractice()) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    }, 200);

    const cycle = (): void => {
      if (cancelled) {
        return;
      }

      enterPhase('inhale', BREATH_INHALE_MS);
      playInhale();
      scale.value = withTiming(FULL, { duration: BREATH_INHALE_MS, easing: Easing.inOut(Easing.sin) });
      fill.value = withTiming(1, { duration: BREATH_INHALE_MS, easing: Easing.inOut(Easing.sin) });

      timeout = setTimeout(() => {
        if (cancelled) {
          return;
        }

        enterPhase('hold', BREATH_HOLD_MS);
        stopBreathVoices();
        timeout = setTimeout(() => {
          if (cancelled) {
            return;
          }

          enterPhase('exhale', BREATH_EXHALE_MS);
          playExhale();
          scale.value = withTiming(EMPTY, {
            duration: BREATH_EXHALE_MS,
            easing: Easing.inOut(Easing.sin),
          });
          fill.value = withTiming(0, {
            duration: BREATH_EXHALE_MS,
            easing: Easing.inOut(Easing.sin),
          });
          timeout = setTimeout(cycle, BREATH_EXHALE_MS);
        }, BREATH_HOLD_MS);
      }, BREATH_INHALE_MS);
    };

    timeout = setTimeout(() => {
      if (cancelled) {
        return;
      }

      practiceStarted = Date.now();
      setElapsed(0);
      cycle();
    }, BREATH_PREP_MS);

    return () => {
      cancelled = true;
      clearInterval(tick);
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      void setBreathSession(false);
    };
  }, [awardBreathPractice, fill, scale, visible]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + fill.value * 0.7,
  }));

  const preparing = phase === 'prep';
  const phaseName =
    phase === 'prep'
      ? t('breath.phase.prep')
      : phase === 'inhale'
        ? t('breath.phase.inhale')
        : phase === 'hold'
          ? t('breath.phase.hold')
          : t('breath.phase.exhale');
  const phaseLabel = preparing
    ? phaseName
    : t('breath.phase.beat', { label: phaseName, second: phaseBeat });

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      align="center"
      panelStyle={styles.panel}
      accessibilityLabel={t('breath.title')}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t('breath.title')}</Text>
          <Text style={styles.hint}>{t('breath.hint')}</Text>
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

      <View style={styles.stage}>
        <View style={styles.halo} />
        <Animated.View style={[styles.orb, orbStyle]}>
          <Animated.View style={[styles.core, coreStyle]} />
        </Animated.View>
      </View>

      <Text style={styles.phase}>{phaseLabel}</Text>
      <Text style={styles.clock}>{preparing ? formatPrep(elapsed) : formatElapsed(elapsed)}</Text>
      {awarded ? <Text style={styles.award}>{t('breath.award')}</Text> : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    paddingBottom: space.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    gap: space.md,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    ...typography.modalTitle,
    color: colors.text.ivory,
  },
  hint: {
    ...typography.caption,
    marginTop: space.sm,
    color: colors.text.faint,
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
  stage: {
    marginTop: space.xxl,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: withAlpha(colors.accent.cyan, 0.08),
    borderWidth: 1,
    borderColor: withAlpha(colors.accent.gold, 0.18),
  },
  orb: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    backgroundColor: withAlpha(colors.accent.gold, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: '78%',
    height: '78%',
    borderRadius: 84,
    backgroundColor: colors.accent.cyan,
  },
  phase: {
    ...typography.heading,
    marginTop: space.xl,
    color: colors.text.ivory,
    textAlign: 'center',
  },
  clock: {
    ...typography.caption,
    marginTop: space.sm,
    color: colors.text.faint,
    textAlign: 'center',
  },
  award: {
    ...typography.body,
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    color: colors.accent.gold,
    textAlign: 'center',
  },
  pressed: {
    opacity: motion.pressOpacity,
  },
});
