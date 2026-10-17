import { type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslator } from '@/i18n/TranslatorProvider';
import { type TranslationKey } from '@/i18n';
import { colors, motion, radius, space, typography } from '@/theme';
import { formatEuropeanDate, isoWeekday, shiftDateKey, weekMondayOf } from '@/utils/taskTime';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

interface DayCalendarStripProps {
  selectedDate: string;
  today: string;
  /** Monday of the first-launch week. Earlier weeks are not part of this life. */
  earliestMonday: string;
  onSelect: (dateKey: string) => void;
}

export function DayCalendarStrip({
  selectedDate,
  today,
  earliestMonday,
  onSelect,
}: DayCalendarStripProps): ReactElement {
  const t = useTranslator();
  const monday = weekMondayOf(selectedDate);
  const previousMonday = shiftDateKey(monday, -7);
  const canGoBack = previousMonday >= earliestMonday;

  return (
    <View style={styles.root}>
      <View style={styles.nav}>
        <Pressable
          onPress={canGoBack ? () => onSelect(previousMonday) : undefined}
          disabled={!canGoBack}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGoBack }}
          accessibilityLabel={t('atomizer.calendar.prev')}
          style={({ pressed }) => [
            styles.navButton,
            canGoBack ? null : styles.navDisabled,
            pressed && canGoBack ? styles.pressed : null,
          ]}
        >
          <Text style={styles.navLabel}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => onSelect(today)}
          accessibilityRole="button"
          accessibilityLabel={t('atomizer.calendar.today')}
          style={({ pressed }) => [styles.todayChip, pressed ? styles.pressed : null]}
        >
          <Text style={styles.todayLabel}>{t('atomizer.calendar.today')}</Text>
        </Pressable>
        <Pressable
          onPress={() => onSelect(shiftDateKey(monday, 7))}
          accessibilityRole="button"
          accessibilityLabel={t('atomizer.calendar.next')}
          style={({ pressed }) => [styles.navButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.navLabel}>›</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.days}
      >
        {WEEKDAYS.map((weekday) => {
          const dateKey = shiftDateKey(monday, weekday - 1);
          const selected = dateKey === selectedDate;
          const isToday = dateKey === today;
          const dowKey = `atomizer.dow.${isoWeekday(dateKey)}` as TranslationKey;

          const europeanDate = formatEuropeanDate(dateKey);

          return (
            <Pressable
              key={dateKey}
              onPress={() => onSelect(dateKey)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${t(dowKey)} ${europeanDate}`}
              style={({ pressed }) => [
                styles.day,
                selected ? styles.daySelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.dow, selected ? styles.dowSelected : null]}>{t(dowKey)}</Text>
              <Text style={[styles.date, selected ? styles.dateSelected : null]}>
                {europeanDate.slice(0, 2)}
              </Text>
              {isToday ? <View style={styles.todayDot} /> : <View style={styles.todayDotSpacer} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: space.md,
    gap: space.sm,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.35,
  },
  navLabel: {
    ...typography.cardTitle,
    color: colors.text.primary,
  },
  todayChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.tint.goldStrong,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  todayLabel: {
    ...typography.captionStrong,
    color: colors.text.primary,
  },
  days: {
    gap: space.sm,
  },
  day: {
    width: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.panel,
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  daySelected: {
    borderColor: colors.border.cyanStrong,
    backgroundColor: colors.tint.cyanStrong,
  },
  dow: {
    ...typography.micro,
    color: colors.text.faint,
  },
  dowSelected: {
    color: colors.accent.cyanMuted,
  },
  date: {
    ...typography.labelLg,
    marginTop: space.hair,
    color: colors.text.muted,
    fontVariant: ['tabular-nums'],
  },
  dateSelected: {
    color: colors.text.primary,
  },
  todayDot: {
    marginTop: space.xs,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent.gold,
  },
  todayDotSpacer: {
    marginTop: space.xs,
    width: 4,
    height: 4,
  },
  pressed: {
    opacity: motion.pressOpacity,
    transform: [{ scale: motion.pressScale }],
  },
});
