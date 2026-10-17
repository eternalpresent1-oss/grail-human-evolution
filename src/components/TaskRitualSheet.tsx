import { useCallback, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ModalSheet } from '@/components/ModalSheet';
import { RitualFx, type RitualFxKind } from '@/components/RitualFx';
import { ActionButton } from '@/components/ui/ActionButton';
import { dimensionNameKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, radius, space, typography } from '@/theme';
import { isAtomDueInFuture, isAtomSealed, type AtomizedTask } from '@/types/grail';
import { atomInstruction, atomTitle } from '@/utils/atomContent';
import { localDateKey, parseTypedClock } from '@/utils/taskTime';
import { useGrailStore } from '@/store/useGrailStore';
import { ensureMethodNotificationPermission } from '@/utils/syncMethodNotifications';
import { isExpoGo } from '@/utils/runtimeEnv';

interface TaskRitualSheetProps {
  task: AtomizedTask | null;
  visible: boolean;
  onClose: () => void;
  onAbsorb: (taskId: string) => void;
  onBurn: (taskId: string) => void;
  onRemove: (taskId: string) => void;
}

export function TaskRitualSheet({
  task,
  visible,
  onClose,
  onAbsorb,
  onBurn,
  onRemove,
}: TaskRitualSheetProps): ReactElement | null {
  const t = useTranslator();
  const setTaskNotify = useGrailStore((state) => state.setTaskNotify);
  const liveTask = useGrailStore((state) => {
    if (task === null) {
      return null;
    }

    return state.tasks.find((candidate) => candidate.id === task.id) ?? task;
  });
  const [fxKind, setFxKind] = useState<RitualFxKind | null>(null);
  const [confirmForId, setConfirmForId] = useState<string | null>(null);
  const pendingAction = useRef<RitualFxKind | null>(null);
  const confirmDelete = visible && task !== null && confirmForId === task.id;

  const finishFx = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    setFxKind(null);

    if (task === null || action === null) {
      return;
    }

    if (action === 'absorb') {
      onAbsorb(task.id);
    } else {
      onBurn(task.id);
    }

    onClose();
  }, [onAbsorb, onBurn, onClose, task]);

  if (task === null || liveTask === null) {
    return null;
  }

  const locked = fxKind !== null;
  const deadline = liveTask.timeDeadline;
  const today = localDateKey();
  const sealed = isAtomSealed(liveTask, today);
  const canAbsorb = !sealed && !isAtomDueInFuture(liveTask, today);
  const canBurn = !sealed;
  const canRemove =
    !sealed && liveTask.kind !== 'canon' && liveTask.ritualState === 'pending';
  const canSetCanonTime =
    !sealed && liveTask.kind === 'canon' && liveTask.ritualState === 'pending';
  const canNotifyCustom =
    !sealed &&
    liveTask.kind === 'custom' &&
    liveTask.ritualState === 'pending' &&
    liveTask.timeDeadline !== undefined;

  const startRitual = (kind: RitualFxKind): void => {
    if (locked || sealed) {
      return;
    }

    void Haptics.notificationAsync(
      kind === 'absorb'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
    pendingAction.current = kind;
    setFxKind(kind);
  };

  const dismiss = (): void => {
    setConfirmForId(null);
    onClose();
  };

  if (confirmDelete) {
    return (
      <ModalSheet visible={visible} onClose={dismiss} avoidKeyboard>
        <View style={styles.inner}>
          <Text style={styles.title}>{t('restore.erase.confirm')}</Text>
          <Text style={styles.instruction}>{t('restore.erase.body')}</Text>
          <ActionButton
            label={t('restore.erase.accept')}
            variant="danger"
            onPress={() => {
              setConfirmForId(null);
              onRemove(liveTask.id);
              onClose();
            }}
          />
          <ActionButton
            label={t('common.cancel')}
            variant="ghost"
            onPress={() => setConfirmForId(null)}
          />
        </View>
      </ModalSheet>
    );
  }

  return (
    <ModalSheet visible={visible} onClose={onClose} dismissible={!locked} avoidKeyboard>
      <View style={styles.inner}>
        <Text style={styles.kicker}>{t('ritual.kicker')}</Text>
        <Text style={styles.title}>{atomTitle(liveTask, t)}</Text>
        <Text style={styles.meta}>
          {t(dimensionNameKey(liveTask.dimensionId))}
          {deadline !== undefined && !canSetCanonTime ? ` · ${deadline}` : ''}
        </Text>
        {liveTask.isOverdue ? <Text style={styles.alarm}>{t('ritual.overdue')}</Text> : null}

        {canSetCanonTime ? (
          <CanonScheduleRow
            taskId={liveTask.id}
            notify={liveTask.notify === true}
            {...(liveTask.timeDeadline === undefined ? {} : { timeDeadline: liveTask.timeDeadline })}
          />
        ) : null}

        {canNotifyCustom ? (
          <View style={styles.notifyRow}>
            <Text style={styles.notifyLabel}>{t('create.field.notify')}</Text>
            <Switch
              value={liveTask.notify === true}
              onValueChange={(next) => {
                setTaskNotify(liveTask.id, next);
                if (next && !isExpoGo()) {
                  void ensureMethodNotificationPermission().catch(() => undefined);
                }
                void Haptics.selectionAsync();
              }}
              trackColor={{
                false: colors.surface.sunken,
                true: colors.accent.gold,
              }}
              thumbColor={liveTask.notify === true ? colors.text.ivory : colors.text.muted}
              ios_backgroundColor={colors.surface.sunken}
              accessibilityLabel={t('create.field.notify')}
            />
          </View>
        ) : null}

        <Text style={styles.instruction}>{atomInstruction(liveTask, t)}</Text>

        {sealed ? <Text style={styles.sealed}>{t('ritual.sealed')}</Text> : null}

        {canAbsorb ? (
          <ActionButton
            label={t('ritual.absorb')}
            onPress={() => startRitual('absorb')}
            disabled={locked}
          />
        ) : null}

        {canBurn ? (
          <ActionButton
            label={t('ritual.burn')}
            variant="danger"
            onPress={() => startRitual('burn')}
            disabled={locked}
            style={styles.burn}
          />
        ) : null}

        {canRemove ? (
          <ActionButton
            label={t('restore.erase.action')}
            variant="ghost"
            sound="deny"
            onPress={() => setConfirmForId(liveTask.id)}
            disabled={locked}
          />
        ) : null}

        <ActionButton
          label={t('common.close')}
          variant="ghost"
          onPress={onClose}
          disabled={locked}
        />
      </View>

      {fxKind !== null ? <RitualFx kind={fxKind} onFinished={finishFx} /> : null}
    </ModalSheet>
  );
}

