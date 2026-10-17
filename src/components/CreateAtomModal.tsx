import { useState, type ReactElement } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { KeyboardInsetScrollView } from '@/components/KeyboardInsetScrollView';
import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { dimensionNameKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, layout, motion, radius, space, typography } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { HUMAN_DIMENSION_IDS, type HumanDimensionId } from '@/types/grail';
import { createAtomId } from '@/utils/ids';
import { isSchedulableDateKey, formatEuropeanDate, localDateKey, parseIsoDateKey, parseTypedClock } from '@/utils/taskTime';
import { ensureMethodNotificationPermission } from '@/utils/syncMethodNotifications';
import { isExpoGo } from '@/utils/runtimeEnv';

interface CreateAtomModalProps {
  visible: boolean;
  onClose: () => void;
  initialDimension?: HumanDimensionId;
  initialScheduledOn?: string;
}

const DEFAULT_XP = 15;

export function CreateAtomModal({
  visible,
  onClose,
  initialDimension = 'physical',
  initialScheduledOn,
}: CreateAtomModalProps): ReactElement {
  const t = useTranslator();

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      accessibilityLabel={t('common.cancel')}
    >
      {visible ? (
        <CreateAtomForm
          initialDimension={initialDimension}
          initialScheduledOn={initialScheduledOn ?? localDateKey()}
          onClose={onClose}
        />
      ) : null}
    </ModalSheet>
  );
}

