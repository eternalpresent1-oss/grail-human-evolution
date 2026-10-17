import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  apiBaseUrl,
  currentAccountSession,
  rememberAccountSession,
  restoreAccountSession,
} from '@/api/accountSession';
import { createArcheClient, type AccountSession } from '@/api/archeClient';
import { GlassPanel } from '@/components/GlassPanel';
import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, radius, space, typography } from '@/theme';

export function AccountSection(): ReactElement | null {
  const t = useTranslator();
  const baseUrl = apiBaseUrl();
  const [session, setSession] = useState<AccountSession | null>(currentAccountSession);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void restoreAccountSession().then(setSession);
  }, []);

  if (baseUrl.length === 0) {
    return null;
  }

  const clearSession = (): void => {
    rememberAccountSession(null);
    setSession(null);
  };

  const onDelete = (): void => {
    if (session === null) {
      return;
    }
    setBusy(true);
    void createArcheClient(baseUrl)
      .deleteAccount(session.token)
      .then(() => {
        clearSession();
        setConfirmDelete(false);
      })
      .catch(() => setNotice(t('settings.account.failed')))
      .finally(() => setBusy(false));
  };

  return (
    <GlassPanel style={styles.section} intensity={34}>
      <Text style={styles.title}>{t('settings.account.title')}</Text>
      {notice === null ? null : <Text style={styles.notice}>{notice}</Text>}
      <View style={styles.body}>
        {session === null ? (
          <>
            <ActionButton
              label={t('settings.account.apple')}
              variant="outline"
              onPress={() => setNotice(t('settings.account.unavailable'))}
            />
            <ActionButton
              label={t('settings.account.google')}
              variant="outline"
              onPress={() => setNotice(t('settings.account.unavailable'))}
            />
          </>
        ) : (
          <>
            <ActionButton
              label={t('settings.account.out')}
              variant="ghost"
              onPress={() => {
                void createArcheClient(baseUrl).signOut(session.token).finally(clearSession);
              }}
            />
            <ActionButton
              label={t('settings.account.delete')}
              variant="danger"
              onPress={() => setConfirmDelete(true)}
            />
          </>
        )}
      </View>
      <ModalSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} align="center">
        <View style={styles.confirm}>
          <Text style={styles.title}>{t('settings.account.delete.title')}</Text>
          <Text style={styles.notice}>{t('settings.account.delete.body')}</Text>
          <ActionButton label={t('settings.account.delete.accept')} variant="danger" busy={busy} onPress={onDelete} />
          <ActionButton
            label={t('settings.reset.confirm.dismiss')}
            variant="ghost"
            onPress={() => setConfirmDelete(false)}
          />
        </View>
      </ModalSheet>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl, borderRadius: radius.xl, padding: space.lg },
  title: { ...typography.heading, color: colors.text.ivory },
  notice: { ...typography.caption, marginTop: space.snug, color: colors.text.faint },
  body: { marginTop: space.lg, gap: space.sm },
  confirm: { gap: space.md },
});
