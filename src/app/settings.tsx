import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountSection } from '@/components/AccountSection';
import { GlassPanel } from '@/components/GlassPanel';
import { KeyboardInsetScrollView } from '@/components/KeyboardInsetScrollView';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { type Translator } from '@/i18n';
import { useGrailStore } from '@/store/useGrailStore';
import {
  colors,
  gradients,
  gradientStops,
  layout,
  motion,
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
import { surveyProgress } from '@/utils/lifeSurvey';
import { DRIVE_LINE_MAX } from '@/utils/driveLine';
import { MAX_METHOD_SIGNAL_NOTE, MAX_METHOD_SIGNALS } from '@/types/methodSignals';
import { createMethodSignalId } from '@/utils/ids';
import {
  defaultSignalStamp,
  methodSignalFireAt,
  sanitizeMethodSignals,
  sanitizeSignalNote,
} from '@/utils/methodSignals';
import { formatEuropeanDate, parseIsoDateKey, parseTypedClock } from '@/utils/taskTime';
import { profileAge } from '@/utils/profile';
import { isExpoGo } from '@/utils/runtimeEnv';
import { setAmbientPlaying } from '@/utils/grailSound';
import { ensureMethodNotificationPermission } from '@/utils/syncMethodNotifications';

const YEAR_LENGTH = 4;
const DAY_MONTH_LENGTH = 2;

function askNotificationPermission(setError: (message: string) => void, t: Translator): void {
  void ensureMethodNotificationPermission()
    .then((granted) => {
      if (!granted && !isExpoGo()) {
        setError(t('settings.signals.denied'));
      }
    })
    .catch(() => {
      if (!isExpoGo()) {
        setError(t('settings.signals.denied'));
      }
    });
}

/**
 * Presented modally over the tabs by the root stack. Sections are independent
 * blocks, so the life-experience questionnaire can drop in as a fourth one.
 */
export default function SettingsScreen(): ReactElement {
  const t = useTranslator();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.screenGrail}
        locations={gradientStops.screenGrail}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardInsetScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, layout.screenTopMin),
            paddingBottom: space.xxxl + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={t('settings.title')}
          tone="gold"
          actions={
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.closeLabel}>✕</Text>
            </Pressable>
          }
        />

        <MethodSection />
        <SoundSection />
        <ProfileSection />
        <SurveySection />
        <AccountSection />
      </KeyboardInsetScrollView>
    </View>
  );
}

function SoundSection(): ReactElement {
  const t = useTranslator();
  const soundEnabled = useGrailStore((state) => state.soundEnabled);
  const setSoundEnabled = useGrailStore((state) => state.setSoundEnabled);

  return (
    <GlassPanel style={styles.section} intensity={34}>
      <View style={styles.signalSwitchRow}>
        <Text style={styles.sectionTitle}>{t('settings.sound.title')}</Text>
        <Switch
          value={soundEnabled}
          onValueChange={(next) => {
            setSoundEnabled(next);
            void setAmbientPlaying(next);
            void Haptics.selectionAsync();
          }}
          trackColor={{
            false: colors.surface.sunken,
            true: colors.accent.gold,
          }}
          thumbColor={colors.text.ivory}
          accessibilityLabel={t('settings.sound.title')}
        />
      </View>
    </GlassPanel>
  );
}

