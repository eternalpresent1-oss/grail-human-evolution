import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  clearGoogleAccountSession,
  connectGoogleAccount,
} from '@/api/connectGoogleAccount';
import {
  apiBaseUrl,
  rememberAccountSession,
  restoreAccountSession,
  useAccountSession,
} from '@/api/accountSession';
import { createArcheClient } from '@/api/archeClient';
import { signOutGoogle } from '@/api/googleSignIn';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { GlassPanel } from '@/components/GlassPanel';
import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { useGrailStore } from '@/store/useGrailStore';
import { colors, radius, space, typography } from '@/theme';

export function AccountSection(): ReactElement | null {
  const t = useTranslator();
  const router = useRouter();
  const baseUrl = apiBaseUrl();
  const session = useAccountSession();
  const resetAllData = useGrailStore((state) => state.resetAllData);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void restoreAccountSession();
  }, []);

  if (baseUrl.length === 0) {
    return null;
  }

  /** Close settings modal if open, then force the login screen. */
  const goToLogin = (): void => {
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/onboarding');
  };

  const onGoogle = (): void => {
    setBusy(true);
    void connectGoogleAccount().finally(() => setBusy(false));
  };

  const onSignOut = (): void => {
    if (session === null) {
      return;
    }
    setBusy(true);
    void clearGoogleAccountSession(session.token).finally(() => {
      setBusy(false);
      goToLogin();
    });
  };

  const onDelete = (): void => {
    if (session === null) {
      return;
    }
    const token = session.token;
    setBusy(true);
    void createArcheClient(baseUrl)
      .deleteAccount(token)
      .then(async () => {
        await signOutGoogle().catch(() => undefined);
        rememberAccountSession(null);
        // Account delete wipes the phone copy too — next sign-in must redo who + survey.
        resetAllData();
        setConfirmDelete(false);
        goToLogin();
      })
      .finally(() => setBusy(false));
  };

  return (
    <GlassPanel style={styles.section} intensity={34}>
      <Text style={styles.title}>{t('settings.account.title')}</Text>
      <View style={styles.body}>
        {session === null ? (
          <GoogleSignInButton busy={busy} onPress={onGoogle} />
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
            label={t('settings.account.delete.dismiss')}
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
