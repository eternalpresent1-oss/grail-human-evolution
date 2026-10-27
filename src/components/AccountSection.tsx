import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  clearGoogleAccountSession,
  connectGoogleAccount,
} from '@/api/connectGoogleAccount';
import {
  apiBaseUrl,
  currentAccountSession,
  rememberAccountSession,
  restoreAccountSession,
} from '@/api/accountSession';
import { createArcheClient, type AccountSession } from '@/api/archeClient';
import { signOutGoogle } from '@/api/googleSignIn';
import { GlassPanel } from '@/components/GlassPanel';
import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, radius, space, typography } from '@/theme';

export function AccountSection(): ReactElement | null {
  const t = useTranslator();
  const baseUrl = apiBaseUrl();
  const [session, setSession] = useState<AccountSession | null>(currentAccountSession);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void restoreAccountSession().then(setSession);
  }, []);

  if (baseUrl.length === 0) {
    return null;
  }

  const onGoogle = (): void => {
    setBusy(true);
    void connectGoogleAccount()
      .then((result) => {
        if (result.ok) {
          setSession(currentAccountSession());
        }
      })
      .finally(() => setBusy(false));
  };

  const onSignOut = (): void => {
    if (session === null) {
      return;
    }
    setBusy(true);
    void clearGoogleAccountSession(session.token).finally(() => {
      setSession(null);
      setBusy(false);
    });
  };

  const onDelete = (): void => {
    if (session === null) {
      return;
    }
    setBusy(true);
    void createArcheClient(baseUrl)
      .deleteAccount(session.token)
      .then(async () => {
        await signOutGoogle();
        rememberAccountSession(null);
        setSession(null);
        setConfirmDelete(false);
      })
      .finally(() => setBusy(false));
  };

  return (
    <GlassPanel style={styles.section} intensity={34}>
      <Text style={styles.title}>{t('settings.account.title')}</Text>
      <View style={styles.body}>
        {session === null ? (
          <ActionButton
            label={t('settings.account.google')}
            variant="outline"
            busy={busy}
            onPress={onGoogle}
          />
        ) : (
          <>
            <ActionButton
              label={t('settings.account.out')}
              variant="ghost"
              busy={busy}
              onPress={onSignOut}
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
          <ActionButton
            label={t('settings.account.delete.accept')}
            variant="danger"
            busy={busy}
            onPress={onDelete}
          />
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
