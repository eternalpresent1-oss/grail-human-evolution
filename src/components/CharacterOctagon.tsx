import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Polygon, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { dimensionShortKey, type TranslationKey, type Translator } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { VectorHitTargets } from '@/components/VectorHitTargets';
import { VectorInfoSheet } from '@/components/VectorInfoSheet';
import { colors, motion, radius, space, typography, withAlpha } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { getDailyDimensionProgress, HUMAN_DIMENSION_IDS, type HumanDimensionId, type OctagonViewMode } from '@/types/grail';
import { formatVectorPercent } from '@/utils/formatScore';
import { localDateKey } from '@/utils/taskTime';
import { computeAllShadowShares } from '@/utils/weekLedger';
import {
  getOctagonLabelPlacement,
  getOctagonPoint,
  getOctagonRingPoints,
  OCTAGON_SIDE_COUNT,
  OCTAGON_VALUE_MAX,
  toSvgPoints,
} from '@/utils/octagonMath';

const GRID_VALUES = [25, 50, 75, 100] as const;
const MIN_CHART_SIZE = 260;
const MAX_CHART_SIZE = 340;
/** Gutter reserved for the axis name and the two-decimal percent under it. */
const LABEL_GUTTER = 72;
const PERCENT_LINE_OFFSET = 12;

interface CharacterOctagonProps {
  style?: StyleProp<ViewStyle>;
  embedded?: boolean;
  mode?: OctagonViewMode;
  interactiveToggle?: boolean;
}

interface Geometry {
  readonly size: number;
  readonly center: number;
  readonly maxRadius: number;
  readonly labelRadius: number;
}