function MethodSection(): ReactElement {
  const t = useTranslator();
  const methodSignals = useGrailStore((state) => state.methodSignals);
  const setMethodSignals = useGrailStore((state) => state.setMethodSignals);
  const [error, setError] = useState<string | null>(null);

  const patchSignals = (next: typeof methodSignals): void => {
    setMethodSignals(sanitizeMethodSignals(next));
  };

  const setMasterEnabled = (enabled: boolean): void => {
    const current = useGrailStore.getState().methodSignals;
    patchSignals({ ...current, enabled });
    void Haptics.selectionAsync();
    if (enabled) {
      askNotificationPermission(setError, t);
    }
  };

  const setDailyEnabled = (enabled: boolean): void => {
    const current = useGrailStore.getState().methodSignals;
    patchSignals({
      ...current,
      daily: { ...current.daily, enabled },
    });
    void Haptics.selectionAsync();

    if (enabled) {
      askNotificationPermission(setError, t);
    }
  };

  const updateDailyTime = (draft: string): boolean => {
    const time = parseTypedClock(draft);

    if (time === null || time === undefined) {
      setError(t('settings.signals.time.error'));
      return false;
    }

    const current = useGrailStore.getState().methodSignals;
    setError(null);
    patchSignals({
      ...current,
      daily: { ...current.daily, time },
    });
    return true;
  };

  const addSignal = (): void => {
    const current = useGrailStore.getState().methodSignals;
    if (current.items.length >= MAX_METHOD_SIGNALS) {
      return;
    }

    const stamp = defaultSignalStamp();
    patchSignals({
      ...current,
      enabled: true,
      items: [
        ...current.items,
        { id: createMethodSignalId(), date: stamp.date, time: stamp.time, note: '', enabled: true },
      ],
    });
    void Haptics.selectionAsync();
    askNotificationPermission(setError, t);
  };

  const updateSignal = (id: string, draft: { date: string; time: string; note: string }): boolean => {
    const date = parseIsoDateKey(draft.date);
    const time = parseTypedClock(draft.time);

    if (date === null) {
      setError(t('settings.signals.date.error'));
      return false;
    }

    if (time === null || time === undefined) {
      setError(t('settings.signals.time.error'));
      return false;
    }

    const current = useGrailStore.getState().methodSignals;
    setError(null);
    patchSignals({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, date, time, note: sanitizeSignalNote(draft.note) } : item,
      ),
    });
    return true;
  };

  const setSignalEnabled = (id: string, enabled: boolean): void => {
    const current = useGrailStore.getState().methodSignals;
    patchSignals({
      ...current,
      ...(enabled ? { enabled: true } : {}),
      items: current.items.map((item) => (item.id === id ? { ...item, enabled } : item)),
    });
    void Haptics.selectionAsync();

    if (enabled) {
      askNotificationPermission(setError, t);
    }
  };

  const removeSignal = (id: string): void => {
    const current = useGrailStore.getState().methodSignals;
    patchSignals({
      ...current,
      items: current.items.filter((item) => item.id !== id),
    });
  };

  return (
    <Section
      title={t('settings.signals.title')}
      trailing={
        <Switch
          value={methodSignals.enabled}
          onValueChange={setMasterEnabled}
          trackColor={{
            false: colors.surface.sunken,
            true: colors.accent.gold,
          }}
          thumbColor={colors.text.ivory}
          accessibilityLabel={t('settings.signals.master.a11y')}
        />
      }
      hint={t('settings.signals.hint')}
    >
      <DailySignalEditor
        time={methodSignals.daily.time}
        enabled={methodSignals.daily.enabled}
        onCommitTime={(time) => updateDailyTime(time)}
        onToggle={(next) => setDailyEnabled(next)}
      />

      {methodSignals.items.map((item) => (
        <SignalEditor
          key={item.id}
          date={item.date}
          time={item.time}
          note={item.note}
          enabled={item.enabled}
          onCommit={(draft) => updateSignal(item.id, draft)}
          onToggle={(next) => setSignalEnabled(item.id, next)}
          onRemove={() => removeSignal(item.id)}
        />
      ))}

      {error !== null ? <Text style={styles.error}>{error}</Text> : null}

      {methodSignals.items.length < MAX_METHOD_SIGNALS ? (
      <ActionButton
        label={t('settings.signals.add')}
        variant="outline"
        sound="confirm"
        onPress={addSignal}
      />
      ) : null}
    </Section>
  );
}

function signalIsPast(date: string, time: string): boolean {
  const fireAt = methodSignalFireAt(date, time);
  return fireAt !== null && fireAt.getTime() <= Date.now();
}

