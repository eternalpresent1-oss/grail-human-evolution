import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampaignCountdownView } from '@/components/CampaignCountdown';
import { KeyboardInsetScrollView } from '@/components/KeyboardInsetScrollView';
import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  campaignAdviceInstructionKey,
  campaignAdviceTitleKey,
  dimensionNameKey,
  dimensionShortKey,
} from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
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
  MAX_PENDING_CAMPAIGN_ATOMS,
  activeCampaign,
  campaignVectorIds,
  type Campaign,
} from '@/types/campaign';
import { HUMAN_DIMENSION_IDS, type HumanDimensionId } from '@/types/grail';
import {
  campaignMonthsLeft,
  countPendingCampaignAtoms,
  horizonFromYearsMonths,
  toggleSupporting,
} from '@/utils/campaign';
import { proposeCampaignAdvice } from '@/utils/campaignCompiler';
import { localDateKey } from '@/utils/taskTime';

export default function CampaignScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const campaigns = useGrailStore((state) => state.campaigns);
  const campaign = activeCampaign(campaigns);

  const mode =
    campaign === undefined ? 'create' : campaign.vectorsConfirmed ? 'orders' : 'vectors';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.screenGrail}
        locations={gradientStops.screenGrail}
        style={StyleSheet.absoluteFill}
      />

      {mode === 'create' ? (
        <CreateStep topInset={Math.max(insets.top, layout.screenTopMin)} bottomInset={insets.bottom} />
      ) : (
        <KeyboardInsetScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, layout.screenTopMin),
              paddingBottom: space.xxxl + insets.bottom + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CampaignHeader onClose={() => router.back()} />

          {mode === 'vectors' && campaign !== undefined ? (
            <VectorStep key={campaign.id} campaign={campaign} />
          ) : null}

          {mode === 'orders' && campaign !== undefined ? (
            <OrdersStep key={campaign.id} campaign={campaign} />
          ) : null}
        </KeyboardInsetScrollView>
      )}
    </View>
  );
}

function CampaignHeader({ onClose }: { onClose: () => void }): ReactElement {
  const t = useTranslator();

  return (
    <ScreenHeader
      kicker={t('campaign.kicker')}
      title={t('campaign.title')}
      tone="gold"
      actions={
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      }
    >
      <Text style={styles.subtitle}>{t('campaign.subtitle')}</Text>
    </ScreenHeader>
  );
}

function CreateStep({
  topInset,
  bottomInset,
}: {
  topInset: number;
  bottomInset: number;
}): ReactElement {
  const t = useTranslator();
  const router = useRouter();
  const startCampaign = useGrailStore((state) => state.startCampaign);
  const [title, setTitle] = useState('');
  const [years, setYears] = useState('5');
  const [months, setMonths] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const onStart = (): void => {
    const horizon = horizonFromYearsMonths(parseCount(years), parseCount(months));
    if (title.trim().length === 0) {
      setError(t('campaign.field.goal.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (horizon === null) {
      setError(t('campaign.field.horizon.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    startCampaign(title, horizon);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardInsetScrollView
      keyboardPad={false}
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset, paddingBottom: Math.max(bottomInset, space.lg) },
      ]}
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets={false}
    >
      <CampaignHeader onClose={() => router.back()} />
      <View style={styles.block}>
        <Text style={styles.hint}>{t('campaign.example')}</Text>

        <Text style={styles.fieldLabel}>{t('campaign.field.goal')}</Text>
        <TextInput
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (error !== null) {
              setError(null);
            }
          }}
          placeholder={t('campaign.field.goal.placeholder')}
          placeholderTextColor={colors.text.faint}
          accessibilityLabel={t('campaign.field.goal')}
          style={[styles.input, error !== null ? styles.inputError : null]}
          maxLength={120}
        />

        <Text style={styles.fieldLabel}>{t('campaign.field.horizon')}</Text>
        <View style={styles.horizonRow}>
          <TextInput
            value={years}
            onChangeText={(value) => setYears(digitsOnly(value))}
            keyboardType="number-pad"
            accessibilityLabel={t('campaign.field.years')}
            style={[styles.input, styles.horizonInput]}
          />
          <Text style={styles.horizonUnit}>{t('campaign.field.years')}</Text>
          <TextInput
            value={months}
            onChangeText={(value) => setMonths(digitsOnly(value))}
            keyboardType="number-pad"
            accessibilityLabel={t('campaign.field.months')}
            style={[styles.input, styles.horizonInput]}
          />
          <Text style={styles.horizonUnit}>{t('campaign.field.months')}</Text>
        </View>

        {error !== null ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.startBar}>
          <ActionButton label={t('campaign.start')} tone="gold" onPress={onStart} />
        </View>
      </View>
    </KeyboardInsetScrollView>
  );
}

