import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { BreathingCharacterCore } from '@/components/BreathingCharacterCore';
import { CampaignCountdownView } from '@/components/CampaignCountdown';
import { ProofCardModal } from '@/components/ProofCardModal';
import { AchievementCard } from '@/components/AchievementCard';
import { CareerGateNotice } from '@/components/CareerGateNotice';
import { KeyboardInsetScrollView } from '@/components/KeyboardInsetScrollView';
import { TalentTreeModal } from '@/components/TalentTreeModal';
import { DisciplineTreeModal } from '@/components/DisciplineTreeModal';
import { BreathPracticeModal } from '@/components/BreathPracticeModal';
import { HowItWorksSheet } from '@/components/HowItWorksSheet';
import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { NoticeButton } from '@/components/ui/NoticeButton';
import { TreeButton } from '@/components/ui/TreeButton';
import { LotusButton } from '@/components/ui/LotusButton';
import { SefirotButton } from '@/components/ui/SefirotButton';
import { dimensionNameKey, dimensionShortKey, type TranslationKey, type Translator } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import {
  colors,
  elevation,
  glow,
  gradients,
  gradientStops,
  layout,
  radius,
  space,
  typography,
  withAlpha,
} from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { type HumanDimension, type HumanDimensionId, type OctagonViewMode } from '@/types/grail';
import { campaignVectorIds, createdCampaign } from '@/types/campaign';
import { formatScore, formatVectorPercent } from '@/utils/formatScore';
import { profileAge } from '@/utils/profile';
import { computeDayDisciplineScore, computeDisciplineScore } from '@/utils/discipline';
import { localDateKey } from '@/utils/taskTime';
import { useCharacterAnalytics } from '@/utils/useCharacterAnalytics';
import { type DailyDeedCard } from '@/utils/characterAnalytics';

