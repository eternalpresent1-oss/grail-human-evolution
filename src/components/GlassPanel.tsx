import { type ReactElement, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

import { colors } from '@/theme';

interface GlassPanelProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

/**
 * Frosted container. The blur is a non-interactive backdrop rather than a
 * wrapper: on Android `dimezisBlurView` swallows touches, which previously made
 * atom cards and modal buttons unpressable.
 */
export function GlassPanel({
  children,
  style,
  intensity = 52,
}: GlassPanelProps): ReactElement {
  return (
    <View style={[styles.base, style]}>
      {Platform.OS === 'web' ? null : (
        <BlurView
          intensity={intensity}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          pointerEvents="none"
          style={styles.blur}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor:
      Platform.OS === 'web' ? colors.surface.glassOpaque : colors.surface.glass,
  },
  blur: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
