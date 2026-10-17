import { type ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, motion, radius } from '@/theme';

const BUTTON_SIZE = 44;
const GLYPH = 22;

function TreeGlyph(): ReactElement {
  return (
    <Svg width={GLYPH} height={GLYPH} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21 V11"
        stroke={colors.accent.gold}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
      <Path
        d="M12 14 L7.2 10.4 M12 14 L16.8 10.4 M12 11 L8.4 7.2 M12 11 L15.6 7.2"
        stroke={colors.accent.gold}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={5.4} r={2.15} fill={colors.accent.gold} />
      <Circle cx={6.6} cy={9.6} r={1.7} fill={colors.accent.gold} />
      <Circle cx={17.4} cy={9.6} r={1.7} fill={colors.accent.gold} />
      <Circle cx={8} cy={6.6} r={1.45} fill={colors.accent.gold} />
      <Circle cx={16} cy={6.6} r={1.45} fill={colors.accent.gold} />
    </Svg>
  );
}

export function TreeButton({ onPress }: { onPress: () => void }): ReactElement {
  const t = useTranslator();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('talent.open.a11y')}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <TreeGlyph />
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