export function CharacterOctagon({
  style,
  embedded = false,
  mode,
  interactiveToggle = false,
}: CharacterOctagonProps): ReactElement {
  const t = useTranslator();
  const { width } = useWindowDimensions();
  const dimensions = useGrailStore((state) => state.profile.dimensions);
  const tasks = useGrailStore((state) => state.tasks);
  const shadowEvents = useGrailStore((state) => state.shadowEvents);
  const storeMode = useGrailStore((state) => state.viewMode);
  const setViewMode = useGrailStore((state) => state.setViewMode);
  const resolvedMode: OctagonViewMode = mode ?? storeMode;
  const [openVector, setOpenVector] = useState<HumanDimensionId | null>(null);

  const geometry = useMemo((): Geometry => {
    const size = Math.max(MIN_CHART_SIZE, Math.min(MAX_CHART_SIZE, width - 48));
    const center = size / 2;
    const maxRadius = center - LABEL_GUTTER;

    return { size, center, maxRadius, labelRadius: maxRadius + 40 };
  }, [width]);

  const dailyProgress = useMemo(
    () => getDailyDimensionProgress(tasks, localDateKey()),
    [tasks],
  );

  const dailyScores = useMemo(
    () => HUMAN_DIMENSION_IDS.map((id) => dailyProgress[id].score),
    [dailyProgress],
  );

  const lifeScores = useMemo(
    () => HUMAN_DIMENSION_IDS.map((id) => dimensions[id]?.score ?? 0),
    [dimensions],
  );

  const gridRings = useMemo(
    () =>
      GRID_VALUES.map((value) =>
        toSvgPoints(
          getOctagonRingPoints(OCTAGON_SIDE_COUNT, value, geometry.maxRadius, geometry.center),
        ),
      ),
    [geometry],
  );

  const lifePoints = useMemo(
    () =>
      toSvgPoints(
        HUMAN_DIMENSION_IDS.map((id, index) =>
          getOctagonPoint(
            index,
            OCTAGON_SIDE_COUNT,
            dimensions[id]?.score ?? 0,
            geometry.maxRadius,
            geometry.center,
          ),
        ),
      ),
    [dimensions, geometry],
  );

  const dailyPoints = useMemo(
    () =>
      toSvgPoints(
        dailyScores.map((score, index) =>
          getOctagonPoint(
            index,
            OCTAGON_SIDE_COUNT,
            score,
            geometry.maxRadius,
            geometry.center,
          ),
        ),
      ),
    [dailyScores, geometry],
  );

  const shadowShares = useMemo(
    () => computeAllShadowShares(shadowEvents, localDateKey()),
    [shadowEvents],
  );

  const shadowPoints = useMemo(
    () =>
      toSvgPoints(
        HUMAN_DIMENSION_IDS.map((id, index) =>
          getOctagonPoint(
            index,
            OCTAGON_SIDE_COUNT,
            shadowShares[id] ?? 0,
            geometry.maxRadius,
            geometry.center,
          ),
        ),
      ),
    [geometry, shadowShares],
  );

  const shadowVisible = HUMAN_DIMENSION_IDS.some((id) => (shadowShares[id] ?? 0) > 0);

  const labels = useMemo(
    () =>
      HUMAN_DIMENSION_IDS.map((id, index) => {
        const score =
          resolvedMode === 'daily'
            ? (dailyProgress[id]?.score ?? 0)
            : resolvedMode === 'shadow'
              ? (shadowShares[id] ?? 0)
              : (dimensions[id]?.score ?? 0);
        const placement = getOctagonLabelPlacement(
          index,
          OCTAGON_SIDE_COUNT,
          geometry.labelRadius,
          geometry.center,
        );

        return {
          id,
          label: t(dimensionShortKey(id)),
          percent: formatVectorPercent(score),
          x: placement.x,
          y: placement.y,
          anchor: placement.anchor,
        };
      }),
    [dailyProgress, dimensions, geometry, resolvedMode, shadowShares, t],
  );

  const lifeOpacity = useSharedValue(layerOpacity('life', resolvedMode));
  const dailyOpacity = useSharedValue(layerOpacity('daily', resolvedMode));
  const shadowOpacity = useSharedValue(layerOpacity('shadow', resolvedMode));

  useEffect(() => {
    const timing = { duration: motion.base, easing: Easing.inOut(Easing.cubic) };
    lifeOpacity.value = withTiming(layerOpacity('life', resolvedMode), timing);
    dailyOpacity.value = withTiming(layerOpacity('daily', resolvedMode), timing);
    shadowOpacity.value = withTiming(layerOpacity('shadow', resolvedMode), timing);
  }, [dailyOpacity, lifeOpacity, resolvedMode, shadowOpacity]);

  const lifeGroupProps = useAnimatedProps(() => ({ opacity: lifeOpacity.value }));
  const dailyGroupProps = useAnimatedProps(() => ({ opacity: dailyOpacity.value }));
  const shadowGroupProps = useAnimatedProps(() => ({ opacity: shadowOpacity.value }));
  const dailyFocused = isFocused('daily', resolvedMode);
  const lifeFocused = isFocused('life', resolvedMode);
  const shadowFocused = isFocused('shadow', resolvedMode);

  return (
    <View style={[embedded ? styles.embedded : styles.card, style]}>
      <View
        style={{ width: geometry.size, height: geometry.size }}
        accessibilityRole="image"
        accessibilityLabel={t('octagon.a11y')}
      >
        <Svg
          width={geometry.size}
          height={geometry.size}
          viewBox={`0 0 ${geometry.size} ${geometry.size}`}
        >
          {gridRings.map((points, index) => (
            <Polygon
              key={`grid-${GRID_VALUES[index] ?? index}`}
              points={points}
              fill="none"
              stroke={colors.chart.grid}
              strokeWidth={1}
              strokeLinejoin="round"
            />
          ))}

          {stackOrder(resolvedMode).map((layer) => {
            if (layer === 'shadow' && shadowFocused) {
              return null;
            }

            if (layer === 'daily') {
              return (
                <AnimatedG key="daily" animatedProps={dailyGroupProps}>
                  <Polygon
                    points={dailyPoints}
                    fill={colors.chart.lifeFill}
                    stroke={dailyFocused ? colors.chart.coreStroke : colors.chart.lifeStroke}
                    strokeWidth={dailyFocused ? 2.4 : 1.4}
                    strokeDasharray="6 5"
                    strokeLinejoin="round"
                  />
                </AnimatedG>
              );
            }

            if (layer === 'life') {
              return (
                <AnimatedG key="life" animatedProps={lifeGroupProps}>
                  <CoreShape
                    fallbackPoints={lifePoints}
                    geometry={geometry}
                    scores={lifeScores}
                    emphasized={lifeFocused}
                  />
                </AnimatedG>
              );
            }

            if (!shadowVisible) {
              return null;
            }

            return (
              <AnimatedG key="shadow" animatedProps={shadowGroupProps}>
                <Polygon
                  points={shadowPoints}
                  fill={shadowFocused ? withAlpha(colors.state.burned, 0.5) : colors.chart.shadowFill}
                  stroke={shadowFocused ? colors.chart.shadowStroke : 'none'}
                  strokeWidth={shadowFocused ? 2 : 0}
                  strokeLinejoin="round"
                />
              </AnimatedG>
            );
          })}

          {shadowFocused && shadowVisible ? (
            <AnimatedG animatedProps={shadowGroupProps}>
              <Polygon
                points={shadowPoints}
                fill={withAlpha(colors.state.burned, 0.5)}
                stroke={colors.chart.shadowStroke}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </AnimatedG>
          ) : null}

          {labels.map((label) => (
            <G key={`label-${label.id}`}>
              <SvgText
                x={label.x}
                y={label.y}
                fill={colors.chart.label}
                fontSize={10}
                fontWeight="700"
                letterSpacing={0.4}
                textAnchor={label.anchor}
                alignmentBaseline="middle"
              >
                {label.label}
              </SvgText>
              <SvgText
                x={label.x}
                y={label.y + PERCENT_LINE_OFFSET}
                fill={resolvedMode === 'shadow' ? colors.chart.shadowStroke : colors.accent.gold}
                fontSize={9}
                fontWeight="700"
                letterSpacing={0.2}
                textAnchor={label.anchor}
                alignmentBaseline="middle"
              >
                {label.percent}
              </SvgText>
            </G>
          ))}
        </Svg>
        <VectorHitTargets
          points={labels}
          onSelect={(id) => {
            setOpenVector(id);
            void Haptics.selectionAsync();
          }}
        />
      </View>

      {interactiveToggle ? (
        <ViewModeToggle mode={storeMode} onChange={setViewMode} t={t} />
      ) : null}
      <VectorInfoSheet dimensionId={openVector} onClose={() => setOpenVector(null)} />
    </View>
  );
}

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

