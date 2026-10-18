import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GlassPanel } from '@/components/GlassPanel';
import { VectorInfoSheet } from '@/components/VectorInfoSheet';
import { dimensionNameKey, type Translator } from '@/i18n';
import { colors, motion, radius, space, typography } from '@/theme';
import { type Campaign } from '@/types/campaign';
import { type HumanDimensionId } from '@/types/grail';
import { campaignRemainingParts } from '@/utils/campaign';
import { formatScore } from '@/utils/formatScore';
import { type MethodWeekRow, type MethodWeekTable } from '@/utils/methodWeek';

function cellValue(value: number | null): string {
  return value === null ? '—' : `${formatScore(value)}%`;
}

type InfoTarget =
  | { readonly kind: 'dimension'; readonly dimensionId: HumanDimensionId }
  | { readonly kind: 'text'; readonly title: string; readonly blurb: string };

function infoForRow(row: MethodWeekRow, t: Translator): InfoTarget | null {
  if (row.kind === 'dimension' && row.dimensionId !== undefined) {
    return { kind: 'dimension', dimensionId: row.dimensionId };
  }
  if (row.kind === 'life') {
    return {
      kind: 'text',
      title: t('review.row.life'),
      blurb: t('guide.discipline.body'),
    };
  }
  if (row.kind === 'shadow') {
    return {
      kind: 'text',
      title: t('review.row.shadow'),
      blurb: t('guide.shadow.body'),
    };
  }
  return null;
}

export function MethodWeekPanel({
  t,
  table,
  campaign,
  asOf,
}: {
  t: Translator;
  table: MethodWeekTable;
  campaign: Campaign | undefined;
  asOf: string;
}): ReactElement {
  const [info, setInfo] = useState<InfoTarget | null>(null);
  const remaining =
    campaign === undefined ? null : campaignRemainingParts(campaign, asOf);

  const openInfo = (row: MethodWeekRow): void => {
    const target = infoForRow(row, t);
    if (target === null) {
      return;
    }
    setInfo(target);
    void Haptics.selectionAsync();
  };

  return (
    <GlassPanel style={styles.panel} intensity={34}>
      <Text style={styles.title}>{t('review.title')}</Text>

      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cellLabel, styles.headerCell]}>{t('review.col.metric')}</Text>
          <Text style={[styles.cellValue, styles.headerCell]}>{t('review.col.was')}</Text>
          <Text style={[styles.cellValue, styles.headerCell]}>{t('review.col.became')}</Text>
        </View>

        {table.rows.map((row) => {
          const label =
            row.kind === 'dimension' && row.dimensionId !== undefined
              ? t(dimensionNameKey(row.dimensionId))
              : row.kind === 'life'
                ? t('review.row.life')
                : t('review.row.shadow');

          return (
            <Pressable
              key={row.id}
              onPress={() => openInfo(row)}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <Text style={styles.cellLabel} numberOfLines={2}>
                {label}
              </Text>
              <Text style={styles.cellValue}>{cellValue(row.was)}</Text>
              <Text style={styles.cellValue}>{cellValue(row.became)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.goalLine}>
        {campaign === undefined || remaining === null
          ? t('review.goal.none')
          : t('review.goal.left', {
              title: campaign.title,
              months: remaining.months,
              days: remaining.days,
            })}
      </Text>

      <VectorInfoSheet
        dimensionId={info?.kind === 'dimension' ? info.dimensionId : null}
        title={info?.kind === 'text' ? info.title : null}
        blurb={info?.kind === 'text' ? info.blurb : undefined}
        onClose={() => setInfo(null)}
      />
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: space.md,
    borderRadius: radius.xl,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.sm,
  },
  title: {
    ...typography.heading,
    color: colors.accent.goldMuted,
  },
  table: {
    marginTop: space.xs,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
    paddingVertical: space.xs + 1,
    paddingHorizontal: space.sm,
    gap: space.xs,
  },
  headerRow: {
    backgroundColor: colors.tint.cyan,
  },
  cellLabel: {
    ...typography.caption,
    flex: 1.4,
    color: colors.text.muted,
  },
  cellValue: {
    ...typography.captionStrong,
    flex: 0.8,
    textAlign: 'right',
    color: colors.text.primary,
  },
  headerCell: {
    ...typography.captionStrong,
    color: colors.text.muted,
  },
  goalLine: {
    ...typography.bodyStrong,
    marginTop: space.sm,
    color: colors.text.muted,
  },
  pressed: {
    opacity: motion.pressOpacity,
  },
});
