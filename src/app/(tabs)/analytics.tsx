import { type ReactElement, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterOctagon } from '@/components/CharacterOctagon';
import { CounselPanel, LifeVectorRefresh } from '@/components/CounselPanel';
import { accessBlockNow } from '@/api/featureAccess';
import { apiBaseUrl, currentAccountSession } from '@/api/accountSession';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  analyticsDailyBodyKey,
  analyticsLifeBodyKey,
  dimensionNameKey,
  type TranslationKey,
  type Translator,
} from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import {
  colors,
  glow,
  gradients,
  gradientStops,
  layout,
  radius,
  space,
  typography,
} from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { type OctagonViewMode } from '@/types/grail';
import {
  lifeScoreBand,
  type DailyDeedCard,
  type DailyDeedKind,
  type LifeScoreBand,
  type ShadowReading,
  type AnalyzedVector,
  type WeekAnalysisCard,
} from '@/utils/characterAnalytics';
import { isAtCareerWall } from '@/utils/careerGate';
import { computeDayDisciplineScore, computeDisciplineScore } from '@/utils/discipline';
import { formatCardPercent, formatScore } from '@/utils/formatScore';
import { localDateKey } from '@/utils/taskTime';
import { useCharacterAnalytics } from '@/utils/useCharacterAnalytics';

const METER_GRADIENT = [colors.state.burned, colors.accent.goldBright, colors.state.positive] as const;
const SHADOW_METER_GRADIENT = [colors.state.positive, colors.accent.goldBright, colors.state.burned] as const;
const METER_START = { x: 0, y: 0 } as const;
const METER_END = { x: 1, y: 0 } as const;