function CanonScheduleRow({
  taskId,
  timeDeadline,
  notify,
}: {
  taskId: string;
  timeDeadline?: string;
  notify: boolean;
}): ReactElement {
  const t = useTranslator();
  const setTaskDeadline = useGrailStore((state) => state.setTaskDeadline);
  const setTaskNotify = useGrailStore((state) => state.setTaskNotify);
  const [draft, setDraft] = useState(timeDeadline ?? '');
  const [error, setError] = useState<string | null>(null);
  const [trackedDeadline, setTrackedDeadline] = useState(timeDeadline);

  if (timeDeadline !== trackedDeadline) {
    setTrackedDeadline(timeDeadline);
    setDraft(timeDeadline ?? '');
  }

  const commitTime = (): string | undefined | null => {
    const clock = parseTypedClock(draft);
    if (clock === null) {
      setError(t('create.field.time.error'));
      return null;
    }

    setError(null);
    setTaskDeadline(taskId, clock);
    if (clock !== undefined) {
      setDraft(clock);
    }
    return clock;
  };

  return (
    <View style={styles.canonBlock}>
      <View style={styles.canonRow}>
        <View style={styles.canonTime}>
          <TextInput
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              if (error !== null) {
                setError(null);
              }
            }}
            onEndEditing={() => {
              commitTime();
            }}
            onBlur={() => {
              commitTime();
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
        <View style={styles.canonSignal}>
          <Text style={styles.notifyLabel}>{t('create.field.notify')}</Text>
          <Switch
            value={notify}
            onValueChange={(next) => {
              const clock = commitTime();
              if (next && (clock === null || clock === undefined)) {
                return;
              }

              setTaskNotify(taskId, next);
              if (next && !isExpoGo()) {
                void ensureMethodNotificationPermission().catch(() => undefined);
              }
              void Haptics.selectionAsync();
            }}
            trackColor={{
              false: colors.surface.sunken,
              true: colors.accent.gold,
            }}
            thumbColor={notify ? colors.text.ivory : colors.text.muted}
            ios_backgroundColor={colors.surface.sunken}
            accessibilityLabel={t('create.field.notify')}
          />
        </View>
      </View>
      {error !== null ? <Text style={styles.timeError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: space.xl,
    paddingTop: space.xxl - 2,
    paddingBottom: space.md,
  },
  kicker: {
    ...typography.kicker,
    color: colors.accent.cyanMuted,
  },
  title: {
    ...typography.modalTitle,
    marginTop: space.sm,
    color: colors.text.ivory,
  },
  meta: {
    ...typography.caption,
    marginTop: space.snug,
    color: colors.text.muted,
  },
  alarm: {
    ...typography.captionStrong,
    marginTop: space.sm,
    color: colors.state.danger,
  },
  input: {
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.sunken,
    color: colors.text.primary,
    paddingHorizontal: space.lg - 2,
    paddingVertical: space.md + 2,
  },
  timeError: {
    ...typography.captionStrong,
    color: colors.state.danger,
  },
  canonBlock: {
    marginTop: space.md,
    gap: space.xs,
  },
  canonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  canonTime: {
    flex: 1,
  },
  canonSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.md,
  },
  notifyLabel: {
    ...typography.labelLg,
    color: colors.text.ivory,
  },
  instruction: {
    ...typography.bodyLead,
    marginTop: space.lg,
    marginBottom: space.xxl - 2,
    color: colors.text.primary,
    opacity: 0.86,
  },
  sealed: {
    ...typography.bodyLead,
    marginBottom: space.lg,
    color: colors.text.muted,
  },
  burn: {
    marginTop: space.sm,
  },
});