export default function CharacterPassportScreen(): ReactElement {
  const t = useTranslator();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useGrailStore((state) => state.profile);
  const tasks = useGrailStore((state) => state.tasks);
  const shadowEvents = useGrailStore((state) => state.shadowEvents);
  const viewMode = useGrailStore((state) => state.viewMode);
  const campaigns = useGrailStore((state) => state.campaigns);
  const disciplineBeacon = useGrailStore((state) => state.disciplineBeacon);
  const setDisciplineBeacon = useGrailStore((state) => state.setDisciplineBeacon);
  const analysis = useCharacterAnalytics();
  const [proofVisible, setProofVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [breathOpen, setBreathOpen] = useState(false);
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [disciplineLockedOpen, setDisciplineLockedOpen] = useState(false);

  const goal = createdCampaign(campaigns);

  const peak = analysis.strengths[0]?.dimension;
  const bottleneck = analysis.bottlenecks[0]?.dimension;
  const laggingDimensions = analysis.bottlenecks.map((vector) => vector.dimension);
  const stainedAxes =
    viewMode === 'shadow'
      ? [...analysis.strengths, ...analysis.bottlenecks].map((vector) => vector.dimension)
      : viewMode === 'daily'
        ? analysis.openDayIds.flatMap((id) => {
            const vector = analysis.vectors.find((item) => item.dimension.id === id);
            return vector === undefined ? [] : [vector.dimension];
          })
        : laggingDimensions;
  const showDailyDeeds = viewMode === 'daily' && analysis.dailyCards.length > 0;
  const todayKey = localDateKey();
  const dayDiscipline = computeDayDisciplineScore({
    tasks,
    today: todayKey,
    shadowEvents,
  });
  const lifeDiscipline = computeDisciplineScore({
    tasks,
    today: todayKey,
    journal: profile.promiseJournal,
    firstOpenOn: profile.firstOpenOn,
    shadowEvents,
  });

  const onShareProof = (): void => {
    setProofVisible(true);
  };

  const onDisciplinePress = (): void => {
    if (disciplineBeacon) {
      setDisciplineBeacon(false);
    }

    if (goal === undefined) {
      setDisciplineLockedOpen(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setDisciplineOpen(true);
  };

  const onCreateGoal = (): void => {
    setDisciplineLockedOpen(false);
    router.push('/campaign');
  };

  return (
    <View style={styles.root}>
      <Atmosphere />

      <KeyboardInsetScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, layout.screenTopMin) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={t('character.title')}
          scale="wordmark"
          tone="gold"
          actions={
            <>
              <NoticeButton onPress={() => setGuideOpen(true)} />
              <View style={styles.headerTools}>
                <TreeButton onPress={() => setTreeOpen(true)} />
                <LotusButton onPress={() => setBreathOpen(true)} />
                <SefirotButton beacon={disciplineBeacon} onPress={onDisciplinePress} />
              </View>
            </>
          }
        >
          <Text style={styles.subtitle}>
            {t('character.subtitle', { age: profileAge(profile) })}
          </Text>
          <Text style={styles.essenceMeta}>
            {viewMode === 'daily'
              ? t.plural('character.meta.daily', analysis.scheduledToday, {
                  completed: analysis.completedToday,
                  total: analysis.scheduledToday,
                  today: formatScore(dayDiscipline),
                })
              : viewMode === 'shadow'
                ? t('character.meta.shadow', {
                    average: formatScore(analysis.averageScore),
                  })
                : t('character.meta.life', {
                    level: profile.characterLevel,
                    harmony: formatScore(analysis.harmonyIndex),
                    life: formatScore(lifeDiscipline),
                  })}
          </Text>
        </ScreenHeader>

        <View style={styles.coreWrap}>
          <BreathingCharacterCore mode={viewMode} interactiveToggle />
        </View>

        <CampaignCard />

        <DriveCard />

        {showDailyDeeds ? (
          <DailyDeedSummary t={t} cards={analysis.dailyCards} />
        ) : viewMode === 'shadow' && peak !== undefined ? (
          <ShadowMeter t={t} average={analysis.averageScore} peak={peak} />
        ) : peak !== undefined ? (
          <FieldSummary t={t} viewMode={viewMode} peak={peak} bottleneck={bottleneck} />
        ) : null}

        {stainedAxes.length > 0 ? (
          <ImbalanceCard t={t} viewMode={viewMode} dimensions={stainedAxes} />
        ) : viewMode === 'life' ? (
          <HarmonyCard t={t} />
        ) : null}

        <CareerGateNotice />
        <AchievementCard />
      </KeyboardInsetScrollView>

      <View style={styles.footer}>
        <View style={styles.footerLift}>
          <ActionButton
            label={t('character.cta.label')}
            variant="outline"
            tone="bevel"
            sound="none"
            onPress={onShareProof}
            accessibilityLabel={t('character.cta.a11y')}
          />
        </View>
      </View>

      <ProofCardModal visible={proofVisible} onClose={() => setProofVisible(false)} />
      <HowItWorksSheet visible={guideOpen} onClose={() => setGuideOpen(false)} />
      <TalentTreeModal visible={treeOpen} onClose={() => setTreeOpen(false)} />
      <BreathPracticeModal visible={breathOpen} onClose={() => setBreathOpen(false)} />
      <DisciplineTreeModal visible={disciplineOpen} onClose={() => setDisciplineOpen(false)} />
      <ModalSheet
        visible={disciplineLockedOpen}
        onClose={() => setDisciplineLockedOpen(false)}
        align="center"
        accessibilityLabel={t('discipline.locked.needGoal')}
      >
        <View style={styles.lockedSheet}>
          <Text style={styles.lockedTitle}>{t('discipline.title')}</Text>
          <Text style={styles.lockedBody}>{t('discipline.locked.needGoal')}</Text>
          <ActionButton label={t('discipline.locked.cta')} sound="none" onPress={onCreateGoal} />
          <ActionButton
            label={t('common.close')}
            variant="ghost"
            onPress={() => setDisciplineLockedOpen(false)}
          />
        </View>
      </ModalSheet>
    </View>
  );
}

function CampaignCard(): ReactElement {
  const t = useTranslator();
  const router = useRouter();
  const campaigns = useGrailStore((state) => state.campaigns);
  const campaign = createdCampaign(campaigns);
  const vectors =
    campaign === undefined
      ? []
      : campaignVectorIds(campaign).map((id) => t(dimensionShortKey(id)));

  return (
    <Pressable
      onPress={() => router.push('/campaign')}
      accessibilityRole="button"
      accessibilityLabel={
        campaign === undefined ? t('character.campaign.empty') : t('character.campaign.open')
      }
      style={({ pressed }) => [styles.campaignHit, pressed ? styles.campaignPressed : null]}
    >
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.campaignEdge}
      >
        <View
          style={[
            styles.campaignFill,
            campaign === undefined ? styles.campaignFillEmpty : null,
          ]}
        >
          <Text style={styles.campaignKicker}>{t('character.campaign.kicker')}</Text>
          {campaign === undefined ? (
            <Text style={styles.campaignCta}>{t('character.campaign.empty')}</Text>
          ) : (
            <>
              <Text style={styles.campaignTitle}>{campaign.title}</Text>
              <CampaignCountdownView campaign={campaign} />
              {vectors.length === 0 ? null : (
                <Text style={styles.campaignHint}>{vectors.join(' · ')}</Text>
              )}
            </>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function DriveCard(): ReactElement | null {
  const t = useTranslator();
  const driveLine = useGrailStore((state) => state.driveLine);

  if (driveLine.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.driveCard}
      accessibilityRole="text"
      accessibilityLabel={t('settings.data.drive')}
    >
      <Text style={styles.driveQuote}>{driveLine}</Text>
    </View>
  );
}

function Atmosphere(): ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={gradients.screenGrail}
        locations={gradientStops.screenGrail}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function ImbalanceCard({
  t,
  viewMode,
  dimensions,
}: {
  t: Translator;
  viewMode: OctagonViewMode;
  dimensions: readonly HumanDimension[];
}): ReactElement {
  const isShadow = viewMode === 'shadow';
  const chips = (
    <View style={styles.chipRow}>
      {dimensions.map((dimension) => (
        <View key={dimension.id} style={styles.lagChip}>
          <View style={styles.lagDot} />
          <Text style={styles.lagChipText}>
            {t(dimensionNameKey(dimension.id))}
            {'  '}
            {formatVectorPercent(dimension.score)}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.panel, styles.panelUrgent]}>
      <Text style={styles.panelEyebrowUrgent}>
        {t(characterModeKey('imbalance.eyebrow', viewMode))}
      </Text>
      {isShadow ? null : (
        <Text style={styles.panelTitle}>
          {t(characterModeKey('imbalance.title', viewMode))}
        </Text>
      )}
      {isShadow ? chips : null}
      <Text style={styles.panelBody}>
        {t(characterModeKey('imbalance.body', viewMode))}
      </Text>
      {isShadow ? null : chips}
    </View>
  );
}

function HarmonyCard({ t }: { t: Translator }): ReactElement {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>{t('character.harmony.eyebrow.life')}</Text>
      <Text style={styles.panelTitleQuiet}>{t('character.harmony.title.life')}</Text>
      <Text style={styles.panelBody}>{t('character.harmony.body.life')}</Text>
    </View>
  );
}

function ShadowMeter({
  t,
  average,
  peak,
}: {
  t: Translator;
  average: number;
  peak: HumanDimension;
}): ReactElement {
  return (
    <View
      style={styles.shadowMeter}
      accessibilityRole="text"
      accessibilityLabel={`${t('character.summary.peak.shadow')}. ${formatVectorPercent(average)}. ${t('character.shadow.peak')} ${t(dimensionNameKey(peak.id))} ${formatVectorPercent(peak.score)}`}
    >
      <Text style={styles.shadowMeterEyebrow}>{t('character.summary.peak.shadow')}</Text>
      <Text style={styles.shadowMeterScore}>{formatVectorPercent(average)}</Text>
      <Text style={styles.shadowMeterPeak} numberOfLines={1}>
        {t('character.shadow.peak')}
        {'  '}
        {t(dimensionNameKey(peak.id))}
        {'  '}
        {formatVectorPercent(peak.score)}
      </Text>
    </View>
  );
}

type DailyDeedSlot = 'done' | 'partial' | 'missed';

function DailyDeedSummary({
  t,
  cards,
}: {
  t: Translator;
  cards: readonly DailyDeedCard[];
}): ReactElement | null {
  const idsByKind = (kind: DailyDeedCard['kind']): readonly HumanDimensionId[] =>
    cards.find((card) => card.kind === kind)?.vectorIds ?? [];

  const doneIds = idsByKind('done');
  const partialIds = idsByKind('partial');
  const missedIds = idsByKind('missed');

  if (doneIds.length + partialIds.length + missedIds.length === 0) {
    return null;
  }

  return (
    <View style={styles.deedRow}>
      <DeedStatusCard t={t} slot="done" vectorIds={doneIds} />
      <DeedStatusCard t={t} slot="partial" vectorIds={partialIds} />
      <DeedStatusCard t={t} slot="missed" vectorIds={missedIds} />
    </View>
  );
}

function DeedStatusCard({
  t,
  slot,
  vectorIds,
}: {
  t: Translator;
  slot: DailyDeedSlot;
  vectorIds: readonly HumanDimensionId[];
}): ReactElement {
  const chrome = deedChrome(slot);
  const label =
    slot === 'done'
      ? t('character.deed.done')
      : slot === 'partial'
        ? t('character.deed.partial')
        : t('character.deed.missed');
  const names = vectorIds.map((id) => t(dimensionShortKey(id))).join(', ');

  return (
    <View
      style={[styles.deedCard, chrome.card]}
      accessibilityRole="text"
      accessibilityLabel={names.length > 0 ? `${label}. ${names}` : label}
    >
      <Text style={[styles.deedEyebrow, chrome.eyebrow]}>{label}</Text>
      {vectorIds.map((id) => (
        <Text key={id} style={styles.deedName}>
          {t(dimensionShortKey(id))}
        </Text>
      ))}
    </View>
  );
}

function deedChrome(slot: DailyDeedSlot): { card: object; eyebrow: object } {
  if (slot === 'done') {
    return { card: styles.deedDone, eyebrow: styles.deedEyebrowDone };
  }
  if (slot === 'partial') {
    return { card: styles.deedPartial, eyebrow: styles.deedEyebrowPartial };
  }
  return { card: styles.deedMissed, eyebrow: styles.deedEyebrowMissed };
}

function FieldSummary({
  t,
  viewMode,
  peak,
  bottleneck,
}: {
  t: Translator;
  viewMode: OctagonViewMode;
  peak: HumanDimension;
  bottleneck: HumanDimension | undefined;
}): ReactElement {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryCard, styles.summaryPeak]}>
        <Text style={styles.summaryEyebrow}>
          {t(characterModeKey('summary.peak', viewMode))}
        </Text>
        <Text style={styles.summaryName}>{t(dimensionNameKey(peak.id))}</Text>
        <Text style={styles.summaryScore}>{formatVectorPercent(peak.score)}</Text>
      </View>
      {bottleneck !== undefined ? (
        <View style={[styles.summaryCard, styles.summaryBottleneck]}>
          <Text style={styles.summaryEyebrowUrgent}>
            {t(characterModeKey('summary.bottleneck', viewMode))}
          </Text>
          <Text style={styles.summaryName}>{t(dimensionNameKey(bottleneck.id))}</Text>
          <Text style={styles.summaryScore}>{formatVectorPercent(bottleneck.score)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function characterModeKey(
  family:
    | 'summary.peak'
    | 'summary.bottleneck'
    | 'imbalance.eyebrow'
    | 'imbalance.title'
    | 'imbalance.body',
  mode: OctagonViewMode,
): TranslationKey {
  return `character.${family}.${mode}`;
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
    // Clears the absolute footer; the tab bar already accounts for safe area.
    paddingBottom: layout.footerClearance,
  },
  headerTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  subtitle: {
    ...typography.bodyStrong,
    color: colors.text.muted,
    textAlign: 'center',
  },
  essenceMeta: {
    ...typography.captionStrong,
    marginTop: space.sm,
    color: colors.accent.gold,
    textAlign: 'center',
  },
  coreWrap: {
    marginTop: space.sm,
    marginHorizontal: -space.sm,
  },
  campaignHit: {
    marginTop: space.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...glow(colors.accent.gold, 0.42, 18),
  },
  campaignEdge: {
    padding: space.hair + 1,
    borderRadius: radius.lg,
  },
  campaignFill: {
    borderRadius: radius.lg - 2,
    backgroundColor: colors.surface.control,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
  },
  campaignFillEmpty: {
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  campaignKicker: {
    ...typography.micro,
    color: colors.accent.goldBright,
  },
  campaignCta: {
    ...typography.button,
    marginTop: space.snug,
    color: colors.accent.goldBright,
    textAlign: 'center',
  },
  campaignTitle: {
    ...typography.labelLg,
    marginTop: space.snug,
    color: colors.text.ivory,
  },
  campaignHint: {
    ...typography.caption,
    marginTop: space.sm,
    color: colors.accent.goldMuted,
  },
  campaignPressed: {
    opacity: 0.88,
  },
  lockedSheet: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
    gap: space.md,
  },
  lockedTitle: {
    ...typography.modalTitle,
    color: colors.text.ivory,
  },
  lockedBody: {
    ...typography.body,
    color: colors.text.muted,
  },
  driveCard: {
    marginTop: space.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
  },
  driveQuote: {
    ...typography.quote,
    color: colors.accent.gold,
    textAlign: 'center',
  },
  deedRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.snug,
  },
  deedCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm + 2,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
  },
  deedDone: {
    borderColor: colors.border.gold,
    backgroundColor: colors.tint.gold,
  },
  deedPartial: {
    borderColor: colors.border.cyan,
    backgroundColor: colors.tint.cyan,
  },
  deedMissed: {
    borderColor: colors.border.burned,
    backgroundColor: colors.tint.burned,
  },
  deedEyebrow: {
    ...typography.micro,
  },
  deedEyebrowDone: {
    color: colors.accent.gold,
  },
  deedEyebrowPartial: {
    color: colors.accent.cyan,
  },
  deedEyebrowMissed: {
    color: colors.state.burned,
  },
  deedName: {
    ...typography.captionStrong,
    marginTop: space.xs,
    color: colors.text.ivory,
  },
  shadowMeter: {
    alignSelf: 'stretch',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.snug,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: colors.tint.burned,
    borderWidth: 1,
    borderColor: colors.border.burned,
    ...glow(colors.state.burned, 0.28, 14),
  },
  shadowMeterEyebrow: {
    ...typography.micro,
    color: colors.state.burned,
  },
  shadowMeterScore: {
    ...typography.metric,
    color: colors.state.burned,
  },
  shadowMeterPeak: {
    ...typography.captionStrong,
    flexShrink: 1,
    color: colors.state.dangerText,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: space.sm + 2,
    marginTop: space.snug,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: space.lg - 2,
    paddingHorizontal: space.lg - 2,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
  },
  summaryPeak: {
    borderColor: colors.border.cyan,
  },
  summaryBottleneck: {
    borderColor: colors.border.danger,
  },
  summaryEyebrow: {
    ...typography.micro,
    color: colors.accent.cyanMuted,
  },
  summaryEyebrowUrgent: {
    ...typography.micro,
    color: colors.state.danger,
  },
  summaryName: {
    ...typography.labelLg,
    marginTop: space.snug,
    color: colors.text.ivory,
  },
  summaryScore: {
    ...typography.metric,
    marginTop: space.xs,
    color: colors.text.primary,
  },
  panel: {
    marginTop: space.lg + 2,
    borderRadius: radius.xl - 2,
    padding: space.lg + 2,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
    borderColor: withAlpha(colors.text.ivory, 0.12),
    overflow: 'hidden',
  },
  panelUrgent: {
    borderColor: colors.border.danger,
    backgroundColor: colors.tint.danger,
    ...glow(colors.state.danger, 0.4, 20),
  },
  panelEyebrow: {
    ...typography.eyebrow,
    color: colors.accent.cyanMuted,
  },
  panelEyebrowUrgent: {
    ...typography.eyebrow,
    color: colors.state.danger,
  },
  panelTitle: {
    ...typography.heading,
    marginTop: space.sm,
    color: colors.text.ivory,
  },
  panelTitleQuiet: {
    ...typography.headingQuiet,
    marginTop: space.sm,
    color: colors.text.ivory,
  },
  panelBody: {
    ...typography.body,
    marginTop: space.sm + 2,
    color: colors.text.muted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.md + 2,
  },
  lagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.dangerStrong,
    borderColor: colors.border.danger,
    borderWidth: 1,
  },
  lagDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.state.danger,
    ...glow(colors.state.danger, 1, 6),
  },
  lagChipText: {
    ...typography.captionStrong,
    color: colors.state.dangerText,
  },
  footer: {
    position: 'absolute',
    left: layout.footerX,
    right: layout.footerX,
    bottom: 0,
    paddingBottom: layout.footerBottom,
  },
  /**
   * Shadow lives outside the button, which clips its own gradient. The opaque
   * fill is what lets Android derive an outline for the elevation.
   */
  footerLift: {
    borderRadius: radius.md,
    backgroundColor: colors.void,
    ...elevation.floating,
  },
});
