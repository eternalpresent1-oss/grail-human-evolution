import { useRef, useState, type ReactElement } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { disciplineStepTitleKey, dimensionShortKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, glow, gradients, radius, space, typography, withAlpha } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { HUMAN_DIMENSION_IDS, getDailyDimensionProgress, type UserProfile } from '@/types/grail';
import { formatVectorPercent } from '@/utils/formatScore';
import { pickProofImage } from '@/utils/pickProofImage';
import { localDateKey } from '@/utils/taskTime';
import { computeAllShadowShares } from '@/utils/weekLedger';
import { currentDisciplineStep } from '@/utils/disciplineTree';
import { createdCampaign } from '@/types/campaign';
import {
  OCTAGON_SIDE_COUNT,
  OCTAGON_VALUE_MAX,
  getOctagonLabelPlacement,
  getOctagonPoint,
  getOctagonRingPoints,
  toSvgPoints,
} from '@/utils/octagonMath';

interface ProofCardModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProofCardModal({ visible, onClose }: ProofCardModalProps): ReactElement {
  const t = useTranslator();
  const profile = useGrailStore((state) => state.profile);
  const proofBackgroundUri = useGrailStore((state) => state.proofBackgroundUri);
  const setProofBackgroundUri = useGrailStore((state) => state.setProofBackgroundUri);
  const viewShotRef = useRef<ViewShotRef>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const handleShare = async (): Promise<void> => {
    const capture = viewShotRef.current?.capture;

    if (capture === undefined || isSharing) {
      return;
    }

    setIsSharing(true);
    setShareError(null);

    try {
      const uri = await capture();

      if (!(await Sharing.isAvailableAsync())) {
        setShareError(t('proof.share.unavailable'));
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: t('proof.share.dialog'),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setShareError(t('proof.share.failed'));
    } finally {
      setIsSharing(false);
    }
  };

  const pickBackground = async (): Promise<void> => {
    setShareError(null);

    const picked = await pickProofImage();
    if (picked === 'canceled') {
      return;
    }

    if (picked === 'unavailable') {
      setShareError(t('proof.background.unavailable'));
      return;
    }

    setProofBackgroundUri(picked.uri);
    void Haptics.selectionAsync();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} align="center" panelStyle={styles.sheet}>
      <View accessibilityViewIsModal>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
          bounces={false}
        >
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1, result: 'tmpfile' }}
              style={styles.shot}
            >
              <View collapsable={false} style={styles.card}>
                {proofBackgroundUri.length > 0 ? (
                  <Image
                    source={{ uri: proofBackgroundUri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                ) : null}
                <LinearGradient
                  colors={
                    proofBackgroundUri.length > 0 ? PHOTO_OVERLAY : CARD_GRADIENT
                  }
                  start={GRADIENT_START}
                  end={GRADIENT_END}
                  style={styles.cardFill}
                >
                  <View style={styles.neonFrame} />
                  <ProofCardBody profile={profile} />
                </LinearGradient>
              </View>
            </ViewShot>

            <View style={styles.actions}>
              {/* The glow lives on a wrapper: the button itself clips its
                  gradient with `overflow: hidden`, which would erase a shadow
                  set on the same view. */}
              <View style={styles.shareGlow}>
                <ActionButton
                  label={t('proof.share')}
                  tone="gold"
                  sound="none"
                  busy={isSharing}
                  accessibilityLabel={t('proof.share.a11y')}
                  onPress={() => {
                    void handleShare();
                  }}
                />
              </View>

              {shareError !== null ? <Text style={styles.shareError}>{shareError}</Text> : null}

              <ActionButton
                label={t('proof.background.pick')}
                variant="outline"
                tone="gold"
                onPress={() => {
                  void pickBackground();
                }}
              />
              {proofBackgroundUri.length > 0 ? (
                <ActionButton
                  label={t('proof.background.clear')}
                  variant="ghost"
                  sound="deny"
                  onPress={() => setProofBackgroundUri('')}
                />
              ) : null}

              <ActionButton label={t('common.close')} variant="ghost" onPress={onClose} />
            </View>
        </ScrollView>
      </View>
    </ModalSheet>
  );
}

