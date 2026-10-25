import { useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, layout, motion, radius, space, typography } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { COUNSEL_MESSAGE_MAX } from '@/types/counsel';
import { accessBlockNow } from '@/api/featureAccess';
import {
  CounselRequestError,
  counselChannel,
  requestCounselReply,
  requestLifeVectorReading,
} from '@/utils/counselAi';
import { buildGrailCounselSnapshot } from '@/utils/grailSnapshot';
import { createCounselId } from '@/utils/ids';
import { localDateKey } from '@/utils/taskTime';

export function CounselPanel(): ReactElement {
  const t = useTranslator();
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton
        label={t('counsel.title')}
        variant="outline"
        tone="gold"
        onPress={() => setOpen(true)}
        accessibilityLabel={t('counsel.open.a11y')}
      />
      <CounselModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CounselModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): ReactElement {
  const t = useTranslator();
  const ready = counselChannel() !== 'none';
  const thread = useGrailStore((state) => state.counselThread);
  const appendCounselMessage = useGrailStore((state) => state.appendCounselMessage);
  const dropLastCounselUserMessage = useGrailStore((state) => state.dropLastCounselUserMessage);
  const profile = useGrailStore((state) => state.profile);
  const tasks = useGrailStore((state) => state.tasks);
  const campaigns = useGrailStore((state) => state.campaigns);
  const talents = useGrailStore((state) => state.talents);
  const achievements = useGrailStore((state) => state.achievements);
  const driveLine = useGrailStore((state) => state.driveLine);
  const shadowEvents = useGrailStore((state) => state.shadowEvents);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyboardHeight = useKeyboardHeight(visible);
  const raised = keyboardHeight > 0;

  const snapshot = (): string =>
    buildGrailCounselSnapshot({
      t,
      profile,
      tasks,
      campaigns,
      talents,
      achievements,
      driveLine,
      shadowEvents,
      asOf: localDateKey(),
    });

  const send = async (raw?: string): Promise<void> => {
    const prompt = (raw ?? draft).trim();
    if (prompt.length === 0 || busy || !ready) {
      return;
    }

    setBusy(true);
    setError(null);
    const blocked = await accessBlockNow('counsel_question', localDateKey());
    if (blocked !== null) {
      setBusy(false);
      setError(t(blocked === 'limit' ? 'access.limit' : 'access.premium'));
      return;
    }
    appendCounselMessage({ id: createCounselId(), role: 'user', text: prompt });
    setDraft('');

    try {
      const reply = await requestCounselReply({
        language: t.language,
        snapshot: snapshot(),
        thread,
        prompt,
      });
      appendCounselMessage({ id: createCounselId(), role: 'assistant', text: reply });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      dropLastCounselUserMessage();
      setError(
        caught instanceof CounselRequestError ? t(caught.key) : t('counsel.error.network'),
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      align="bottom"
      avoidKeyboard
      panelStyle={[styles.sheet, raised ? styles.sheetFill : styles.sheetIdle]}
      accessibilityLabel={t('counsel.title')}
    >
      <View style={[styles.column, raised ? styles.columnFill : null]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('counsel.title')}</Text>
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

        {ready ? null : <Text style={styles.note}>{t('counsel.empty')}</Text>}

        <ScrollView
          style={[styles.thread, raised ? styles.threadFill : styles.threadIdle]}
          contentContainerStyle={styles.threadContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
        >
          {thread.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}
            >
              <Text style={styles.bubbleText}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>

        {error !== null ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={(value) => {
              if (value.includes('\n')) {
                void send(value.replace(/\n/g, ''));
                return;
              }
              setDraft(value);
            }}
            placeholder={t('counsel.placeholder')}
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            editable={ready && !busy}
            maxLength={COUNSEL_MESSAGE_MAX}
            accessibilityLabel={t('counsel.placeholder')}
            returnKeyType="send"
            blurOnSubmit
            enablesReturnKeyAutomatically
            onSubmitEditing={() => {
              void send();
            }}
          />
        </View>
      </View>
    </ModalSheet>
  );
}

export function LifeVectorRefresh({
  fallback,
}: {
  fallback: readonly string[];
}): ReactElement {
  const t = useTranslator();
  const ready = counselChannel() !== 'none';
  const reading = useGrailStore((state) => state.lifeVectorReading);
  const setLifeVectorReading = useGrailStore((state) => state.setLifeVectorReading);
  const profile = useGrailStore((state) => state.profile);
  const tasks = useGrailStore((state) => state.tasks);
  const campaigns = useGrailStore((state) => state.campaigns);
  const talents = useGrailStore((state) => state.talents);
  const achievements = useGrailStore((state) => state.achievements);
  const driveLine = useGrailStore((state) => state.driveLine);
  const shadowEvents = useGrailStore((state) => state.shadowEvents);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChannel = ready;
  const lines =
    hasChannel && reading.length > 0
      ? reading.split('\n').filter((line) => line.trim().length > 0)
      : fallback;

  const refresh = async (): Promise<void> => {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    const blocked = await accessBlockNow('life_vector', localDateKey());
    if (blocked !== null) {
      setBusy(false);
      setError(t(blocked === 'limit' ? 'access.limit' : 'access.premium'));
      return;
    }

    try {
      const next = await requestLifeVectorReading({
        language: t.language,
        snapshot: buildGrailCounselSnapshot({
          t,
          profile,
          tasks,
          campaigns,
          talents,
          achievements,
          driveLine,
          shadowEvents,
          asOf: localDateKey(),
        }),
      });
      setLifeVectorReading(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      setError(
        caught instanceof CounselRequestError ? t(caught.key) : t('counsel.error.network'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.planCard}>
      {lines.map((step, index) => (
        <Text key={`${index}-${step.slice(0, 24)}`} style={styles.stepText}>
          {step}
        </Text>
      ))}
      {error !== null ? <Text style={styles.error}>{error}</Text> : null}
      {hasChannel ? (
        <ActionButton
          label={busy ? t('analytics.plan.busy') : t('analytics.plan.refresh')}
          variant="outline"
          onPress={() => {
            void refresh();
          }}
          busy={busy}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    maxHeight: '100%',
  },
  sheetIdle: {
    maxHeight: '72%',
  },
  sheetFill: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
  },
  column: {
    minHeight: 0,
  },
  columnFill: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    ...typography.modalTitle,
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
  note: {
    flexShrink: 0,
    ...typography.caption,
    paddingHorizontal: space.lg,
    color: colors.accent.gold,
  },
  error: {
    flexShrink: 0,
    ...typography.captionStrong,
    paddingHorizontal: space.lg,
    color: colors.state.burned,
  },
  thread: {
    paddingHorizontal: space.lg,
  },
  threadIdle: {
    maxHeight: 320,
  },
  threadFill: {
    flex: 1,
    minHeight: 0,
  },
  threadContent: {
    paddingBottom: space.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bubble: {
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  bubbleUser: {
    backgroundColor: colors.tint.goldStrong,
    alignSelf: 'flex-end',
  },
  bubbleAi: {
    backgroundColor: colors.surface.panel,
    alignSelf: 'flex-start',
  },
  bubbleText: {
    ...typography.body,
    color: colors.text.primary,
  },
  composer: {
    flexShrink: 0,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    paddingTop: space.sm,
  },
  input: {
    ...typography.input,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.sunken,
    color: colors.text.primary,
    paddingHorizontal: space.lg - 2,
    paddingVertical: space.md,
  },
  planCard: {
    borderRadius: radius.xl - 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.panel,
    padding: space.lg,
    gap: space.md,
  },
  stepText: {
    ...typography.body,
    color: colors.text.muted,
  },
  pressed: {
    opacity: motion.pressOpacity,
  },
});
