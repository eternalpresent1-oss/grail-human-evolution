import { type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ModalSheet } from '@/components/ModalSheet';
import { dimensionBlurbKey, dimensionNameKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, layout, motion, space, typography } from '@/theme';
import { type HumanDimensionId } from '@/types/grail';

export function VectorInfoSheet({
  dimensionId,
  onClose,
  blurb,
}: {
  dimensionId: HumanDimensionId | null;
  onClose: () => void;
  blurb?: string;
}): ReactElement {
  const t = useTranslator();
  const open = dimensionId !== null;

  return (
    <ModalSheet
      visible={open}
      onClose={onClose}
      align="center"
      panelStyle={styles.panel}
      accessibilityLabel={open ? t(dimensionNameKey(dimensionId)) : t('common.close')}
    >
      {dimensionId === null ? null : (
        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.title}>{t(dimensionNameKey(dimensionId))}</Text>
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
          <Text style={styles.blurb}>{blurb ?? t(dimensionBlurbKey(dimensionId))}</Text>
        </View>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
  },
  body: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  title: {
    ...typography.modalTitle,
    flex: 1,
    color: colors.text.ivory,
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
  blurb: {
    ...typography.body,
    marginTop: space.md,
    color: colors.text.muted,
  },
  pressed: {
    opacity: motion.pressOpacity,
  },
});