function ProofCardBody({ profile }: { profile: UserProfile }): ReactElement {
  const t = useTranslator();
  const achievements = useGrailStore((state) => state.achievements);
  const talents = useGrailStore((state) => state.talents);
  const campaigns = useGrailStore((state) => state.campaigns);
  const disciplineCompleted = useGrailStore((state) => state.disciplineCompleted);
  const goal = createdCampaign(campaigns);
  const stageId = currentDisciplineStep(disciplineCompleted);
  const gifts = talents.map((node) => node.title).filter((title) => title.length > 0);

  return (
    <View style={styles.cardBody}>
      <Text style={styles.manifesto}>
        {profile.name.length > 0 ? profile.name : t('proof.who')}
      </Text>
      <View
        accessible
        accessibilityLabel={`${t('proof.creed.honesty')} ${t('proof.creed.lie')}`}
        style={styles.creed}
      >
        <Text style={styles.creedHonesty}>{t('proof.creed.honesty')}</Text>
        <Text style={styles.creedLie}>{t('proof.creed.lie')}</Text>
      </View>

      <ProofOctagonMark profile={profile} />

      <Text style={styles.sectionHeading}>{t('proof.achievements')}</Text>
      {achievements.length === 0 ? (
        <Text style={styles.sectionEmpty}>{t('proof.achievements.empty')}</Text>
      ) : (
        achievements.slice(0, 8).map((item) => (
          <Text key={item.id} style={styles.sectionLine}>
            {item.detail.length > 0 ? `${item.title} · ${item.detail}` : item.title}
          </Text>
        ))
      )}

      <Text style={styles.sectionHeading}>{t('proof.goal')}</Text>
      <Text style={goal === undefined ? styles.sectionEmpty : styles.sectionLine}>
        {goal === undefined ? t('proof.goal.empty') : goal.title}
      </Text>

      <Text style={styles.sectionHeading}>{t('proof.stage')}</Text>
      <Text style={styles.sectionLine}>{t(disciplineStepTitleKey(stageId))}</Text>

      <Text style={styles.sectionHeading}>{t('proof.gifts')}</Text>
      {gifts.length === 0 ? (
        <Text style={styles.sectionEmpty}>{t('proof.gifts.empty')}</Text>
      ) : (
        gifts.slice(0, 12).map((title, index) => (
          <Text key={`${title}-${index}`} style={styles.sectionLine}>
            {title}
          </Text>
        ))
      )}
    </View>
  );
}