export default function AnalyticsScreen(): ReactElement {
  const t = useTranslator();
  const insets = useSafeAreaInsets();
  const analysis = useCharacterAnalytics();
  const viewMode = useGrailStore((state) => state.viewMode);
  const tasks = useGrailStore((state) => state.tasks);
  const shadowEvents = useGrailStore((state) => state.shadowEvents);
  const promiseJournal = useGrailStore((state) => state.profile.promiseJournal);
  const firstOpenOn = useGrailStore((state) => state.profile.firstOpenOn);
  const careerCeiling = useGrailStore((state) => state.profile.careerCeiling);
  const isDaily = viewMode === 'daily';
  const isShadow = viewMode === 'shadow';
  const dailyStrengthCards = analysis.dailyCards.filter((card) => card.kind !== 'missed');
  const dailyDebtCards = analysis.dailyCards.filter((card) => card.kind === 'missed');
  const todayKey = localDateKey();
  const dayDiscipline = computeDayDisciplineScore({
    tasks,
    today: todayKey,
    shadowEvents,
  });
  const lifeDiscipline = computeDisciplineScore({
    tasks,
    today: todayKey,
    journal: promiseJournal,
    firstOpenOn,
    shadowEvents,
  });
  const [fullReading, setFullReading] = useState(
    () => currentAccountSession() === null || apiBaseUrl().length === 0,
  );

  useEffect(() => {
    let live = true;
    void accessBlockNow('analysis_full', localDateKey()).then((block) => {
      if (live) {
        setFullReading(block === null);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.screenAnalysis}
        locations={gradientStops.screenAnalysis}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, layout.screenTopMin),
            paddingBottom: space.xxl + space.xs + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          kicker={t('analytics.kicker')}
          title={t(analyticsModeKey('title', viewMode))}
        >
          <Text style={styles.subtitle}>
            {isDaily
              ? t.plural('analytics.subtitle.daily', analysis.scheduledToday, {
                  completed: analysis.completedToday,
                  total: analysis.scheduledToday,
                  today: formatScore(dayDiscipline),
                })
              : isShadow
                ? t('analytics.subtitle.shadow', {
                    average: formatScore(analysis.averageScore),
                  })
                : t('analytics.subtitle.life', {
                    harmony: formatScore(analysis.harmonyIndex),
                    average: formatScore(analysis.averageScore),
                    life: formatScore(lifeDiscipline),
                  })}
          </Text>
        </ScreenHeader>

        <View style={styles.meterRow}>
          {isShadow ? (
            <FieldMeter
              value={analysis.averageScore}
              label={t('analytics.average', { value: formatScore(analysis.averageScore) })}
              inverted
            />
          ) : (
            <>
              {isDaily ? (
                <FieldMeter
                  value={dayDiscipline}
                  label={t('analytics.discipline.today', { value: formatScore(dayDiscipline) })}
                />
              ) : (
                <>
                  <FieldMeter
                    value={analysis.harmonyIndex}
                    label={t('analytics.harmony', { value: formatScore(analysis.harmonyIndex) })}
                  />
                  <FieldMeter
                    value={lifeDiscipline}
                    label={t('analytics.discipline.life', { value: formatScore(lifeDiscipline) })}
                  />
                </>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.radarCard}>
            <CharacterOctagon embedded mode={viewMode} interactiveToggle />
          </View>
        </View>

        {isShadow && fullReading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('analytics.section.shadow')}</Text>
            <ShadowCard t={t} reading={analysis.shadowReading} />
          </View>
        ) : null}

        {isDaily && analysis.weekCard !== null ? (
          <View style={styles.section}>
            <WeekCard t={t} card={analysis.weekCard} />
          </View>
        ) : null}

        {viewMode === 'life' && fullReading && analysis.strengths.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t(analyticsFieldSectionKey('section.strengths', 'life'))}
            </Text>
            {analysis.strengths.map((vector) => (
              <LifeBandCard
                key={vector.dimension.id}
                t={t}
                vector={vector}
                careerCeiling={careerCeiling}
              />
            ))}
          </View>
        ) : null}

        {viewMode === 'life' && fullReading && analysis.bottlenecks.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t(analyticsFieldSectionKey('section.bottlenecks', 'life'))}
            </Text>
            {analysis.bottlenecks.map((vector) => (
              <LifeBandCard
                key={vector.dimension.id}
                t={t}
                vector={vector}
                careerCeiling={careerCeiling}
              />
            ))}
          </View>
        ) : null}

        {isDaily && fullReading && dailyStrengthCards.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t(analyticsFieldSectionKey('section.strengths', 'daily'))}
            </Text>
            {dailyStrengthCards.map((card) => (
              <DayDeedCard key={card.kind} t={t} card={card} />
            ))}
          </View>
        ) : null}

        {isDaily && fullReading && dailyDebtCards.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t(analyticsFieldSectionKey('section.bottlenecks', 'daily'))}
            </Text>
            {dailyDebtCards.map((card) => (
              <DayDeedCard key={card.kind} t={t} card={card} />
            ))}
          </View>
        ) : null}

        {fullReading ? null : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('access.premium')}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t(analyticsModeKey('section.plan', viewMode))}
          </Text>
          <LifeVectorRefresh fallback={analysis.developmentPlan} />
        </View>

        <View style={styles.section}>
          <CounselPanel />
        </View>
      </ScrollView>
    </View>
  );
}

function FieldMeter({
  value,
  label,
  inverted = false,
}: {
  value: number;
  label: string;
  inverted?: boolean;
}): ReactElement {
  const clamped = Math.min(100, Math.max(0, value));
  const widthPercent = `${clamped.toFixed(2)}%` as `${number}%`;

  return (
    <View style={styles.meter}>
      <View style={styles.meterTrack}>
        <LinearGradient
          colors={inverted ? SHADOW_METER_GRADIENT : METER_GRADIENT}
          start={METER_START}
          end={METER_END}
          style={[styles.meterFill, { width: widthPercent }]}
        />
      </View>
      <Text style={styles.meterCaption}>{label}</Text>
    </View>
  );
}

