import { useEffect, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, withAlpha } from '@/theme';

export type RitualFxKind = 'absorb' | 'burn';

interface RitualFxProps {
  kind: RitualFxKind;
  onFinished: () => void;
}

const EMBERS = [
  { x: -52, delay: 0, rise: 78, size: 6 },
  { x: -28, delay: 40, rise: 92, size: 4 },
  { x: -8, delay: 20, rise: 110, size: 7 },
  { x: 12, delay: 70, rise: 86, size: 5 },
  { x: 34, delay: 30, rise: 102, size: 4 },
  { x: 56, delay: 90, rise: 74, size: 6 },
  { x: -40, delay: 110, rise: 64, size: 3 },
  { x: 22, delay: 50, rise: 118, size: 3 },
  { x: 0, delay: 10, rise: 96, size: 8 },
  { x: -16, delay: 80, rise: 70, size: 4 },
] as const;

export function RitualFx({ kind, onFinished }: RitualFxProps): ReactElement {
  if (kind === 'absorb') {
    return <AbsorbBurst onFinished={onFinished} />;
  }

  return <IncinerationBurst onFinished={onFinished} />;
}

function AbsorbBurst({ onFinished }: { onFinished: () => void }): ReactElement {
  const glow = useSharedValue(0);
  const ring = useSharedValue(0.55);

  useEffect(() => {
    glow.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }),
    );
    ring.value = withTiming(1.45, { duration: 480, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(onFinished)();
      }
    });
  }, [glow, onFinished, ring]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.72 + glow.value * 0.5 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - (ring.value - 0.55) / 0.9,
    transform: [{ scale: ring.value }],
  }));

  return (
    <View pointerEvents="none" style={styles.stage}>
      <Animated.View style={[styles.absorbCore, glowStyle]} />
      <Animated.View style={[styles.absorbRing, ringStyle]} />
    </View>
  );
}

function IncinerationBurst({ onFinished }: { onFinished: () => void }): ReactElement {
  useEffect(() => {
    const timeout = setTimeout(() => {
      onFinished();
    }, 520);
    return () => {
      clearTimeout(timeout);
    };
  }, [onFinished]);

  return (
    <View pointerEvents="none" style={styles.stage}>
      {EMBERS.map((ember, index) => (
        <Ember key={index} {...ember} />
      ))}
    </View>
  );
}

function Ember({
  x,
  delay,
  rise,
  size,
}: {
  x: number;
  delay: number;
  rise: number;
  size: number;
}): ReactElement {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 460, easing: Easing.out(Easing.quad) }),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: x + progress.value * (x > 0 ? 10 : -10) },
      { translateY: -progress.value * rise },
      { scale: 1 - progress.value * 0.45 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.ember,
        style,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absorbCore: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: withAlpha(colors.accent.cyan, 0.35),
    shadowColor: colors.accent.gold,
    shadowOpacity: 0.9,
    shadowRadius: 28,
  },
  absorbRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: withAlpha(colors.accent.gold, 0.95),
  },
  ember: {
    position: 'absolute',
    backgroundColor: colors.state.burned,
    shadowColor: colors.state.danger,
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});
