import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { KeyboardInsetScrollView } from '@/components/KeyboardInsetScrollView';
import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, layout, motion, radius, space, typography } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { MAX_ACHIEVEMENTS } from '@/types/achievement';
import { PERCENT_SCORE_MAX } from '@/types/grail';
import {
  CAREER_BREAKTHROUGH_IDS,
  careerBreakthroughKey,
  isAtCareerWall,
  nextCareerCeiling,
  type CareerBreakthroughId,
} from '@/utils/careerGate';

function capLabel(value: number): string {
  return String(Math.round(value));
}

export function CareerGateNotice(): ReactElement {
  const t = useTranslator();
  const [open, setOpen] = useState(false);
  const ceiling = useGrailStore((state) => state.profile.careerCeiling);
  const score = useGrailStore((state) => state.profile.dimensions.craft_career.score);
  const atWall = isAtCareerWall(score, ceiling);
  const openPath = ceiling >= PERCENT_SCORE_MAX;

  return (
    <View style={styles.noticePanel}>
      <Text style={styles.eyebrowGold}>{t('character.gate.eyebrow')}</Text>
      <Text style={styles.panelTitle}>
        {openPath
          ? t('character.gate.title.open')
          : t('character.gate.title', { cap: capLabel(ceiling) })}
      </Text>
      <Text style={styles.body}>
        {openPath
          ? t('character.gate.body.open')
          : atWall
            ? t('character.gate.body.wall', { cap: capLabel(ceiling) })
            : t('character.gate.body.wait', { cap: capLabel(ceiling) })}
      </Text>
      <ActionButton
        label={t('character.gate.open')}
        variant="outline"
        tone="gold"
        onPress={() => setOpen(true)}
        accessibilityLabel={t('character.gate.open.a11y')}
      />
      <CareerGateModal visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function CareerGateModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): ReactElement {
  const t = useTranslator();
  const breakCareerGate = useGrailStore((state) => state.breakCareerGate);
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight(visible);
  const ceiling = useGrailStore((state) => state.profile.careerCeiling);
  const score = useGrailStore((state) => state.profile.dimensions.craft_career.score);
  const achievementCount = useGrailStore((state) => state.achievements.length);
  const [kind, setKind] = useState<CareerBreakthroughId>('role');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const atWall = isAtCareerWall(score, ceiling);
  const openPath = ceiling >= PERCENT_SCORE_MAX;
  const next = nextCareerCeiling(ceiling);

  const submit = (): void => {
    if (!atWall || openPath) {
      return;
    }

    if (draft.trim().length === 0) {
      setError(t('character.gate.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (achievementCount >= MAX_ACHIEVEMENTS) {
      setError(t('achievement.full'));
      return;
    }

    breakCareerGate({
      kind,
      title: draft,
      kindLabel: t(careerBreakthroughKey(kind)),
    });
    setDraft('');
    setError(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      align={keyboardHeight > 0 ? 'bottom' : 'center'}
      avoidKeyboard
      panelStyle={styles.sheet}
      accessibilityLabel={t('character.gate.open')}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.modalTitle}>{t('character.gate.open')}</Text>
          <Text style={styles.modalBody}>{t('character.gate.modal.body')}</Text>
        </View>
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

      <KeyboardInsetScrollView
        keyboardPad={false}
        style={{ maxHeight: Math.max(160, windowHeight - keyboardHeight - 180) }}
        contentContainerStyle={styles.bodyScroll}
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.capLine}>
        {openPath
          ? t('character.gate.cap.open')
          : t('character.gate.cap', {
              cap: capLabel(ceiling),
              next: capLabel(next),
            })}
      </Text>

      {openPath ? (
        <Text style={styles.note}>{t('character.gate.body.open')}</Text>
      ) : atWall ? (
        <>
          <Text style={styles.kindsLabel}>{t('character.gate.kinds')}</Text>
          <View style={styles.kinds}>
            {CAREER_BREAKTHROUGH_IDS.map((id) => (
              <Pressable
                key={id}
                onPress={() => setKind(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === id }}
                accessibilityLabel={t(careerBreakthroughKey(id))}
                style={({ pressed }) => [
                  styles.kindChip,
                  kind === id ? styles.kindChipOn : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={kind === id ? styles.kindChipOnLabel : styles.kindChipLabel}>
                  {t(careerBreakthroughKey(id))}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('character.gate.placeholder')}
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            accessibilityLabel={t('character.gate.placeholder')}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {error !== null ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <ActionButton label={t('character.gate.confirm')} onPress={submit} />
          </View>
        </>
      ) : (
        <Text style={styles.note}>
          {t('character.gate.body.wait', { cap: capLabel(ceiling) })}
        </Text>
      )}

      <View style={styles.actions}>
        <ActionButton label={t('common.close')} variant="ghost" onPress={onClose} />
      </View>
      </KeyboardInsetScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  noticePanel: {
    marginTop: space.lg + 2,
    borderRadius: radius.xl - 2,
    padding: space.lg + 2,
    backgroundColor: colors.tint.gold,
    borderWidth: 1,
    borderColor: colors.border.gold,
    gap: space.sm,
  },
  eyebrowGold: {
    ...typography.eyebrow,
    color: colors.accent.gold,
  },
  panelTitle: {
    ...typography.heading,
    color: colors.text.ivory,
  },
  body: {
    ...typography.body,
    color: colors.text.muted,
  },
  sheet: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  headerCopy: {
    flex: 1,
  },
  modalTitle: {
    ...typography.modalTitle,
    color: colors.text.ivory,
  },
  modalBody: {
    ...typography.caption,
    marginTop: space.xs,
    color: colors.text.faint,
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
  bodyScroll: {
    paddingBottom: space.sm,
  },
  capLine: {
    ...typography.captionStrong,
    paddingHorizontal: space.lg,
    color: colors.accent.gold,
  },
  note: {
    ...typography.body,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
    color: colors.text.muted,
  },
  kindsLabel: {
    ...typography.eyebrow,
    paddingHorizontal: space.lg,
    marginTop: space.md,
    color: colors.accent.goldMuted,
  },
  kinds: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
  kindChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  kindChipOn: {
    borderColor: colors.border.gold,
    backgroundColor: colors.tint.goldStrong,
  },
  kindChipLabel: {
    ...typography.captionStrong,
    color: colors.text.muted,
  },
  kindChipOnLabel: {
    ...typography.captionStrong,
    color: colors.accent.gold,
  },
  input: {
    ...typography.input,
    marginHorizontal: space.lg,
    marginTop: space.md,
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
    paddingHorizontal: space.lg,
    marginTop: space.sm,
    color: colors.state.burned,
  },
  actions: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  pressed: {
    opacity: motion.pressOpacity,
  },
});