function LifeBandCard({
  t,
  vector,
  careerCeiling,
}: {
  t: Translator;
  vector: AnalyzedVector;
  careerCeiling: number;
}): ReactElement {
  const band = lifeScoreBand(vector.dimension.score);
  const chrome = bandChrome(band);
  const atWall =
    vector.dimension.id === 'craft_career' &&
    isAtCareerWall(vector.dimension.score, careerCeiling);

  return (
    <View style={[styles.glassCard, chrome.card]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitleInHeader}>{t(dimensionNameKey(vector.dimension.id))}</Text>
        <Text style={chrome.score}>{formatCardPercent(vector.dimension.score)}</Text>
      </View>
      {atWall ? <Text style={styles.gateNote}>{t('analytics.gate')}</Text> : null}
      <Text style={styles.cardBody}>{t(analyticsLifeBodyKey(vector.dimension.id, band))}</Text>
    </View>
  );
}

function DayDeedCard({
  t,
  card,
}: {
  t: Translator;
  card: DailyDeedCard;
}): ReactElement {
  const chrome = bandChrome(deedBand(card.kind));
  const title = card.vectorIds.map((id) => t(dimensionNameKey(id))).join(', ');

  return (
    <View style={[styles.glassCard, chrome.card]}>
      <Text style={styles.cardTitleSolo}>{title}</Text>
      {card.vectorIds.map((id, index) => (
        <Text key={id} style={index === 0 ? styles.cardBody : styles.cardBodyNext}>
          {t(analyticsDailyBodyKey(id, card.kind))}
        </Text>
      ))}
    </View>
  );
}

function WeekCard({
  t,
  card,
}: {
  t: Translator;
  card: WeekAnalysisCard;
}): ReactElement {
  const band = card.emptyWeek || card.keepShare === null ? 'veryLow' : lifeScoreBand(card.keepShare);
  const chrome = bandChrome(band);
  const body = card.emptyWeek || card.keepShare === null
    ? t('analytics.week.empty')
    : t(weekBandKey(band));

  return (
    <View style={[styles.glassCard, chrome.card]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitleInHeader}>{t('analytics.week.title')}</Text>
        {card.keepShare === null ? null : (
          <Text style={chrome.score}>{formatCardPercent(card.keepShare)}</Text>
        )}
      </View>
      <Text style={styles.cardBody}>{body}</Text>
      {card.hasShadow ? <Text style={styles.cardBodyNext}>{t('analytics.week.shadow')}</Text> : null}
    </View>
  );
}

function deedBand(kind: DailyDeedKind): LifeScoreBand {
  if (kind === 'done') {
    return 'veryHigh';
  }
  if (kind === 'partial') {
    return 'high';
  }
  return 'low';
}

function weekBandKey(band: LifeScoreBand): TranslationKey {
  if (band === 'veryLow') {
    return 'analytics.week.veryLow';
  }
  if (band === 'low') {
    return 'analytics.week.low';
  }
  if (band === 'mid') {
    return 'analytics.week.mid';
  }
  if (band === 'high') {
    return 'analytics.week.high';
  }
  return 'analytics.week.veryHigh';
}

function bandChrome(band: LifeScoreBand): {
  card: object;
  score: object;
} {
  if (band === 'veryLow') {
    return { card: styles.veryLowCard, score: styles.cardScoreDanger };
  }
  if (band === 'low') {
    return { card: styles.lowCard, score: styles.cardScoreRose };
  }
  if (band === 'mid') {
    return { card: styles.midCard, score: styles.cardScoreMid };
  }
  if (band === 'high') {
    return { card: styles.highCard, score: styles.cardScoreCyan };
  }
  return { card: styles.goldCard, score: styles.cardScoreGold };
}

