import { useRouter } from 'expo-router';
import { type ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, motion, radius } from '@/theme';

const GLYPH_BOX = 24;
const GLYPH_CENTRE = GLYPH_BOX / 2;
const TOOTH_COUNT = 8;
const TOOTH_ANGLES = Array.from({ length: TOOTH_COUNT }, (_, index) => (index * 360) / TOOTH_COUNT);

/** Comfortably over the 44pt floor for a tappable control. */
const BUTTON_SIZE = 44;
const GLYPH_SIZE = 22;

/**
 * Drawn rather than imported: `@expo/vector-icons` is not a dependency of this
 * project, and the tab glyphs are built the same way.
 */
function GearGlyph(): ReactElement {
  return (
    <Svg width={GLYPH_SIZE} height={GLYPH_SIZE} viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`} fill="none">
      {TOOTH_ANGLES.map((angle) => (
        <Rect
          key={angle}
          x={GLYPH_CENTRE - 1.6}
          y={1.2}
          width={3.2}
          height={4.6}
          rx={1}
          rotation={angle}
          originX={GLYPH_CENTRE}
          originY={GLYPH_CENTRE}
          fill={colors.accent.gold}
        />
      ))}
      <Circle
        cx={GLYPH_CENTRE}
        cy={GLYPH_CENTRE}
        r={6.4}
        stroke={colors.accent.gold}
        strokeWidth={1.9}
      />
      <Circle cx={GLYPH_CENTRE} cy={GLYPH_CENTRE} r={2.3} fill={colors.accent.gold} />
    </Svg>
  );
}

/** Opens the settings route, which the root stack presents modally over the tabs. */
export function SettingsButton(): ReactElement {
  const t = useTranslator();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel={t('settings.open.a11y')}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <GearGlyph />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