function CoreShape({
  fallbackPoints,
  geometry,
  scores,
  emphasized,
}: {
  fallbackPoints: string;
  geometry: Geometry;
  scores: readonly number[];
  emphasized: boolean;
}): ReactElement {
  const s0 = useAnimatedScore(scores[0] ?? 0);
  const s1 = useAnimatedScore(scores[1] ?? 0);
  const s2 = useAnimatedScore(scores[2] ?? 0);
  const s3 = useAnimatedScore(scores[3] ?? 0);
  const s4 = useAnimatedScore(scores[4] ?? 0);
  const s5 = useAnimatedScore(scores[5] ?? 0);
  const s6 = useAnimatedScore(scores[6] ?? 0);
  const s7 = useAnimatedScore(scores[7] ?? 0);

  const { center, maxRadius } = geometry;

  // `Polygon` is a `Path` under the hood, so an animated `points` alone never
  // reaches the native shape — the closed `d` is what keeps the fill visible.
  const polygonProps = useAnimatedProps(() => {
    'worklet';
    const values = [
      s0.value,
      s1.value,
      s2.value,
      s3.value,
      s4.value,
      s5.value,
      s6.value,
      s7.value,
    ];

    let points = '';
    let path = '';

    for (let index = 0; index < OCTAGON_SIDE_COUNT; index += 1) {
      const point = getOctagonPoint(
        index,
        OCTAGON_SIDE_COUNT,
        values[index] ?? 0,
        maxRadius,
        center,
      );
      points += index === 0 ? `${point.x},${point.y}` : ` ${point.x},${point.y}`;
      path += index === 0 ? `M${point.x},${point.y}` : ` L${point.x},${point.y}`;
    }

    return { points, d: `${path} Z` };
  });

  return (
    <AnimatedPolygon
      points={fallbackPoints}
      animatedProps={polygonProps}
      fill={colors.chart.coreFill}
      stroke={colors.chart.coreStroke}
      strokeWidth={emphasized ? 2.2 : 1.1}
      strokeLinejoin="round"
    />
  );
}