function ShadowCard({
  t,
  reading,
}: {
  t: Translator;
  reading: ShadowReading;
}): ReactElement {
  return (
    <View style={[styles.glassCard, styles.shadowCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCategoryUrgent}>{t('analytics.shadow.eyebrow')}</Text>
        {reading.share > 0 ? (
          <Text style={styles.cardScoreShadow}>{formatCardPercent(reading.share)}</Text>
        ) : null}
      </View>
      <Text style={styles.cardTitle}>{reading.title}</Text>
      {reading.body
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0)
        .map((paragraph, index) => (
          <Text key={index} style={index === 0 ? styles.cardBody : styles.cardBodyNext}>
            {paragraph}
          </Text>
        ))}
    </View>
  );
}

function analyticsModeKey(
  family: 'title' | 'section.plan',
  mode: OctagonViewMode,
): TranslationKey {
  return `analytics.${family}.${mode}`;
}

function analyticsFieldSectionKey(
  family: 'section.strengths' | 'section.bottlenecks',
  mode: Extract<OctagonViewMode, 'daily' | 'life'>,
): TranslationKey {
  return `analytics.${family}.${mode}`;
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
  subtitle: {
    ...typography.body,
    marginTop: space.sm + 2,
    color: colors.text.muted,
  },
  meterRow: {
    marginTop: space.lg + 2,
    flexDirection: 'row',
    gap: space.md,
  },
  meter: {
    flex: 1,
  },
  meterTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.raised,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  meterCaption: {
    ...typography.captionStrong,
    marginTop: space.sm,
    color: colors.accent.goldBright,
  },
  section: {
    marginTop: space.xxl + space.xs,
  },
  sectionTitle: {
    ...typography.heading,
    marginBottom: space.md + 2,
    color: colors.text.primary,
  },
  radarCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.cyan,
    backgroundColor: colors.surface.glassDeep,
    paddingBottom: space.md + 2,
  },
  glassCard: {
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
  },
  veryLowCard: {
    borderColor: colors.border.danger,
    ...glow(colors.state.danger, 0.2, 14),
  },
  lowCard: {
    borderColor: colors.border.burned,
    ...glow(colors.state.burned, 0.22, 14),
  },
  midCard: {
    borderColor: colors.border.cyan,
    ...glow(colors.accent.cyanBright, 0.16, 14),
  },
  highCard: {
    borderColor: colors.border.cyan,
    ...glow(colors.accent.cyan, 0.18, 14),
  },
  goldCard: {
    borderColor: colors.border.goldBright,
    ...glow(colors.accent.goldBright, 0.34, 16),
  },
  shadowCard: {
    borderColor: colors.border.burned,
    ...glow(colors.state.burned, 0.22, 14),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCategoryUrgent: {
    ...typography.eyebrow,
    color: colors.state.burned,
  },
  cardScoreCyan: {
    ...typography.metricSm,
    color: colors.accent.cyan,
  },
  cardScoreMid: {
    ...typography.metricSm,
    color: colors.accent.cyanBright,
  },
  cardScoreGold: {
    ...typography.metricSm,
    color: colors.accent.goldBright,
  },
  cardScoreDanger: {
    ...typography.metricSm,
    color: colors.state.danger,
  },
  cardScoreRose: {
    ...typography.metricSm,
    color: colors.state.dangerText,
  },
  cardScoreShadow: {
    ...typography.metricSm,
    color: colors.state.dangerText,
  },
  cardTitle: {
    ...typography.cardTitle,
    marginTop: space.sm,
    color: colors.text.ivory,
  },
  cardTitleInHeader: {
    ...typography.cardTitle,
    flex: 1,
    marginRight: space.md,
    color: colors.text.ivory,
  },
  cardTitleSolo: {
    ...typography.cardTitle,
    color: colors.text.ivory,
  },
  cardBody: {
    ...typography.body,
    marginTop: space.sm,
    color: colors.text.muted,
  },
  cardBodyNext: {
    ...typography.body,
    marginTop: space.md,
    color: colors.text.muted,
  },
  gateNote: {
    ...typography.captionStrong,
    marginTop: space.snug,
    color: colors.accent.goldBright,
  },
});
