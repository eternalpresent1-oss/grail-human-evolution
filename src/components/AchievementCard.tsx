import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, layout, motion, radius, space, typography } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { MAX_ACHIEVEMENTS } from '@/types/achievement';
import { formatEuropeanDate } from '@/utils/taskTime';
import { playDeny } from '@/utils/grailSound';

export function AchievementCard(): ReactElement {
  const t = useTranslator();
  const achievements = useGrailStore((state) => state.achievements);
  const addAchievement = useGrailStore((state) => state.addAchievement);
  const removeAchievement = useGrailStore((state) => state.removeAchievement);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const close = (): void => {
    setOpen(false);
    setError(null);
  };

  const submit = (): void => {
    if (title.trim().length === 0) {
      setError(t('achievement.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    addAchievement(title, detail);
    setTitle('');
    setDetail('');
    setError(null);
    setOpen(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>{t('achievement.title')}</Text>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('achievement.add')}
          style={({ pressed }) => [styles.addChip, pressed ? styles.pressed : null]}
        >
          <Text style={styles.addChipLabel}>{t('achievement.add')}</Text>
        </Pressable>
      </View>

      {achievements.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            {item.detail.length > 0 ? <Text style={styles.rowDetail}>{item.detail}</Text> : null}
            <Text style={styles.rowDate}>{formatEuropeanDate(item.achievedOn)}</Text>
          </View>
          <Pressable
            onPress={() => {
              playDeny();
              removeAchievement(item.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('achievement.remove')}
            style={({ pressed }) => [styles.minus, pressed ? styles.pressed : null]}
          >
            <Text style={styles.minusLabel}>−</Text>
          </Pressable>
        </View>
      ))}

      <ModalSheet
        visible={open}
        onClose={close}
        align="bottom"
        avoidKeyboard
        accessibilityLabel={t('achievement.add')}
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{t('achievement.add')}</Text>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={layout.hitSlop}
              style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
            >
              <Text style={styles.closeLabel}>✕</Text>
            </Pressable>
          </View>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('achievement.field.title.placeholder')}
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            accessibilityLabel={t('achievement.field.title')}
            autoFocus
            returnKeyType="next"
          />
          <TextInput
            value={detail}
            onChangeText={setDetail}
            placeholder={t('achievement.field.detail.placeholder')}
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            accessibilityLabel={t('achievement.field.detail')}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {error !== null ? <Text style={styles.error}>{error}</Text> : null}
          {achievements.length >= MAX_ACHIEVEMENTS ? (
            <Text style={styles.error}>{t('achievement.full')}</Text>
          ) : (
            <ActionButton label={t('achievement.save')} onPress={submit} />
          )}
          <ActionButton label={t('common.cancel')} variant="ghost" sound="deny" onPress={close} />
        </View>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: space.lg + 2,
    borderRadius: radius.xl - 2,
    padding: space.lg + 2,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    gap: space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  title: {
    ...typography.heading,
    color: colors.text.ivory,
  },
  addChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  addChipLabel: {
    ...typography.captionStrong,
    color: colors.accent.cyanMuted,
  },
  sheet: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.sm,
  },
  sheetTitle: {
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
  input: {
    ...typography.input,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.sunken,
    color: colors.text.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  error: {
    ...typography.captionStrong,
    color: colors.state.burned,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.panelSoft,
    padding: space.md,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    ...typography.itemTitle,
    color: colors.text.ivory,
  },
  rowDetail: {
    ...typography.captionStrong,
    marginTop: space.hair,
    color: colors.accent.gold,
  },
  rowDate: {
    ...typography.micro,
    marginTop: space.xs,
    color: colors.text.faint,
  },
  minus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.burned,
  },
  minusLabel: {
    ...typography.labelLg,
    color: colors.state.burned,
  },
  pressed: {
    opacity: motion.pressOpacity,
  },
});
