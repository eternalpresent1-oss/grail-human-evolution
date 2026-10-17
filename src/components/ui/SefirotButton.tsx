import { useEffect, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, motion, radius, withAlpha } from '@/theme';
import { DISCIPLINE_EDGES, DISCIPLINE_LAYOUT, DISCIPLINE_STEP_IDS } from '@/types/discipline';

const BUTTON_SIZE = 44;
const BOX = 24;

function SefirotGlyph(): ReactElement {
  const scale = BOX;
  const gold = colors.accent.gold;

  return (
    <Svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`} fill="none">
      {DISCIPLINE_EDGES.map(([from, to]) => {
        const a = DISCIPLINE_LAYOUT[from];
        const b = DISCIPLINE_LAYOUT[to];
        return (
          <Line
            key={`${from}-${to}`}
            x1={a.x * scale}
            y1={a.y * scale}
            x2={b.x * scale}
            y2={b.y * scale}
            stroke={gold}
            strokeWidth={1}
          />
        );
      })}
      {DISCIPLINE_STEP_IDS.map((id) => {
        const point = DISCIPLINE_LAYOUT[id];
        return (
          <Circle
            key={id}
            cx={point.x * scale}
            cy={point.y * scale}
            r={id === 1 || id === 10 || id === 6 ? 1.7 : 1.35}
            fill={gold}
          />
        );
      })}
    </Svg>
  );
}

export function SefirotButton({
  onPress,
  beacon = false,
}: {
  onPress: () => void;
  beacon?: boolean;
}): ReactElement {
  const t = useTranslator();
  const pulse = useSharedValue(0.4);
  const lit = useSharedValue(beacon ? 1 : 0);

  useEffect(() => {
    lit.value = beacon ? 1 : 0;
    if (!beacon) {
      pulse.value = 0.4;
      return;
    }

    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [beacon, lit, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: lit.value === 0 ? 0 : 0.25 + pulse.value * 0.7,
    transform: [{ scale: 1 + pulse.value * 0.22 }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('discipline.open.a11y')}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
      >
        <SefirotGlyph />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: BUTTON_SIZE + 10,
    height: BUTTON_SIZE + 10,
    borderRadius: (BUTTON_SIZE + 10) / 2,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    backgroundColor: withAlpha(colors.accent.gold, 0.18),
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  pressed: {
    opacity: motion.pressOpacity,
    transform: [{ scale: motion.pressScale }],
  },
});