function DailySignalEditor({
  time,
  enabled,
  onCommitTime,
  onToggle,
}: {
  time: string;
  enabled: boolean;
  onCommitTime: (time: string) => boolean;
  onToggle: (enabled: boolean) => void;
}): ReactElement {
  const t = useTranslator();
  const [timeDraft, setTimeDraft] = useState(time);
  const [savedTime, setSavedTime] = useState(time);
  if (time !== savedTime) {
    setSavedTime(time);
    setTimeDraft(time);
  }
  const timeDraftRef = useRef(timeDraft);
  const onCommitTimeRef = useRef(onCommitTime);

  useEffect(() => {
    timeDraftRef.current = timeDraft;
    onCommitTimeRef.current = onCommitTime;
  }, [timeDraft, onCommitTime]);

  useEffect(() => {
    return () => {
      onCommitTimeRef.current(timeDraftRef.current);
    };
  }, []);

  const commit = (): void => {
    const saved = onCommitTime(timeDraft);
    if (!saved) {
      return;
    }

    const nextTime = parseTypedClock(timeDraft);
    if (typeof nextTime === 'string') {
      timeDraftRef.current = nextTime;
      setTimeDraft(nextTime);
    }
  };

  return (
    <View style={styles.signalCard}>
      <View style={styles.signalSwitchRow}>
        <Text style={[styles.signalSwitchLabel, styles.sectionTitleGrow]}>
          {t('settings.signals.daily.title')}
        </Text>
        <Switch
          value={enabled === true}
          onValueChange={(next) => {
            commit();
            onToggle(next);
          }}
          trackColor={{
            false: colors.surface.sunken,
            true: colors.accent.gold,
          }}
          thumbColor={enabled ? colors.text.ivory : colors.text.muted}
          ios_backgroundColor={colors.surface.sunken}
          accessibilityLabel={t('settings.signals.daily.a11y')}
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>{t('settings.signals.time')}</Text>
        <TextInput
          value={timeDraft}
          onChangeText={(value) => {
            timeDraftRef.current = value;
            setTimeDraft(value);
          }}
          onEndEditing={commit}
          onBlur={commit}
          placeholder={t('create.field.time.placeholder')}
          placeholderTextColor={colors.text.faint}
          style={styles.input}
          accessibilityLabel={t('settings.signals.time')}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

function SignalEditor({
  date,
  time,
  note,
  enabled,
  onCommit,
  onToggle,
  onRemove,
}: {
  date: string;
  time: string;
  note: string;
  enabled: boolean;
  onCommit: (draft: { date: string; time: string; note: string }) => boolean;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}): ReactElement {
  const t = useTranslator();
  const [dateDraft, setDateDraft] = useState(() => formatEuropeanDate(date));
  const [timeDraft, setTimeDraft] = useState(time);
  const [noteDraft, setNoteDraft] = useState(note);
  const [saved, setSaved] = useState({ date, time, note });
  if (date !== saved.date || time !== saved.time || note !== saved.note) {
    setSaved({ date, time, note });
    setDateDraft(formatEuropeanDate(date));
    setTimeDraft(time);
    setNoteDraft(note);
  }
  const dateDraftRef = useRef(dateDraft);
  const timeDraftRef = useRef(timeDraft);
  const noteDraftRef = useRef(noteDraft);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    dateDraftRef.current = dateDraft;
    timeDraftRef.current = timeDraft;
    noteDraftRef.current = noteDraft;
    onCommitRef.current = onCommit;
  }, [dateDraft, timeDraft, noteDraft, onCommit]);

  useEffect(() => {
    return () => {
      onCommitRef.current({
        date: dateDraftRef.current,
        time: timeDraftRef.current,
        note: noteDraftRef.current,
      });
    };
  }, []);

  const commit = (): void => {
    const savedDraft = onCommit({ date: dateDraft, time: timeDraft, note: noteDraft });
    if (!savedDraft) {
      return;
    }

    const nextDate = parseIsoDateKey(dateDraft);
    const nextTime = parseTypedClock(timeDraft);
    if (nextDate !== null) {
      const formatted = formatEuropeanDate(nextDate);
      dateDraftRef.current = formatted;
      setDateDraft(formatted);
    }
    if (typeof nextTime === 'string') {
      timeDraftRef.current = nextTime;
      setTimeDraft(nextTime);
    }
    const nextNote = sanitizeSignalNote(noteDraft);
    noteDraftRef.current = nextNote;
    setNoteDraft(nextNote);
  };

  const isPast = signalIsPast(date, time);

  return (
    <View style={styles.signalCard}>
      <Text style={styles.signalItemHint}>{t('settings.signals.item.hint')}</Text>
      <View style={styles.signalSwitchRow}>
        <Text style={styles.signalSwitchLabel}>
          {enabled ? t('settings.signals.on') : t('settings.signals.off')}
        </Text>
        <Switch
          value={enabled === true}
          onValueChange={(next) => {
            commit();
            onToggle(next);
          }}
          trackColor={{
            false: colors.surface.sunken,
            true: colors.accent.gold,
          }}
          thumbColor={enabled ? colors.text.ivory : colors.text.muted}
          ios_backgroundColor={colors.surface.sunken}
          accessibilityLabel={enabled ? t('settings.signals.on') : t('settings.signals.off')}
        />
      </View>
      <View style={styles.dateRow}>
        <View style={styles.signalField}>
          <Text style={styles.fieldLabel}>{t('settings.signals.date')}</Text>
          <TextInput
            value={dateDraft}
            onChangeText={(value) => {
              dateDraftRef.current = value;
              setDateDraft(value);
            }}
            onEndEditing={commit}
            onBlur={commit}
            placeholder={t('create.field.date.placeholder')}
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            accessibilityLabel={t('settings.signals.date')}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.signalField}>
          <Text style={styles.fieldLabel}>{t('settings.signals.time')}</Text>
          <TextInput
            value={timeDraft}
            onChangeText={(value) => {
              timeDraftRef.current = value;
              setTimeDraft(value);
            }}
            onEndEditing={commit}
            onBlur={commit}
            placeholder={t('create.field.time.placeholder')}
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            accessibilityLabel={t('settings.signals.time')}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
      <View>
        <Text style={styles.fieldLabel}>{t('settings.signals.note')}</Text>
          <TextInput
            value={noteDraft}
            onChangeText={(value) => {
              noteDraftRef.current = value;
              setNoteDraft(value);
            }}
          onEndEditing={commit}
          onBlur={commit}
          placeholder={t('settings.signals.note.placeholder')}
          placeholderTextColor={colors.text.faint}
          style={styles.input}
          accessibilityLabel={t('settings.signals.note')}
          maxLength={MAX_METHOD_SIGNAL_NOTE}
          autoCorrect={false}
        />
      </View>
      {enabled && isPast ? <Text style={styles.note}>{t('settings.signals.past')}</Text> : null}
      <ActionButton
        label={t('settings.signals.remove')}
        variant="ghost"
        sound="deny"
        onPress={onRemove}
      />
    </View>
  );
}

