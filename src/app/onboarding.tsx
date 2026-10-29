import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LifeSurveyForm } from '@/app/survey';
import { needsAccountSignIn } from '@/api/accountGate';
import { connectGoogleAccount } from '@/api/connectGoogleAccount';
import { restoreAccountSession, useAccountSession } from '@/api/accountSession';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { KeyboardInsetScrollView } from '@/components/KeyboardInsetScrollView';
import { ActionButton } from '@/components/ui/ActionButton';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { useGrailStore } from '@/store/useGrailStore';
import {
  colors,
  gradients,
  gradientStops,
  layout,
  radius,
  space,
  typography,
} from '@/theme';
import {
  formatBirthDate,
  isPlausibleBirthDate,
  parseBirthDate,
  type BirthDateParts,
} from '@/utils/birthDate';
import { DRIVE_LINE_MAX, sanitizeDriveLine } from '@/utils/driveLine';
import { needsFirstRunGate } from '@/utils/firstRun';
import { profileAge } from '@/utils/profile';

const YEAR_LENGTH = 4;
const DAY_MONTH_LENGTH = 2;
const mark = require('../../assets/mark.png') as number;

type OnboardingStep = 'login' | 'who' | 'survey';

function initialStep(): OnboardingStep {
  if (needsAccountSignIn()) {
    return 'login';
  }
  return 'who';
}

export default function OnboardingScreen(): ReactElement {
  const session = useAccountSession();
  const surveyApplied = useGrailStore((state) => state.surveyApplied);
  const profile = useGrailStore((state) => state.profile);
  const gated = needsFirstRunGate({ surveyApplied, profile });
  const needLogin = needsAccountSignIn(session);
  const [inFlow, setInFlow] = useState(needLogin || gated);

  if (!needLogin && !gated && !inFlow) {
    return <Redirect href="/atomizer" />;
  }

  return (
    <OnboardingFlow
      onFinished={() => {
        setInFlow(false);
      }}
    />
  );
}

function OnboardingFlow({ onFinished }: { onFinished: () => void }): ReactElement {
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const router = useRouter();

  const enterApp = (): void => {
    onFinished();
    router.replace('/atomizer');
  };

  const afterSignIn = (): void => {
    const state = useGrailStore.getState();
    if (needsFirstRunGate({ surveyApplied: state.surveyApplied, profile: state.profile })) {
      setStep('who');
      return;
    }
    enterApp();
  };

  if (step === 'login') {
    return <LoginStep onSignedIn={afterSignIn} />;
  }

  if (step === 'survey') {
    return (
      <LifeSurveyForm
        locked
        onApplied={() => {
          enterApp();
        }}
      />
    );
  }

  return <WhoStep onNext={() => setStep('survey')} />;
}

function LoginStep({ onSignedIn }: { onSignedIn: () => void }): ReactElement {
  const t = useTranslator();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const onGoogle = (): void => {
    setBusy(true);
    void restoreAccountSession()
      .then(() => connectGoogleAccount())
      .then((result) => {
        if (result.ok) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSignedIn();
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.screenGrail}
        locations={gradientStops.screenGrail}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.loginBody,
          {
            paddingTop: Math.max(insets.top, layout.screenTopMin) + space.xxl,
            paddingBottom: insets.bottom + space.xxl,
          },
        ]}
      >
        <View style={styles.loginCenter}>
          <View style={styles.loginBrand}>
            <Image source={mark} style={styles.loginMark} resizeMode="contain" />
            <Text style={styles.loginTitle}>{t('onboarding.title')}</Text>
            <Text style={styles.loginSubtitle}>{t('onboarding.subtitle')}</Text>
          </View>
          <View style={styles.loginActions}>
            <GoogleSignInButton busy={busy} onPress={onGoogle} />
          </View>
        </View>
      </View>
    </View>
  );
}

