import { useMemo, useState, type ReactElement } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateAtomModal } from '@/components/CreateAtomModal';
import { DayCalendarStrip } from '@/components/DayCalendarStrip';
import { DayVerdictCard } from '@/components/DayVerdictCard';
import { GlassPanel } from '@/components/GlassPanel';
import { MethodWeekPanel } from '@/components/MethodWeekPanel';
import { RestoreAtomModal } from '@/components/RestoreAtomModal';
import { ShadowConfessSheet } from '@/components/ShadowConfessSheet';
import { TaskAtomCard } from '@/components/TaskAtomCard';
import { TaskRitualSheet } from '@/components/TaskRitualSheet';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { dimensionNameKey, dimensionShortKey, type Translator } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
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
import { useGrailStore } from '@/store/useGrailStore';
import { createdCampaign } from '@/types/campaign';
import {
  getDailyDimensionProgress,
  HUMAN_DIMENSION_IDS,
  isOnAtomizerDay,
  type AtomizedTask,
  type DailyVectorProgress,
  type HumanDimensionId,
} from '@/types/grail';
import { countCanonWeek } from '@/utils/canonWeek';
import {
  computeDayDisciplineScore,
  computeDisciplineScore,
  computeHistoricalDayDisciplineScore,
} from '@/utils/discipline';
import { dayVerdict } from '@/utils/dayVerdict';
import { chronicleWeekStart } from '@/utils/firstOpen';
import { formatScore } from '@/utils/formatScore';
import { methodWeekTable } from '@/utils/methodWeek';
import { isoWeekday, localDateKey, weekMondayOf } from '@/utils/taskTime';

type DimensionFilter = 'all' | HumanDimensionId;