function ProfileSection(): ReactElement {
  const t = useTranslator();
  const profile = useGrailStore((state) => state.profile);
  const driveLine = useGrailStore((state) => state.driveLine);
  const setName = useGrailStore((state) => state.setName);
  const setBirthDate = useGrailStore((state) => state.setBirthDate);
  const setDriveLine = useGrailStore((state) => state.setDriveLine);

  const stored = parseBirthDate(profile.birthDate);
  const [name, setNameDraft] = useState(profile.name);
  const latestName = useRef(profile.name);
  const [driveDraft, setDriveDraft] = useState(driveLine);
  const latestDrive = useRef(driveLine);
  const [day, setDay] = useState(stored === null ? '' : pad(stored.day, DAY_MONTH_LENGTH));
  const [month, setMonth] = useState(stored === null ? '' : pad(stored.month, DAY_MONTH_LENGTH));
  const [year, setYear] = useState(stored === null ? '' : String(stored.year));
  const [isDateInvalid, setDateInvalid] = useState(false);

  useEffect(() => {
    latestName.current = name;
  }, [name]);

  useEffect(() => {
    latestDrive.current = driveDraft;
  }, [driveDraft]);

  // Dismissing the sheet can unmount the field before it blurs, and a name the
  // user typed should not die with the screen.
  useEffect(() => {
    return () => {
      setName(latestName.current);
      setDriveLine(latestDrive.current);
    };
  }, [setName, setDriveLine]);

  const commit = (next: { day: string; month: string; year: string }): void => {
    // Nothing to judge until all three fields are filled in full.
    if (
      next.day.length < DAY_MONTH_LENGTH ||
      next.month.length < DAY_MONTH_LENGTH ||
      next.year.length < YEAR_LENGTH
    ) {
      setDateInvalid(false);
      return;
    }

    const parts: BirthDateParts = {
      year: Number(next.year),
      month: Number(next.month),
      day: Number(next.day),
    };

    if (!isPlausibleBirthDate(parts)) {
      setDateInvalid(true);
      return;
    }

    setDateInvalid(false);
    setBirthDate(formatBirthDate(parts));
  };

  return (
    <Section title={t('settings.data.title')}>
      <Text style={styles.fieldLabel}>{t('settings.data.name')}</Text>
      <TextInput
        value={name}
        onChangeText={setNameDraft}
        // Committed on blur rather than per keystroke: every store write goes
        // through to AsyncStorage, and the trim would fight the cursor.
        onEndEditing={() => setName(name)}
        onBlur={() => setName(name)}
        placeholder={t('settings.data.name.placeholder')}
        placeholderTextColor={colors.text.faint}
        style={styles.input}
        accessibilityLabel={t('settings.data.name')}
        returnKeyType="done"
      />

      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>{t('settings.data.drive')}</Text>
      <TextInput
        value={driveDraft}
        onChangeText={setDriveDraft}
        onEndEditing={() => setDriveLine(driveDraft)}
        onBlur={() => setDriveLine(driveDraft)}
        placeholder={t('settings.data.drive.placeholder')}
        placeholderTextColor={colors.text.faint}
        style={[styles.input, styles.driveInput]}
        accessibilityLabel={t('settings.data.drive')}
        multiline
        maxLength={DRIVE_LINE_MAX}
        textAlignVertical="top"
      />

      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>{t('settings.data.birth')}</Text>
      <View style={styles.dateRow}>
        <DateField
          value={day}
          placeholder={t('settings.data.birth.day')}
          length={DAY_MONTH_LENGTH}
          onChange={(value) => {
            setDay(value);
            commit({ day: value, month, year });
          }}
        />
        <DateField
          value={month}
          placeholder={t('settings.data.birth.month')}
          length={DAY_MONTH_LENGTH}
          onChange={(value) => {
            setMonth(value);
            commit({ day, month: value, year });
          }}
        />
        <DateField
          value={year}
          placeholder={t('settings.data.birth.year')}
          length={YEAR_LENGTH}
          style={styles.dateFieldWide}
          onChange={(value) => {
            setYear(value);
            commit({ day, month, year: value });
          }}
        />
      </View>

      {isDateInvalid ? (
        <Text style={styles.error}>{t('settings.data.birth.invalid')}</Text>
      ) : (
        <Text style={styles.age}>{t.plural('settings.data.age', profileAge(profile))}</Text>
      )}
    </Section>
  );
}