function WhoStep({ onNext }: { onNext: () => void }): ReactElement {
  const t = useTranslator();
  const insets = useSafeAreaInsets();
  const profile = useGrailStore((state) => state.profile);
  const driveLine = useGrailStore((state) => state.driveLine);
  const setName = useGrailStore((state) => state.setName);
  const setBirthDate = useGrailStore((state) => state.setBirthDate);
  const setDriveLine = useGrailStore((state) => state.setDriveLine);

  const stored = parseBirthDate(profile.birthDate);
  const [name, setNameDraft] = useState(profile.name);
  const [driveDraft, setDriveDraft] = useState(driveLine);
  const [day, setDay] = useState(
    stored === null || profile.isBirthDateApproximate
      ? ''
      : String(stored.day).padStart(DAY_MONTH_LENGTH, '0'),
  );
  const [month, setMonth] = useState(
    stored === null || profile.isBirthDateApproximate
      ? ''
      : String(stored.month).padStart(DAY_MONTH_LENGTH, '0'),
  );
  const [year, setYear] = useState(
    stored === null || profile.isBirthDateApproximate ? '' : String(stored.year),
  );
  const [dateInvalid, setDateInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commitDate = (next: { day: string; month: string; year: string }): BirthDateParts | null => {
    if (
      next.day.length < DAY_MONTH_LENGTH ||
      next.month.length < DAY_MONTH_LENGTH ||
      next.year.length < YEAR_LENGTH
    ) {
      setDateInvalid(false);
      return null;
    }

    const parts: BirthDateParts = {
      year: Number(next.year),
      month: Number(next.month),
      day: Number(next.day),
    };

    if (!isPlausibleBirthDate(parts)) {
      setDateInvalid(true);
      return null;
    }

    setDateInvalid(false);
    setBirthDate(formatBirthDate(parts));
    return parts;
  };

  const onContinue = (): void => {
    const trimmedName = name.trim();
    const drive = sanitizeDriveLine(driveDraft);
    const born = commitDate({ day, month, year });

    if (trimmedName.length === 0 || born === null) {
      setError(t('onboarding.who.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (drive.length === 0) {
      setError(t('onboarding.drive.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setName(trimmedName);
    setDriveLine(drive);
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.screenGrail}
        locations={gradientStops.screenGrail}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardInsetScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, layout.screenTopMin),
            paddingBottom: insets.bottom + space.xxl,
          },
        ]}
      >
        <View style={styles.poster}>
          <Text style={styles.posterTitle}>{t('onboarding.title')}</Text>
          <Text style={styles.posterSubtitle}>{t('onboarding.subtitle')}</Text>
        </View>

        <Text style={styles.fieldLabel}>{t('settings.data.name')}</Text>
        <TextInput
          value={name}
          onChangeText={(value) => {
            setNameDraft(value);
            if (error !== null) {
              setError(null);
            }
          }}
          placeholder={t('settings.data.name.placeholder')}
          placeholderTextColor={colors.text.faint}
          style={styles.input}
          accessibilityLabel={t('settings.data.name')}
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>{t('settings.data.birth')}</Text>
        <View style={styles.dateRow}>
          <TextInput
            value={day}
            onChangeText={(value) => {
              const next = value.replace(/\D/g, '').slice(0, DAY_MONTH_LENGTH);
              setDay(next);
              commitDate({ day: next, month, year });
            }}
            placeholder={t('settings.data.birth.day')}
            placeholderTextColor={colors.text.faint}
            keyboardType="number-pad"
            maxLength={DAY_MONTH_LENGTH}
            style={[styles.input, styles.dateField]}
            accessibilityLabel={t('settings.data.birth.day')}
          />
          <TextInput
            value={month}
            onChangeText={(value) => {
              const next = value.replace(/\D/g, '').slice(0, DAY_MONTH_LENGTH);
              setMonth(next);
              commitDate({ day, month: next, year });
            }}
            placeholder={t('settings.data.birth.month')}
            placeholderTextColor={colors.text.faint}
            keyboardType="number-pad"
            maxLength={DAY_MONTH_LENGTH}
            style={[styles.input, styles.dateField]}
            accessibilityLabel={t('settings.data.birth.month')}
          />
          <TextInput
            value={year}
            onChangeText={(value) => {
              const next = value.replace(/\D/g, '').slice(0, YEAR_LENGTH);
              setYear(next);
              commitDate({ day, month, year: next });
            }}
            placeholder={t('settings.data.birth.year')}
            placeholderTextColor={colors.text.faint}
            keyboardType="number-pad"
            maxLength={YEAR_LENGTH}
            style={[styles.input, styles.dateFieldWide]}
            accessibilityLabel={t('settings.data.birth.year')}
          />
        </View>
        {dateInvalid ? (
          <Text style={styles.error}>{t('settings.data.birth.invalid')}</Text>
        ) : year.length === YEAR_LENGTH ? (
          <Text style={styles.age}>{t.plural('settings.data.age', profileAge(profile))}</Text>
        ) : null}

        <Text style={styles.fieldLabel}>{t('settings.data.drive')}</Text>
        <TextInput
          value={driveDraft}
          onChangeText={(value) => {
            setDriveDraft(value);
            if (error !== null) {
              setError(null);
            }
          }}
          placeholder={t('settings.data.drive.placeholder')}
          placeholderTextColor={colors.text.faint}
          style={[styles.input, styles.driveInput]}
          accessibilityLabel={t('settings.data.drive')}
          multiline
          maxLength={DRIVE_LINE_MAX}
          textAlignVertical="top"
        />

        {error !== null ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <ActionButton label={t('onboarding.next')} tone="gold" onPress={onContinue} />
        </View>
      </KeyboardInsetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.void,
  },
  content: {
    paddingHorizontal: layout.screenX,
  },
  loginBody: {
    flex: 1,
    paddingHorizontal: layout.screenX,
    justifyContent: 'center',
  },
  loginCenter: {
    width: '100%',
    alignItems: 'stretch',
    gap: space.xxxl + space.xl,
    marginBottom: space.xxxl,
  },
  loginBrand: {
    alignItems: 'center',
  },
  loginMark: {
    width: 96,
    height: 96,
    marginBottom: space.lg,
    backgroundColor: 'transparent',
  },
  loginTitle: {
    ...typography.wordmark,
    fontSize: 36,
    lineHeight: 42,
    color: colors.accent.gold,
    textAlign: 'center',
  },
  loginSubtitle: {
    ...typography.wordmark,
    marginTop: space.sm,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
    color: colors.accent.goldMuted,
    textAlign: 'center',
  },
  loginActions: {
    width: '100%',
  },
  poster: {
    alignItems: 'center',
    marginBottom: space.sm,
  },
  posterTitle: {
    ...typography.wordmark,
    color: colors.accent.gold,
    textAlign: 'center',
  },
  posterSubtitle: {
    ...typography.wordmark,
    marginTop: space.sm,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.4,
    color: colors.accent.goldMuted,
    textAlign: 'center',
  },
  fieldLabel: {
    ...typography.eyebrow,
    marginTop: space.xl,
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
  },
  dateRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  dateField: {
    flex: 1,
    textAlign: 'center',
  },
  dateFieldWide: {
    flex: 1.4,
    textAlign: 'center',
  },
  driveInput: {
    minHeight: 88,
  },
  error: {
    ...typography.captionStrong,
    marginTop: space.sm,
    color: colors.state.burned,
  },
  age: {
    ...typography.caption,
    marginTop: space.sm,
    color: colors.text.faint,
  },
  actions: {
    marginTop: space.xxl,
  },
});
