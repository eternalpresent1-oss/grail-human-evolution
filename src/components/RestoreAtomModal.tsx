import { useState, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { dimensionNameKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, space, typography } from '@/theme';
import { isAtomSealed, type AtomizedTask } from '@/types/grail';
import { atomTitle } from '@/utils/atomContent';
import { localDateKey } from '@/utils/taskTime';

interface RestoreAtomModalProps {
  task: AtomizedTask | null;
  visible: boolean;
  onClose: () => void;
  onRestore: (taskId: string) => void;
  onErase: (taskId: string) => void;
}

export function RestoreAtomModal({
  task,
  visible,
  onClose,
  onRestore,
  onErase,
}: RestoreAtomModalProps): ReactElement | null {
  const t = useTranslator();
  const [confirmErase, setConfirmErase] = useState(false);
  const taskId = task?.id;
  const [trackedId, setTrackedId] = useState(taskId);
  const [trackedVisible, setTrackedVisible] = useState(visible);

  if (taskId !== trackedId || visible !== trackedVisible) {
    setTrackedId(taskId);
    setTrackedVisible(visible);
    setConfirmErase(false);
  }

  if (task === null) {
    return null;
  }

  const canErase = task.kind !== 'canon';
  const sealed = isAtomSealed(task, localDateKey());
  const body =
    task.ritualState === 'burned' ? 'restore.body.burned' : 'restore.body.absorbed';

  return (
    <ModalSheet visible={visible} onClose={onClose} align="center">
      <View style={styles.inner}>
        {confirmErase ? (
          <>
            <Text style={styles.title}>{t('restore.erase.confirm')}</Text>
            <Text style={styles.body}>{t('restore.erase.body')}</Text>
            <View style={styles.actions}>
              <ActionButton
                label={t('restore.erase.accept')}
                variant="danger"
                onPress={() => {
                  onErase(task.id);
                  onClose();
                }}
              />
              <ActionButton
                label={t('common.cancel')}
                variant="ghost"
                onPress={() => setConfirmErase(false)}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.kicker}>{t('restore.kicker')}</Text>
            <Text style={styles.title}>{t('restore.title')}</Text>
            <Text style={styles.body}>
              {t(sealed ? 'ritual.sealed' : body, {
                title: atomTitle(task, t),
                dimension: t(dimensionNameKey(task.dimensionId)),
              })}
            </Text>

            <View style={styles.actions}>
              {sealed ? null : (
                <>
                  <ActionButton
                    label={t('restore.title')}
                    tone="cool"
                    onPress={() => {
                      onRestore(task.id);
                      onClose();
                    }}
                  />
                  {canErase ? (
                    <ActionButton
                      label={t('restore.erase.action')}
                      variant="danger"
                      onPress={() => setConfirmErase(true)}
                    />
                  ) : null}
                </>
              )}

              <ActionButton label={t('restore.dismiss')} variant="ghost" onPress={onClose} />
            </View>
          </>
        )}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: space.xl,
    paddingTop: space.xxl - 2,
    paddingBottom: space.sm,
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
  body: {
    ...typography.bodyLead,
    marginTop: space.md,
    marginBottom: space.xl,
    color: colors.text.muted,
  },
  actions: {
    gap: space.sm,
  },
});
