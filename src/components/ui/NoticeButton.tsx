import { type ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, motion, radius } from '@/theme';

const BUTTON_SIZE = 44;
const GLYPH = 28;

function NoticeGlyph(): ReactElement {
  const ink = colors.text.faint;

  return (
    <Svg width={GLYPH} height={GLYPH} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.6 V15.6"
        stroke={ink}
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={20.2} r={2.15} fill={ink} />
    </Svg>
  );
}

export function NoticeButton({ onPress }: { onPress: () => void }): ReactElement {
  const t = useTranslator();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('guide.open.a11y')}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <NoticeGlyph />
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
    backgroundColor: colors.surface.panelSoft,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  pressed: {
    opacity: motion.pressOpacity,
    transform: [{ scale: motion.pressScale }],
  },
});