function ViewModeToggle({
  mode,
  onChange,
  t,
}: {
  mode: OctagonViewMode;
  onChange: (next: OctagonViewMode) => void;
  t: Translator;
}): ReactElement {
  const [trackWidth, setTrackWidth] = useState(0);
  const slide = useSharedValue(toggleIndex(mode));
  const thirdWidth = Math.max(0, (trackWidth - 8) / TOGGLE_MODES.length);

  useEffect(() => {
    slide.value = withTiming(toggleIndex(mode), {
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
    });
  }, [mode, slide]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value * thirdWidth }],
  }));

  const onLayout = (event: LayoutChangeEvent): void => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const shadowOn = mode === 'shadow';

  return (
    <View style={styles.toggleTrack} onLayout={onLayout}>
      <Animated.View
        style={[
          styles.toggleThumb,
          { width: thirdWidth },
          shadowOn ? styles.toggleThumbShadow : null,
          thumbStyle,
        ]}
        pointerEvents="none"
      />
      {TOGGLE_MODES.map((entry) => (
        <Pressable
          key={entry}
          onPress={() => onChange(entry)}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === entry }}
          accessibilityLabel={t(toggleA11yKey(entry))}
          style={({ pressed }) => [styles.toggleHalf, pressed ? styles.togglePressed : null]}
        >
          <Text
            style={[
              styles.toggleLabel,
              mode === entry ? (entry === 'shadow' ? styles.toggleLabelOnShadow : styles.toggleLabelOn) : null,
            ]}
          >
            {t(toggleLabelKey(entry))}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function useAnimatedScore(target: number): SharedValue<number> {
  const value = useSharedValue(target);

  useEffect(() => {
    value.value = withTiming(Math.min(OCTAGON_VALUE_MAX, Math.max(0, target)), {
      duration: motion.slow,
      easing: Easing.out(Easing.cubic),
    });
  }, [target, value]);

  return value;
}

const TOGGLE_MODES: readonly OctagonViewMode[] = ['daily', 'life', 'shadow'];

function toggleIndex(mode: OctagonViewMode): number {
  return TOGGLE_MODES.indexOf(mode);
}

function toggleLabelKey(mode: OctagonViewMode): TranslationKey {
  return `octagon.toggle.${mode}`;
}

function toggleA11yKey(mode: OctagonViewMode): TranslationKey {
  return `octagon.toggle.${mode}.a11y`;
}

function stackOrder(focus: OctagonViewMode): readonly OctagonViewMode[] {
  if (focus === 'daily') {
    return ['life', 'shadow', 'daily'];
  }
  if (focus === 'shadow') {
    return ['daily', 'life', 'shadow'];
  }
  return ['daily', 'shadow', 'life'];
}

function isFocused(layer: OctagonViewMode, mode: OctagonViewMode): boolean {
  return mode === layer;
}

function layerOpacity(layer: OctagonViewMode, mode: OctagonViewMode): number {
  if (isFocused(layer, mode)) {
    return 1;
  }
  return mode === 'shadow' ? 0.28 : 0.4;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  embedded: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleTrack: {
    marginTop: space.sm,
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.sunken,
    padding: space.xs,
  },
  toggleThumb: {
    position: 'absolute',
    top: space.xs,
    bottom: space.xs,
    left: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.cyanStrong,
    borderWidth: 1,
    borderColor: colors.border.cyan,
  },
  toggleThumbShadow: {
    backgroundColor: colors.tint.burned,
    borderColor: colors.border.burned,
  },
  toggleHalf: {
    flex: 1,
    paddingVertical: space.sm + 2,
    alignItems: 'center',
    zIndex: 1,
  },
  togglePressed: {
    opacity: motion.pressOpacity,
  },
  toggleLabel: {
    ...typography.captionStrong,
    color: colors.text.faint,
  },
  toggleLabelOn: {
    color: colors.accent.cyan,
  },
  toggleLabelOnShadow: {
    color: colors.state.burned,
  },
});