function CreateAtomForm({
  initialDimension,
  initialScheduledOn,
  onClose,
}: {
  initialDimension: HumanDimensionId;
  initialScheduledOn: string;
  onClose: () => void;
}): ReactElement {
  const t = useTranslator();
  const addTask = useGrailStore((state) => state.addTask);
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight(true);
  const formMaxHeight = Math.max(160, Math.min(420, windowHeight - keyboardHeight - 220));
  const [title, setTitle] = useState('');
  const [selectedDimension, setSelectedDimension] = useState<HumanDimensionId>(initialDimension);
  const [dateDraft, setDateDraft] = useState(() => formatEuropeanDate(initialScheduledOn));
  const [timeDraft, setTimeDraft] = useState('');
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (): void => {
    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      setError(t('create.field.title.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const scheduledOn = parseIsoDateKey(dateDraft);
    if (scheduledOn === null) {
      setError(t('create.field.date.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!isSchedulableDateKey(scheduledOn, localDateKey())) {
      setError(t('create.field.date.past'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const clock = parseTypedClock(timeDraft);
    if (clock === null) {
      setError(t('create.field.time.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (notify && clock === undefined) {
      setError(t('create.field.notify.needTime'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    addTask({
      id: createAtomId(),
      title: trimmedTitle,
      dimensionId: selectedDimension,
      xp: DEFAULT_XP,
      scheduledOn,
      ...(clock === undefined ? {} : { timeDeadline: clock }),
      ...(notify && clock !== undefined ? { notify: true } : {}),
    });

    if (notify && !isExpoGo()) {
      void ensureMethodNotificationPermission().catch(() => undefined);
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('create.title')}</Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={layout.hitSlop}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.closePressed : null]}
        >
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      </View>

      <KeyboardInsetScrollView
        keyboardPad={false}
        style={[styles.formScroll, { maxHeight: formMaxHeight }]}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.fieldLabel}>{t('create.field.title')}</Text>
        <TextInput
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (error !== null) {
              setError(null);
            }
          }}
          placeholder={t('create.field.title.placeholder')}
          placeholderTextColor={colors.text.faint}
          style={[styles.input, error !== null ? styles.inputError : null]}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          accessibilityLabel={t('create.field.title')}
        />
        {error !== null ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.fieldLabel}>{t('create.field.deadline')}</Text>
        <View style={styles.whenRow}>
          <View style={styles.whenField}>
            <Text style={styles.whenLabel}>{t('create.field.date')}</Text>
            <TextInput
              value={dateDraft}
              onChangeText={setDateDraft}
              placeholder={t('create.field.date.placeholder')}
              placeholderTextColor={colors.text.faint}
              style={styles.input}
              accessibilityLabel={t('create.field.date')}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.whenField}>
            <Text style={styles.whenLabel}>{t('create.field.time')}</Text>
            <TextInput
              value={timeDraft}
              onChangeText={(value) => {
                setTimeDraft(value);
                if (value.trim().length > 0) {
                  setNotify(true);
                }
              }}
              placeholder={t('create.field.time.placeholder')}
              placeholderTextColor={colors.text.faint}
              style={styles.input}
              accessibilityLabel={t('create.field.time')}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.notifyRow}>
          <View style={styles.notifyCopy}>
            <Text style={styles.fieldLabel}>{t('create.field.notify')}</Text>
            <Text style={styles.notifyHint}>{t('create.field.notify.hint')}</Text>
          </View>
          <Switch
            value={notify}
            onValueChange={setNotify}
            trackColor={{
              false: colors.surface.sunken,
              true: colors.accent.gold,
            }}
            thumbColor={notify ? colors.text.ivory : colors.text.muted}
            ios_backgroundColor={colors.surface.sunken}
            accessibilityLabel={t('create.field.notify')}
          />
        </View>

        <Text style={styles.fieldLabel}>{t('create.field.dimension')}</Text>
        <View style={styles.grid}>
          {HUMAN_DIMENSION_IDS.map((dimensionId) => {
            const active = dimensionId === selectedDimension;
            const label = t(dimensionNameKey(dimensionId));

            return (
              <Pressable
                key={dimensionId}
                onPress={() => setSelectedDimension(dimensionId)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
                style={({ pressed }) => [
                  styles.dimensionChip,
                  active ? styles.dimensionChipActive : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text
                  style={[styles.dimensionLabel, active ? styles.dimensionLabelActive : null]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </KeyboardInsetScrollView>

      <View style={styles.actions}>
        <ActionButton label={t('create.submit')} onPress={onSubmit} />
        <ActionButton label={t('common.cancel')} variant="ghost" sound="deny" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg + 2,
    paddingBottom: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.control,
    backgroundColor: colors.surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    opacity: motion.pressOpacity,
    transform: [{ scale: motion.pressScale }],
  },
  closeLabel: {
    ...typography.cardTitle,
    color: colors.text.primary,
  },
  title: {
    ...typography.modalTitle,
    flex: 1,
    color: colors.text.ivory,
  },
  formScroll: {
    flexGrow: 0,
  },
  formContent: {
    paddingBottom: space.sm,
  },
  fieldLabel: {
    ...typography.eyebrow,
    marginBottom: space.sm,
    color: colors.accent.goldMuted,
  },
  input: {
    ...typography.input,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.sunken,
    color: colors.text.primary,
    paddingHorizontal: space.lg - 2,
    paddingVertical: space.lg - 2,
    marginBottom: space.sm,
  },
  inputError: {
    borderColor: colors.state.burned,
  },
  error: {
    ...typography.captionStrong,
    marginBottom: space.md,
    color: colors.state.burned,
  },
  whenRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.lg,
  },
  whenField: {
    flex: 1,
  },
  whenLabel: {
    ...typography.captionStrong,
    marginBottom: space.xs,
    color: colors.text.muted,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  notifyCopy: {
    flex: 1,
  },
  notifyHint: {
    ...typography.caption,
    marginTop: space.hair,
    color: colors.text.faint,
  },
  chipPressed: {
    opacity: motion.pressOpacity,
    transform: [{ scale: motion.pressScale }],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingBottom: space.xs,
  },
  dimensionChip: {
    width: '48%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.panel,
    paddingVertical: space.md,
    paddingHorizontal: space.sm + 2,
  },
  dimensionChipActive: {
    borderColor: colors.border.cyanStrong,
    backgroundColor: colors.tint.cyanStrong,
  },
  dimensionLabel: {
    ...typography.bodyStrong,
    color: colors.text.muted,
  },
  dimensionLabelActive: {
    color: colors.text.primary,
  },
  actions: {
    marginTop: space.md + 2,
    gap: space.xs,
  },
});