function VectorStep({ campaign }: { campaign: Campaign }): ReactElement {
  const t = useTranslator();
  const setCampaignVectors = useGrailStore((state) => state.setCampaignVectors);
  const confirmCampaignVectors = useGrailStore((state) => state.confirmCampaignVectors);
  const [primary, setPrimary] = useState(campaign.primary);
  const [supporting, setSupporting] = useState(campaign.supporting);

  const onPrimary = (id: HumanDimensionId): void => {
    setPrimary(id);
    setSupporting((current) => current.filter((item) => item !== id));
  };

  const onConfirm = (): void => {
    setCampaignVectors(campaign.id, primary, supporting);
    confirmCampaignVectors(campaign.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.block}>
      <Text style={styles.kicker}>{t('campaign.vectors.kicker')}</Text>
      <Text style={styles.blockTitle}>{campaign.title}</Text>

      <Text style={styles.fieldLabel}>{t('campaign.vectors.primary')}</Text>
      <View style={styles.chipGrid}>
        {HUMAN_DIMENSION_IDS.map((id) => (
          <Chip
            key={`primary-${id}`}
            label={t(dimensionShortKey(id))}
            active={id === primary}
            onPress={() => onPrimary(id)}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>{t('campaign.vectors.supporting')}</Text>
      <View style={styles.chipGrid}>
        {HUMAN_DIMENSION_IDS.filter((id) => id !== primary).map((id) => (
          <Chip
            key={`support-${id}`}
            label={t(dimensionShortKey(id))}
            active={supporting.includes(id)}
            onPress={() => setSupporting((current) => toggleSupporting(current, id, primary))}
          />
        ))}
      </View>

      <ActionButton
        label={t('campaign.vectors.confirm')}
        tone="gold"
        onPress={onConfirm}
        style={styles.action}
      />
    </View>
  );
}

function OrdersStep({ campaign }: { campaign: Campaign }): ReactElement {
  const t = useTranslator();
  const router = useRouter();
  const tasks = useGrailStore((state) => state.tasks);
  const acceptCampaignAdvice = useGrailStore((state) => state.acceptCampaignAdvice);
  const addCampaignAtom = useGrailStore((state) => state.addCampaignAtom);
  const completeCampaign = useGrailStore((state) => state.completeCampaign);
  const shelveCampaign = useGrailStore((state) => state.shelveCampaign);
  const declareCampaign = useGrailStore((state) => state.declareCampaign);
  const setDisciplineBeacon = useGrailStore((state) => state.setDisciplineBeacon);
  const advice = proposeCampaignAdvice(campaign);
  const pending = countPendingCampaignAtoms(tasks, campaign.id);
  const full = pending >= MAX_PENDING_CAMPAIGN_ATOMS;
  const monthsLeft = campaignMonthsLeft(campaign, localDateKey());
  const [ownTitle, setOwnTitle] = useState('');
  const [ownDimension, setOwnDimension] = useState<HumanDimensionId>(campaign.primary);
  const [ownOpen, setOwnOpen] = useState(false);

  const onTake = (id: (typeof advice)[number]['id']): void => {
    if (full) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    acceptCampaignAdvice(campaign.id, id, {
      title: t(campaignAdviceTitleKey(id)),
      instruction: t(campaignAdviceInstructionKey(id)),
      dimensionId: advice.find((item) => item.id === id)?.dimensionId ?? campaign.primary,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onOwn = (): void => {
    if (full || ownTitle.trim().length === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    addCampaignAtom(campaign.id, { title: ownTitle, dimensionId: ownDimension });
    setOwnTitle('');
    setOwnOpen(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.block}>
      <Text style={styles.kicker}>{t('campaign.orders.kicker')}</Text>
      <Text style={styles.blockTitle}>{campaign.title}</Text>
      <Text style={styles.hint}>
        {campaign.created
          ? null
          : `${t('campaign.horizon', { months: monthsLeft })}  ·  `}
        {campaignVectorIds(campaign)
          .map((id) => t(dimensionShortKey(id)))
          .join(' · ')}
      </Text>
      {campaign.created ? <CampaignCountdownView campaign={campaign} /> : null}
      {full ? <Text style={styles.error}>{t('campaign.orders.full')}</Text> : null}

      {advice.map((item) => (
        <View key={item.id} style={styles.adviceCard}>
          <Text style={styles.adviceKicker}>{t(dimensionNameKey(item.dimensionId))}</Text>
          <Text style={styles.adviceTitle}>{t(campaignAdviceTitleKey(item.id))}</Text>
          <Text style={styles.adviceBody}>{t(campaignAdviceInstructionKey(item.id))}</Text>
          <ActionButton
            label={t('campaign.orders.take')}
            variant="outline"
            tone="bevel"
            sound="confirm"
            disabled={full}
            onPress={() => onTake(item.id)}
            style={styles.adviceAction}
          />
        </View>
      ))}

      <ActionButton
        label={t('campaign.own.add')}
        variant="outline"
        tone="gold"
        sound="none"
        disabled={full}
        onPress={() => setOwnOpen(true)}
        style={styles.action}
      />

      <ModalSheet
        visible={ownOpen}
        onClose={() => setOwnOpen(false)}
        align="bottom"
        avoidKeyboard
        accessibilityLabel={t('campaign.own.add')}
      >
        <View style={styles.ownSheet}>
          <View style={styles.ownHead}>
            <Text style={styles.ownTitle}>{t('campaign.own.add')}</Text>
            <Pressable
              onPress={() => setOwnOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={layout.hitSlop}
              style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.closeLabel}>✕</Text>
            </Pressable>
          </View>
          <TextInput
            value={ownTitle}
            onChangeText={setOwnTitle}
            placeholder={t('campaign.own.placeholder')}
            placeholderTextColor={colors.text.faint}
            accessibilityLabel={t('campaign.own.placeholder')}
            style={styles.input}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onOwn}
          />
          <View style={styles.chipGrid}>
            {HUMAN_DIMENSION_IDS.map((id) => (
              <Chip
                key={`own-${id}`}
                label={t(dimensionShortKey(id))}
                active={id === ownDimension}
                onPress={() => setOwnDimension(id)}
              />
            ))}
          </View>
          <ActionButton
            label={t('campaign.own.add')}
            variant="outline"
            tone="gold"
            sound="confirm"
            disabled={full}
            onPress={onOwn}
            style={styles.action}
          />
          <ActionButton
            label={t('common.cancel')}
            variant="ghost"
            sound="deny"
            onPress={() => setOwnOpen(false)}
          />
        </View>
      </ModalSheet>

      {campaign.created ? (
        <ActionButton
          label={t('campaign.complete')}
          tone="gold"
          onPress={() => {
            completeCampaign(campaign.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          }}
          style={styles.action}
        />
      ) : (
        <ActionButton
          label={t('campaign.created')}
          tone="gold"
          onPress={() => {
            declareCampaign(campaign.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          }}
          style={styles.action}
        />
      )}
      <ActionButton
        label={t('campaign.cancel')}
        variant="outline"
        tone="bevel"
        sound="deny"
        onPress={() => {
          shelveCampaign(campaign.id);
          setDisciplineBeacon(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.back();
        }}
        style={styles.action}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, '').slice(0, 3);
}

function parseCount(value: string): number {
  if (value.length === 0) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.void,
  },
  scroll: {
    flex: 1,
  },
  startBar: {
    marginTop: space.lg,
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
  block: {
    marginTop: space.xxl,
  },
  kicker: {
    ...typography.micro,
    color: colors.accent.goldMuted,
  },
  blockTitle: {
    ...typography.heading,
    marginTop: space.sm,
    color: colors.text.ivory,
  },
  hint: {
    ...typography.caption,
    marginTop: space.sm,
    color: colors.text.muted,
  },
  fieldLabel: {
    ...typography.captionStrong,
    marginTop: space.lg,
    marginBottom: space.sm,
    color: colors.text.primary,
  },
  input: {
    ...typography.input,
    minHeight: 52,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.sunken,
    color: colors.text.primary,
    paddingHorizontal: space.lg - 2,
    paddingVertical: space.md,
  },
  inputError: {
    borderColor: colors.border.danger,
  },
  horizonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  horizonInput: {
    flex: 1,
    textAlign: 'center',
  },
  horizonUnit: {
    ...typography.caption,
    color: colors.text.muted,
  },
  error: {
    ...typography.captionStrong,
    marginTop: space.sm,
    color: colors.state.danger,
  },
  action: {
    marginTop: space.lg,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.panel,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.border.gold,
    backgroundColor: colors.tint.goldStrong,
  },
  chipLabel: {
    ...typography.captionStrong,
    color: colors.text.muted,
  },
  chipLabelActive: {
    color: colors.text.primary,
  },
  adviceCard: {
    marginTop: space.md,
    borderRadius: radius.lg,
    padding: space.lg,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  adviceKicker: {
    ...typography.micro,
    color: colors.accent.cyanMuted,
  },
  adviceTitle: {
    ...typography.labelLg,
    marginTop: space.snug,
    color: colors.text.ivory,
  },
  adviceBody: {
    ...typography.body,
    marginTop: space.sm,
    color: colors.text.muted,
  },
  adviceAction: {
    marginTop: space.md,
  },
  ownSheet: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  ownHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.sm,
  },
  ownTitle: {
    ...typography.modalTitle,
    flex: 1,
    color: colors.text.ivory,
  },
});