function ProofOctagonMark({ profile }: { profile: UserProfile }): ReactElement {
  const t = useTranslator();
  const tasks = useGrailStore((state) => state.tasks);
  const shadowEvents = useGrailStore((state) => state.shadowEvents);
  const size = 196;
  const center = size / 2;
  const maxRadius = 56;
  const labelRadius = maxRadius + 24;
  const asOf = localDateKey();
  const daily = getDailyDimensionProgress(tasks, asOf);
  const shadowShares = computeAllShadowShares(shadowEvents, asOf);
  const shadowVisible = HUMAN_DIMENSION_IDS.some((id) => (shadowShares[id] ?? 0) > 0);
  const lifePoints = HUMAN_DIMENSION_IDS.map((id, index) => {
    const score = profile.dimensions[id]?.score ?? 0;
    return getOctagonPoint(index, OCTAGON_SIDE_COUNT, score, maxRadius, center);
  });
  const dailyPoints = HUMAN_DIMENSION_IDS.map((id, index) =>
    getOctagonPoint(index, OCTAGON_SIDE_COUNT, daily[id]?.score ?? 0, maxRadius, center),
  );
  const shadowPoints = HUMAN_DIMENSION_IDS.map((id, index) =>
    getOctagonPoint(index, OCTAGON_SIDE_COUNT, shadowShares[id] ?? 0, maxRadius, center),
  );

  return (
    <View style={styles.markWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Polygon
          points={toSvgPoints(getOctagonRingPoints(OCTAGON_SIDE_COUNT, 100, maxRadius, center))}
          fill="none"
          stroke={MARK_RING}
          strokeWidth={1}
        />
        {HUMAN_DIMENSION_IDS.map((id, index) => {
          const outer = getOctagonPoint(index, OCTAGON_SIDE_COUNT, OCTAGON_VALUE_MAX, maxRadius, center);
          return (
            <Line
              key={id}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke={MARK_AXIS}
              strokeWidth={1}
            />
          );
        })}
        <Polygon
          points={toSvgPoints(dailyPoints)}
          fill={colors.chart.lifeFill}
          stroke={colors.chart.lifeStroke}
          strokeWidth={1.4}
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
        {shadowVisible ? (
          <Polygon
            points={toSvgPoints(shadowPoints)}
            fill={colors.chart.shadowFill}
            stroke="none"
            strokeLinejoin="round"
          />
        ) : null}
        <Polygon
          points={toSvgPoints(lifePoints)}
          fill={colors.chart.coreFill}
          stroke={colors.chart.coreStroke}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <Circle cx={center} cy={center} r={2.4} fill={colors.accent.gold} />
        {HUMAN_DIMENSION_IDS.map((id, index) => {
          const placement = getOctagonLabelPlacement(index, OCTAGON_SIDE_COUNT, labelRadius, center);
          const score = profile.dimensions[id]?.score ?? 0;

          return (
            <G key={`label-${id}`}>
              <SvgText
                x={placement.x}
                y={placement.y}
                fill={colors.chart.label}
                fontSize={8}
                fontWeight="700"
                textAnchor={placement.anchor}
                alignmentBaseline="middle"
              >
                {t(dimensionShortKey(id))}
              </SvgText>
              <SvgText
                x={placement.x}
                y={placement.y + 10}
                fill={colors.accent.gold}
                fontSize={8}
                fontWeight="700"
                textAnchor={placement.anchor}
                alignmentBaseline="middle"
              >
                {formatVectorPercent(score)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 1, y: 1 } as const;
const CARD_GRADIENT = gradients.proofCard;
const PHOTO_OVERLAY = [
  withAlpha(colors.void, 0.62),
  withAlpha(colors.ink, 0.78),
] as const;
const MARK_RING = withAlpha(colors.accent.cyanBright, 0.22);
const MARK_AXIS = withAlpha(colors.accent.gold, 0.28);

const styles = StyleSheet.create({
  sheet: {
    ...glow(colors.accent.cyanBright, 0.35, 28),
  },
  sheetContent: {
    paddingBottom: space.xs,
  },
  shot: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  card: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: withAlpha(colors.accent.gold, 0.35),
    overflow: 'hidden',
  },
  cardFill: {
    borderRadius: radius.xxl,
  },
  neonFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: MARK_RING,
    pointerEvents: 'none',
  },
  cardBody: {
    paddingHorizontal: space.xxl - 2,
    paddingTop: space.xl,
    paddingBottom: space.xxl - 2,
  },
  manifesto: {
    ...typography.displaySm,
    color: colors.text.ivory,
  },
  creed: {
    marginTop: space.sm,
    gap: space.hair,
  },
  creedHonesty: {
    ...typography.motto,
    color: colors.accent.goldMuted,
  },
  creedLie: {
    ...typography.motto,
    color: colors.text.faint,
  },
  markWrap: {
    alignItems: 'center',
    marginTop: space.md,
    marginBottom: space.sm,
  },
  sectionHeading: {
    ...typography.eyebrow,
    marginTop: space.md,
    color: colors.accent.goldMuted,
  },
  sectionLine: {
    ...typography.body,
    marginTop: space.xs,
    color: colors.text.primary,
  },
  sectionEmpty: {
    ...typography.caption,
    marginTop: space.xs,
    color: colors.text.faint,
  },
  actions: {
    paddingHorizontal: space.xxl - 2,
    paddingBottom: space.lg + 2,
    paddingTop: space.md + 2,
    gap: space.sm + 2,
    backgroundColor: colors.ink,
  },
  shareGlow: {
    ...glow(colors.accent.cyanBright, 0.5, 18),
  },
  shareError: {
    ...typography.captionStrong,
    textAlign: 'center',
    color: colors.state.burned,
  },
});