function SurveySection(): ReactElement {
  const t = useTranslator();
  const router = useRouter();
  const answers = useGrailStore((state) => state.surveyAnswers);
  const progress = surveyProgress(answers);

  return (
    <Section title={t('settings.survey.title')} hint={t('settings.survey.hint')}>
      <Text style={styles.age}>
        {t('settings.survey.progress', {
          base: progress.baseAnswered,
          baseTotal: progress.baseTotal,
          deep: progress.deepAnswered,
          deepTotal: progress.deepTotal,
        })}
      </Text>
      <ActionButton
        label={t('settings.survey.open')}
        tone="gold"
        sound="none"
        onPress={() => router.push('/survey')}
      />
    </Section>
  );
}

function Section({
  title,
  hint,
  trailing,
  children,
}: {
  title: string;
  hint?: string;
  trailing?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <GlassPanel style={styles.section} intensity={34}>
      {trailing === undefined ? (
        <Text style={styles.sectionTitle}>{title}</Text>
      ) : (
        <View style={styles.signalSwitchRow}>
          <Text style={[styles.sectionTitle, styles.sectionTitleGrow]}>{title}</Text>
          {trailing}
        </View>
      )}
      {hint === undefined ? null : <Text style={styles.sectionHint}>{hint}</Text>}
      <View style={styles.sectionBody}>{children}</View>
    </GlassPanel>
  );
}

function DateField({
  value,
  placeholder,
  length,
  style,
  onChange,
}: {
  value: string;
  placeholder: string;
  length: number;
  style?: StyleProp<TextStyle>;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <TextInput
      value={value}
      onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, length))}
      placeholder={placeholder}
      placeholderTextColor={colors.text.faint}
      keyboardType="number-pad"
      maxLength={length}
      accessibilityLabel={placeholder}
      style={[styles.input, styles.dateField, style]}
    />
  );
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.void,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenX,
  },
  pressed: {
    opacity: motion.pressOpacity,
    transform: [{ scale: motion.pressScale }],
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.control,
    backgroundColor: colors.surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    ...typography.cardTitle,
    color: colors.text.primary,
  },
  section: {
    marginTop: space.xxl,
    borderRadius: radius.xl,
    padding: space.lg,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text.ivory,
  },
  sectionTitleGrow: {
    flex: 1,
  },
  sectionHint: {
    ...typography.caption,
    marginTop: space.snug,
    color: colors.text.faint,
  },
  sectionBody: {
    marginTop: space.lg,
    gap: space.sm,
  },
  fieldLabel: {
    ...typography.eyebrow,
    marginBottom: space.sm,
    color: colors.accent.goldMuted,
  },
  fieldLabelSpaced: {
    marginTop: space.lg,
  },
  input: {
    ...typography.input,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.sunken,
    color: colors.text.primary,
    paddingHorizontal: space.lg - 2,
    paddingVertical: space.md + 2,
  },
  driveInput: {
    minHeight: 72,
  },
  signalCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.panelSoft,
    padding: space.md,
    gap: space.sm,
  },
  signalItemHint: {
    ...typography.caption,
    color: colors.text.faint,
  },
  signalSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  signalSwitchLabel: {
    ...typography.labelLg,
    color: colors.text.ivory,
  },
  signalField: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  dateField: {
    flex: 1,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  dateFieldWide: {
    flex: 1.6,
  },
  age: {
    ...typography.captionStrong,
    marginTop: space.md,
    color: colors.accent.gold,
  },
  error: {
    ...typography.captionStrong,
    marginTop: space.md,
    color: colors.state.burned,
  },
  note: {
    ...typography.caption,
    marginTop: space.snug,
    color: colors.text.faint,
  },
});
