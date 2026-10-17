import { type ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, motion, radius } from '@/theme';

const BUTTON_SIZE = 44;
const GLYPH = 22;

function LotusGlyph(): ReactElement {
  const gold = colors.accent.gold;
  const cyan = colors.accent.cyan;

  return (
    <Svg width={GLYPH} height={GLYPH} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20 C8.2 16.4 5.2 13.2 6.2 8.6 C8.4 10.4 10.2 11.2 12 8.2 C13.8 11.2 15.6 10.4 17.8 8.6 C18.8 13.2 15.8 16.4 12 20 Z"
        fill={gold}
        fillOpacity={0.22}
        stroke={gold}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path
        d="M12 18.4 C9.6 15.6 7.6 13.2 8.2 10 C9.8 11.2 11 11.6 12 9.4 C13 11.6 14.2 11.2 15.8 10 C16.4 13.2 14.4 15.6 12 18.4 Z"
        fill={cyan}
        fillOpacity={0.28}
        stroke={cyan}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path
        d="M12 16.6 C10.6 14.6 9.4 13 9.8 11 C10.8 11.8 11.5 12 12 10.4 C12.5 12 13.2 11.8 14.2 11 C14.6 13 13.4 14.6 12 16.6 Z"
        fill={gold}
        fillOpacity={0.55}
        stroke={gold}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={11.2} r={1.35} fill={cyan} />
    </Svg>
  );
}

export function LotusButton({ onPress }: { onPress: () => void }): ReactElement {
  const t = useTranslator();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('breath.open.a11y')}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <LotusGlyph />
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
    borderColor: colors.border.cyan,
  },
  pressed: {
    opacity: motion.pressOpacity,
    transform: [{ scale: motion.pressScale }],
  },
});
