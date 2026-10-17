import { type ReactElement, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassPanel } from '@/components/GlassPanel';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, radius, space } from '@/theme';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** `bottom` docks the sheet to the bottom edge, `center` centres it. */
  align?: 'bottom' | 'center';
  /** When false, backdrop taps and the hardware back button are ignored. */
  dismissible?: boolean;
  avoidKeyboard?: boolean;
  panelStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Shared modal shell: translucent over system bars on Android, padded by the
 * safe-area insets, with a backdrop that closes the sheet.
 */
export function ModalSheet({
  visible,
  onClose,
  children,
  align = 'bottom',
  dismissible = true,
  avoidKeyboard = false,
  panelStyle,
  accessibilityLabel,
}: ModalSheetProps): ReactElement {
  const insets = useSafeAreaInsets();
  const t = useTranslator();
  const keyboardHeight = useKeyboardHeight(avoidKeyboard && visible);
  const dockToKeyboard = avoidKeyboard && keyboardHeight > 0;
  const bottomPad =
    dockToKeyboard && Platform.OS === 'android'
      ? keyboardHeight + space.md
      : Math.max(insets.bottom, space.lg) + space.md;

  const body = (
    <View
      style={[
        styles.stage,
        align === 'center' && !dockToKeyboard ? styles.stageCenter : styles.stageBottom,
        {
          paddingTop: Math.max(insets.top, space.lg) + space.sm,
          paddingBottom: bottomPad,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* The sheet sits above the backdrop. Claiming the responder here
          stole pans and nested scrolls from children (talent tree, chat). */}
      <GlassPanel style={[styles.panel, panelStyle]} intensity={64}>
        {children}
      </GlassPanel>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismissible ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissible ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? t('common.close')}
        />

        {avoidKeyboard && Platform.OS === 'ios' ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior="padding"
            pointerEvents="box-none"
          >
            {body}
          </KeyboardAvoidingView>
        ) : (
          body
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.surface.scrim,
  },
  flex: {
    flex: 1,
  },
  stage: {
    flex: 1,
    paddingHorizontal: space.md,
  },
  stageBottom: {
    justifyContent: 'flex-end',
  },
  stageCenter: {
    justifyContent: 'center',
  },
  panel: {
    borderRadius: radius.xxl,
    maxHeight: '100%',
  },
});
