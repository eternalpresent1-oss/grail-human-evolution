import { type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ModalSheet } from '@/components/ModalSheet';
import { ShadowOctagon } from '@/components/ShadowOctagon';
import { SHADOW_CATALOG } from '@/constants/shadow';
import { shadowHintKey, shadowTitleKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, layout, motion, radius, space, typography } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { type ShadowCatalogId } from '@/types/grail';
import { formatEuropeanDates, localDateKey } from '@/utils/taskTime';
import { computeAllShadowShares, tallyShadowCatalog } from '@/utils/weekLedger';
import { playDeny } from '@/utils/grailSound';

interface ShadowConfessSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ShadowConfessSheet({
  visible,
  onClose,
}: ShadowConfessSheetProps): ReactElement {
  const t = useTranslator();
  const confessShadow = useGrailStore((state) => state.confessShadow);
  const retractShadow = useGrailStore((state) => state.retractShadow);
  const shadowEvents = useGrailStore((state) => state.shadowEvents);
  const asOf = localDateKey();
  const shares = computeAllShadowShares(shadowEvents, asOf);
  const tally = tallyShadowCatalog(shadowEvents, asOf);
  const tallyById = new Map(tally.map((row) => [row.catalogId, row]));

  const onConfess = (catalogId: ShadowCatalogId): void => {
    playDeny();
    confessShadow(catalogId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const onRetract = (catalogId: ShadowCatalogId): void => {
    retractShadow(catalogId);
    void Haptics.selectionAsync();
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      panelStyle={styles.panel}
      accessibilityLabel={t('shadow.sheet.title')}
    >
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.kicker}>{t('shadow.sheet.kicker')}</Text>
        <Text style={styles.title}>{t('shadow.sheet.title')}</Text>
        <Text style={styles.subtitle}>{t('shadow.sheet.subtitle')}</Text>

        <Text style={styles.field}>{t('shadow.sheet.field')}</Text>
        <ShadowOctagon shares={shares} />

        {tally.length === 0 ? (
          <Text style={styles.empty}>{t('shadow.sheet.empty')}</Text>
        ) : (
          <View style={styles.tally}>
            {tally.map((row) => {
              const title = t(shadowTitleKey(row.catalogId));
              const dates = formatEuropeanDates(row.occurredOn);

              return (
                <View key={row.catalogId} style={styles.tallyRow}>
                  <Text style={styles.tallyText}>
                    {row.count > 1
                      ? t('shadow.sheet.tally.many', { title, count: row.count, dates })
                      : t('shadow.sheet.tally', { title, dates })}
                  </Text>
                  <Pressable
                    onPress={() => onRetract(row.catalogId)}
                    accessibilityRole="button"
                    accessibilityLabel={t('shadow.sheet.retract.a11y', { title })}
                    hitSlop={layout.hitSlop}
                    style={({ pressed }) => [styles.tallyRetract, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.tallyRetractMark}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.list}>
          {SHADOW_CATALOG.map((entry) => {
            const chosen = tallyById.get(entry.id);
            const dates = chosen === undefined ? '' : formatEuropeanDates(chosen.occurredOn);

            return (
              <Pressable
                key={entry.id}
                onPress={() => onConfess(entry.id)}
                accessibilityRole="button"
                accessibilityLabel={
                  dates.length === 0
                    ? t(shadowTitleKey(entry.id))
                    : t('shadow.sheet.tally', { title: t(shadowTitleKey(entry.id)), dates })
                }
                style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
              >
                <View style={styles.rowHead}>
                  <Text style={styles.rowTitle}>{t(shadowTitleKey(entry.id))}</Text>
                  {dates.length > 0 ? <Text style={styles.rowDate}>{dates}</Text> : null}
                </View>
                <Text style={styles.rowHint}>{t(shadowHintKey(entry.id))}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    maxHeight: '88%',
  },
  scroll: {
    paddingBottom: space.md,
  },
  kicker: {
    ...typography.micro,
    color: colors.accent.cyanMuted,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  title: {
    ...typography.modalTitle,
    color: colors.text.primary,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.muted,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
  field: {
    ...typography.micro,
    color: colors.state.dangerText,
    paddingHorizontal: space.lg,
    marginTop: space.lg,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  empty: {
    ...typography.caption,
    color: colors.text.faint,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
    textAlign: 'center',
  },
  tally: {
    paddingHorizontal: space.lg,
    marginTop: space.md,
    gap: space.xs,
  },
  tallyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  tallyText: {
    ...typography.caption,
    flex: 1,
    color: colors.state.dangerText,
  },
  tallyRetract: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tallyRetractMark: {
    ...typography.caption,
    color: colors.text.faint,
  },
  list: {
    paddingHorizontal: space.md,
    paddingVertical: space.lg,
    gap: space.sm,
  },
  row: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.sheen,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  pressed: {
    transform: [{ scale: motion.pressScale }],
    opacity: motion.pressOpacity,
  },
  rowTitle: {
    ...typography.itemTitle,
    flex: 1,
    color: colors.text.primary,
  },
  rowDate: {
    ...typography.captionStrong,
    color: colors.state.dangerText,
  },
  rowHint: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: space.xs,
  },
});
