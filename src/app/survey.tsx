import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassPanel } from '@/components/GlassPanel';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  SURVEY_QUESTIONS,
  SURVEY_SECTION_ORDER,
  type SurveyQuestion,
  type SurveySectionId,
} from '@/constants/lifeSurvey';
import {
  dimensionShortKey,
  surveyOptionKey,
  surveyQuestionKey,
  surveySectionKey,
} from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { useGrailStore } from '@/store/useGrailStore';
import {
  colors,
  elevation,
  gradients,
  gradientStops,
  layout,
  motion,
  radius,
  space,
  typography,
} from '@/theme';
import { HUMAN_DIMENSION_IDS } from '@/types/grail';
import { isSurveyBaseComplete, scoreLifeSurvey, surveyProgress } from '@/utils/lifeSurvey';
import { profileAge } from '@/utils/profile';

interface LifeSurveyFormProps {
  /** First-run: no close, every base question required. */
  readonly locked?: boolean;
  readonly onApplied: () => void;
  readonly onClose?: () => void;
}

export function LifeSurveyForm({
  locked = false,
  onApplied,
  onClose,
}: LifeSurveyFormProps): ReactElement {
  const t = useTranslator();
  const insets = useSafeAreaInsets();
  const profile = useGrailStore((state) => state.profile);
  const answers = useGrailStore((state) => state.surveyAnswers);
  const surveyApplied = useGrailStore((state) => state.surveyApplied);
  const applyLifeSurvey = useGrailStore((state) => state.applyLifeSurvey);

  const progress = surveyProgress(answers);
  const preview = useMemo(
    () => scoreLifeSurvey(answers, profileAge(profile)),
    [answers, profile],
  );
  const canApply = locked
    ? isSurveyBaseComplete(progress)
    : progress.baseAnswered + progress.deepAnswered > 0;

  const onApply = (): void => {
    if (!canApply) {
      return;
    }

    applyLifeSurvey();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApplied();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.screenGrail}
        locations={gradientStops.screenGrail}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, layout.screenTopMin),
            paddingBottom: space.xxxl + insets.bottom + 88,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          kicker={t('survey.kicker')}
          title={t('survey.title')}
          tone="gold"
          actions={
            locked || onClose === undefined ? undefined : (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.closeLabel}>✕</Text>
              </Pressable>
            )
          }
        >
          <Text style={styles.subtitle}>
            {t(locked ? 'survey.gate.subtitle' : 'survey.subtitle')}
          </Text>
          <Text style={styles.progress}>
            {t('settings.survey.progress', {
              base: progress.baseAnswered,
              baseTotal: progress.baseTotal,
              deep: progress.deepAnswered,
              deepTotal: progress.deepTotal,
            })}
          </Text>
        </ScreenHeader>

        {SURVEY_SECTION_ORDER.map((section) => (
          <SectionBlock
            key={section}
            section={section}
            questions={SURVEY_QUESTIONS.filter(
              (question) => question.section === section && question.tier === 'base',
            )}
          />
        ))}

        <Text style={styles.deepTitle}>{t('survey.deep.title')}</Text>
        <Text style={styles.deepHint}>{t('survey.deep.hint')}</Text>

        {SURVEY_SECTION_ORDER.map((section) => {
          const questions = SURVEY_QUESTIONS.filter(
            (question) => question.section === section && question.tier === 'deep',
          );

          if (questions.length === 0) {
            return null;
          }

          return <SectionBlock key={`deep-${section}`} section={section} questions={questions} />;
        })}

        <GlassPanel style={styles.preview} intensity={34}>
          <Text style={styles.previewTitle}>{t('survey.preview')}</Text>
          <View style={styles.previewGrid}>
            {HUMAN_DIMENSION_IDS.map((id) => (
              <View key={id} style={styles.previewCell}>
                <Text style={styles.previewName}>{t(dimensionShortKey(id))}</Text>
                <Text style={styles.previewScore}>
                  {preview[id] === undefined ? '—' : Math.round(preview[id])}
                </Text>
              </View>
            ))}
          </View>
          {surveyApplied ? <Text style={styles.applied}>{t('survey.applied')}</Text> : null}
        </GlassPanel>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <View style={styles.footerLift}>
          {locked && !canApply ? (
            <Text style={styles.needBase}>{t('survey.apply.needBase')}</Text>
          ) : null}
          <ActionButton
            label={t('survey.apply')}
            tone="gold"
            disabled={!canApply}
            onPress={onApply}
          />
        </View>
      </View>
    </View>
  );
}