export default function AtomizerScreen(): ReactElement {
  const t = useTranslator();
  const insets = useSafeAreaInsets();
  const tasks = useGrailStore((state) => state.tasks);
  const profile = useGrailStore((state) => state.profile);
  const absorbTask = useGrailStore((state) => state.absorbTask);
  const burnTask = useGrailStore((state) => state.burnTask);
  const restoreTask = useGrailStore((state) => state.restoreTask);
  const removeTask = useGrailStore((state) => state.removeTask);
  const eraseChronicle = useGrailStore((state) => state.eraseChronicle);
  const [filter, setFilter] = useState<DimensionFilter>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShadowOpen, setIsShadowOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ritualTask, setRitualTask] = useState<AtomizedTask | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AtomizedTask | null>(null);
  const today = localDateKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const earliestMonday = chronicleWeekStart(profile.firstOpenOn ?? today);
  const viewDate = selectedDate < earliestMonday ? today : selectedDate;

  const isSunday = isoWeekday(viewDate) === 7;
  const campaigns = useGrailStore((state) => state.campaigns);
  const shadowEvents = useGrailStore((state) => state.shadowEvents);
  const weekFieldMarks = useGrailStore((state) => state.weekFieldMarks);
  const campaign = createdCampaign(campaigns);
  const isPastDay = viewDate < today;
  const isToday = viewDate === today;
  const canonWeek = countCanonWeek(tasks, weekMondayOf(viewDate));
  const dayDiscipline = isPastDay
    ? computeHistoricalDayDisciplineScore({
        tasks,
        day: viewDate,
        today,
        shadowEvents,
      })
    : computeDayDisciplineScore({ tasks, today, shadowEvents });
  const lifeDiscipline = computeDisciplineScore({
    tasks,
    today,
    journal: profile.promiseJournal,
    firstOpenOn: profile.firstOpenOn,
    shadowEvents,
  });
  const methodTable = useMemo(
    () => (isSunday && viewDate <= today ? methodWeekTable(weekFieldMarks ?? {}, viewDate) : null),
    [isSunday, viewDate, today, weekFieldMarks],
  );

  const visibleTasks = useMemo(() => {
    const roster = tasks.filter((task) => isOnAtomizerDay(task, viewDate, today));

    if (filter === 'all') {
      return roster;
    }

    return roster.filter(
      (task) => task.dimensionId === filter || task.dualDimensionId === filter,
    );
  }, [filter, viewDate, tasks, today]);

  const activeTasks = useMemo(
    () => visibleTasks.filter((task) => task.ritualState === 'pending'),
    [visibleTasks],
  );

  const historyTasks = useMemo(
    () => visibleTasks.filter((task) => task.ritualState !== 'pending'),
    [visibleTasks],
  );

  const groupedTasks = useMemo(() => {
    return HUMAN_DIMENSION_IDS.flatMap((dimensionId) => {
      const dimensionTasks = activeTasks.filter((task) => task.dimensionId === dimensionId);
      if (dimensionTasks.length === 0) {
        return [];
      }

      return [
        {
          dimensionId,
          tasks: dimensionTasks,
        },
      ];
    });
  }, [activeTasks]);

  const dailyProgress = useMemo(
    () => getDailyDimensionProgress(tasks, viewDate),
    [viewDate, tasks],
  );

  const verdict = useMemo(
    () => dayVerdict(tasks, viewDate, today, shadowEvents),
    [viewDate, shadowEvents, tasks, today],
  );

  const onAbsorb = (taskId: string): void => {
    absorbTask(taskId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onBurn = (taskId: string): void => {
    burnTask(taskId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const onRestore = (taskId: string): void => {
    restoreTask(taskId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const onRemove = (taskId: string): void => {
    removeTask(taskId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const onEraseChronicle = (taskId: string): void => {
    eraseChronicle(taskId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.screenAtoms}
        locations={gradientStops.screenAtoms}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, layout.screenTopMin) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GlassPanel style={styles.hero} intensity={32}>
          <ScreenHeader
            kicker={t('atomizer.kicker')}
            title={t('atomizer.title')}
            actions={<SettingsButton />}
          >
            <Text style={styles.subtitle}>
              {isToday && isSunday
                ? t('atomizer.subtitle.sunday', {
                    life: formatScore(lifeDiscipline),
                    kept: canonWeek.kept,
                    promised: canonWeek.promised,
                  })
                : isToday
                  ? t('atomizer.subtitle', {
                      today: formatScore(dayDiscipline),
                      kept: canonWeek.kept,
                      promised: canonWeek.promised,
                    })
                  : t('atomizer.subtitle.past', {
                      kept: canonWeek.kept,
                      promised: canonWeek.promised,
                    })}
            </Text>
            <Text style={styles.canonHint}>{t('atomizer.canon.hint')}</Text>
          </ScreenHeader>
        </GlassPanel>

        {isPastDay ? null : (
          <View style={styles.toolRow}>
            <Pressable
              onPress={() => setHistoryOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: historyOpen }}
              accessibilityLabel={t('atomizer.history.title')}
              style={({ pressed }) => [styles.toolChip, pressed ? styles.pressed : null]}
            >
              <Text style={styles.toolChipLabel}>
                {t('atomizer.history.title')}
                {historyTasks.length > 0 ? `  ${historyOpen ? '▾' : '▸'} ${historyTasks.length}` : ''}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsCreateModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('atomizer.cta.label')}
              style={({ pressed }) => [styles.toolChip, pressed ? styles.pressed : null]}
            >
              <Text style={styles.toolChipLabel}>{t('atomizer.cta.label')}</Text>
            </Pressable>
          </View>
        )}

        {isPastDay || !historyOpen || historyTasks.length === 0 ? null : (
          <View style={styles.historyList}>
            {historyTasks.map((task) => (
              <TaskAtomCard
                key={task.id}
                task={task}
                onPress={(selected) => setRestoreTarget(selected)}
              />
            ))}
          </View>
        )}

        <DayCalendarStrip
          selectedDate={viewDate}
          today={today}
          earliestMonday={earliestMonday}
          onSelect={(date) => {
            if (date < earliestMonday) {
              return;
            }
            setSelectedDate(date);
            if (date < today) {
              setIsCreateModalOpen(false);
            }
          }}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label={t('atomizer.filter.all')}
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          {HUMAN_DIMENSION_IDS.map((dimensionId) => (
            <FilterChip
              key={dimensionId}
              label={t(dimensionShortKey(dimensionId))}
              active={filter === dimensionId}
              onPress={() => setFilter(dimensionId)}
            />
          ))}
        </ScrollView>

        {methodTable !== null ? (
          <MethodWeekPanel t={t} table={methodTable} campaign={campaign} asOf={viewDate} />
        ) : null}

        {isPastDay ? (
          <DayVerdictCard
            verdict={verdict}
            history={visibleTasks}
            dayDiscipline={dayDiscipline}
          />
        ) : (
          <>
            {groupedTasks.map((group) => (
              <DimensionGroup
                key={group.dimensionId}
                t={t}
                dimensionId={group.dimensionId}
                tasks={group.tasks}
                progress={
                  dailyProgress[group.dimensionId] ?? {
                    totalToday: group.tasks.length,
                    completedToday: 0,
                    score: 0,
                  }
                }
                onPress={(task) => setRitualTask(task)}
              />
            ))}
            {isSunday && activeTasks.length === 0 ? (
              <Text style={styles.emptyActive}>{t('atomizer.empty.sunday')}</Text>
            ) : null}
          </>
        )}
      </ScrollView>

      <Pressable
        onPress={() => setIsShadowOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('atomizer.shadow.label')}
        style={({ pressed }) => [styles.shadowPill, pressed ? styles.pressed : null]}
      >
        <Text style={styles.shadowLabel}>{t('atomizer.shadow.label')}</Text>
      </Pressable>

      <CreateAtomModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialDimension={filter === 'all' ? 'physical' : filter}
        initialScheduledOn={viewDate < today ? today : viewDate}
      />
      <ShadowConfessSheet visible={isShadowOpen} onClose={() => setIsShadowOpen(false)} />
      <TaskRitualSheet
        task={ritualTask}
        visible={ritualTask !== null}
        onClose={() => setRitualTask(null)}
        onAbsorb={onAbsorb}
        onBurn={onBurn}
        onRemove={onRemove}
      />
      <RestoreAtomModal
        task={restoreTarget}
        visible={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        onRestore={onRestore}
        onErase={onEraseChronicle}
      />
    </View>
  );
}

function FilterChip({
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

function DimensionGroup({
  t,
  dimensionId,
  tasks,
  progress,
  onPress,
}: {
  t: Translator;
  dimensionId: HumanDimensionId;
  tasks: readonly AtomizedTask[];
  progress: DailyVectorProgress;
  onPress: (task: AtomizedTask) => void;
}): ReactElement {
  const label = t(dimensionNameKey(dimensionId));

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{label}</Text>
        <View style={styles.groupBadge}>
          <Text style={styles.groupBadgeText}>
            {t.plural('atomizer.badge', progress.totalToday, {
              completed: progress.completedToday,
              total: progress.totalToday,
            })}
          </Text>
        </View>
      </View>
      <View style={styles.groupList}>
        {tasks.map((task) => (
          <TaskAtomCard key={task.id} task={task} onPress={onPress} />
        ))}
      </View>
    </View>
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
    paddingBottom: 72,
  },
  pressed: {
    opacity: motion.pressOpacity,
    transform: [{ scale: motion.pressScale }],
  },
  hero: {
    borderRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  subtitle: {
    ...typography.bodyStrong,
    marginTop: space.sm + 2,
    color: colors.text.muted,
  },
  canonHint: {
    ...typography.caption,
    marginTop: space.sm,
    color: colors.text.faint,
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.md,
  },
  toolChip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.panel,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
  },
  toolChipLabel: {
    ...typography.captionStrong,
    color: colors.text.muted,
  },
  historyList: {
    marginTop: space.sm,
    gap: space.sm + 2,
  },
  filterRow: {
    gap: space.sm,
    paddingVertical: space.lg + 2,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  chipActive: {
    backgroundColor: colors.tint.cyanStrong,
    borderColor: colors.border.gold,
  },
  chipLabel: {
    ...typography.captionStrong,
    color: colors.text.muted,
  },
  chipLabelActive: {
    color: colors.text.primary,
  },
  group: {
    marginBottom: space.xxl - 2,
  },
  groupTitle: {
    ...typography.cardTitle,
    flex: 1,
    color: colors.text.primary,
  },
  groupHeader: {
    marginBottom: space.md,
    gap: space.sm,
  },
  groupBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.tint.cyan,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
  },
  groupBadgeText: {
    ...typography.captionStrong,
    color: colors.text.muted,
  },
  groupList: {
    gap: space.sm + 2,
  },
  emptyActive: {
    ...typography.bodyStrong,
    marginTop: space.sm,
    marginBottom: space.lg + 2,
    color: colors.text.ivory,
    textAlign: 'center',
  },
  shadowPill: {
    position: 'absolute',
    left: layout.screenX,
    bottom: layout.footerBottom,
    zIndex: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.burned,
    backgroundColor: colors.tint.burned,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 1,
  },
  shadowLabel: {
    ...typography.captionStrong,
    color: colors.state.burned,
  },
});
