import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, space, typography } from '@/theme';
import { type Campaign } from '@/types/campaign';
import { campaignCountdown } from '@/utils/campaign';

export function CampaignCountdownView({ campaign }: { campaign: Campaign }): ReactElement {
  const t = useTranslator();
  const [now, setNow] = useState(() => Date.now());
  const parts = campaignCountdown(campaign, new Date(now));

  useEffect(() => {
    if (parts.ended) {
      return;
    }

    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(id);
    };
  }, [parts.ended]);

  if (parts.ended) {
    return <Text style={styles.ended}>{t('campaign.countdown.ended')}</Text>;
  }

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t('campaign.countdown.a11y', {
        days: parts.days,
        hours: pad(parts.hours),
        minutes: pad(parts.minutes),
        seconds: pad(parts.seconds),
      })}
    >
      <Text style={styles.kicker}>{t('campaign.countdown.left')}</Text>
      <View style={styles.row}>
        <Unit value={String(parts.days)} label={t('campaign.countdown.days')} />
        <Unit value={pad(parts.hours)} label={t('campaign.countdown.hours')} />
        <Unit value={pad(parts.minutes)} label={t('campaign.countdown.minutes')} />
        <Unit value={pad(parts.seconds)} label={t('campaign.countdown.seconds')} />
      </View>
    </View>
  );
}

function Unit({ value, label }: { value: string; label: string }): ReactElement {
  return (
    <View style={styles.unit}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

const styles = StyleSheet.create({
  kicker: {
    ...typography.micro,
    marginTop: space.sm,
    color: colors.accent.gold,
  },
  row: {
    flexDirection: 'row',
    marginTop: space.sm,
    gap: space.sm,
  },
  unit: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    ...typography.metricSm,
    color: colors.text.ivory,
  },
  label: {
    ...typography.micro,
    marginTop: space.xs,
    color: colors.text.faint,
  },
  ended: {
    ...typography.captionStrong,
    marginTop: space.sm,
    color: colors.state.danger,
  },
});