export default function SurveyScreen(): ReactElement {
  const router = useRouter();

  return (
    <LifeSurveyForm
      onApplied={() => router.back()}
      onClose={() => router.back()}
    />
  );
}

function SectionBlock({
  section,
  questions,
}: {
  section: SurveySectionId;
  questions: readonly SurveyQuestion[];
}): ReactElement | null {
  const t = useTranslator();
  const answers = useGrailStore((state) => state.surveyAnswers);
  const setAnswer = useGrailStore((state) => state.setSurveyAnswer);

  if (questions.length === 0) {
    return null;
  }

  return (
    <GlassPanel style={styles.section} intensity={34}>
      <Text style={styles.sectionTitle}>{t(surveySectionKey(section))}</Text>
      {questions.map((question) => (
        <View key={question.id} style={styles.question}>
          <Text style={styles.questionTitle}>{t(surveyQuestionKey(question.id))}</Text>
          {question.options.map((option) => {
            const selected = answers[question.id] === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setAnswer(question.id, selected ? undefined : option.id);
                  void Haptics.selectionAsync();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.option,
                  selected ? styles.optionSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.optionLabel, selected ? styles.optionLabelSelected : null]}>
                  {t(surveyOptionKey(question.id, option.id))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </GlassPanel>
  );
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
  subtitle: {
    ...typography.body,
    marginTop: space.sm + 2,
    color: colors.text.muted,
  },
  progress: {
    ...typography.captionStrong,
    marginTop: space.sm,
    color: colors.accent.gold,
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
  question: {
    marginTop: space.lg,
    gap: space.sm,
  },
  questionTitle: {
    ...typography.itemTitle,
    marginBottom: space.snug,
    color: colors.text.primary,
  },
  option: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.panel,
    paddingHorizontal: space.lg - 2,
    paddingVertical: space.md,
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: colors.border.gold,
    backgroundColor: colors.tint.goldStrong,
  },
  optionLabel: {
    ...typography.body,
    color: colors.text.muted,
  },
  optionLabelSelected: {
    color: colors.text.primary,
  },
  deepTitle: {
    ...typography.heading,
    marginTop: space.xxxl,
    color: colors.text.ivory,
  },
  deepHint: {
    ...typography.caption,
    marginTop: space.sm,
    color: colors.text.faint,
  },
  preview: {
    marginTop: space.xxl,
    borderRadius: radius.xl,
    padding: space.lg,
  },
  previewTitle: {
    ...typography.eyebrow,
    color: colors.accent.goldMuted,
  },
  previewGrid: {
    marginTop: space.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewCell: {
    width: '25%',
    paddingVertical: space.sm,
  },
  previewName: {
    ...typography.caption,
    color: colors.text.faint,
  },
  previewScore: {
    ...typography.cardTitle,
    marginTop: space.hair,
    color: colors.text.ivory,
  },
  applied: {
    ...typography.captionStrong,
    marginTop: space.md,
    color: colors.accent.gold,
  },
  footer: {
    position: 'absolute',
    left: layout.footerX,
    right: layout.footerX,
    bottom: 0,
  },
  footerLift: {
    borderRadius: radius.md,
    backgroundColor: colors.void,
    ...elevation.floating,
  },
  needBase: {
    ...typography.captionStrong,
    marginBottom: space.sm,
    color: colors.accent.goldMuted,
    textAlign: 'center',
  },
});
