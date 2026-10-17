import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { dimensionShortKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { VectorHitTargets } from '@/components/VectorHitTargets';
import { VectorInfoSheet } from '@/components/VectorInfoSheet';
import { colors, withAlpha } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { getDailyDimensionProgress, HUMAN_DIMENSION_IDS, type HumanDimensionId } from '@/types/grail';
import { formatVectorPercent } from '@/utils/formatScore';
import { localDateKey } from '@/utils/taskTime';
import {
  getOctagonLabelPlacement,
  getOctagonPoint,
  getOctagonRingPoints,
  OCTAGON_SIDE_COUNT,
  OCTAGON_VALUE_MAX,
  toSvgPoints,
} from '@/utils/octagonMath';

const SIZE = 220;
const CENTER = SIZE / 2;
const MAX_RADIUS = 62;
const LABEL_RADIUS = MAX_RADIUS + 26;

interface ShadowOctagonProps {
  readonly shares: Record<HumanDimensionId, number>;
}

export function ShadowOctagon({ shares }: ShadowOctagonProps): ReactElement {
  const t = useTranslator();
  const [openVector, setOpenVector] = useState<HumanDimensionId | null>(null);
  const dimensions = useGrailStore((state) => state.profile.dimensions);
  const tasks = useGrailStore((state) => state.tasks);
  const daily = getDailyDimensionProgress(tasks, localDateKey());
  const outline = toSvgPoints(
    getOctagonRingPoints(OCTAGON_SIDE_COUNT, OCTAGON_VALUE_MAX, MAX_RADIUS, CENTER),
  );
  const lifeFill = toSvgPoints(
    HUMAN_DIMENSION_IDS.map((id, index) =>
      getOctagonPoint(index, OCTAGON_SIDE_COUNT, dimensions[id]?.score ?? 0, MAX_RADIUS, CENTER),
    ),
  );
  const dailyFill = toSvgPoints(
    HUMAN_DIMENSION_IDS.map((id, index) =>
      getOctagonPoint(index, OCTAGON_SIDE_COUNT, daily[id]?.score ?? 0, MAX_RADIUS, CENTER),
    ),
  );
  const fill = toSvgPoints(
    HUMAN_DIMENSION_IDS.map((id, index) =>
      getOctagonPoint(index, OCTAGON_SIDE_COUNT, shares[id] ?? 0, MAX_RADIUS, CENTER),
    ),
  );

  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={t('shadow.octagon.a11y')}
    >
      <View style={styles.chart}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Polygon
          points={outline}
          fill="none"
          stroke={colors.chart.grid}
          strokeWidth={1}
          strokeLinejoin="round"
        />
        {HUMAN_DIMENSION_IDS.map((id, index) => {
          const outer = getOctagonPoint(
            index,
            OCTAGON_SIDE_COUNT,
            OCTAGON_VALUE_MAX,
            MAX_RADIUS,
            CENTER,
          );
          return (
            <Line
              key={`axis-${id}`}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x}
              y2={outer.y}
              stroke={colors.chart.grid}
              strokeWidth={1}
            />
          );
        })}
        <G opacity={0.38}>
          <Polygon
            points={dailyFill}
            fill={colors.chart.lifeFill}
            stroke={colors.chart.lifeStroke}
            strokeWidth={1.2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
          <Polygon
            points={lifeFill}
            fill={colors.chart.coreFill}
            stroke={colors.chart.coreStroke}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        </G>
        <Polygon
          points={fill}
          fill={withAlpha(colors.state.burned, 0.48)}
          stroke={colors.chart.shadowStroke}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Circle cx={CENTER} cy={CENTER} r={2.2} fill={colors.state.burned} />
        {HUMAN_DIMENSION_IDS.map((id, index) => {
          const placement = getOctagonLabelPlacement(
            index,
            OCTAGON_SIDE_COUNT,
            LABEL_RADIUS,
            CENTER,
          );

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
                fill={colors.state.dangerText}
                fontSize={8}
                fontWeight="700"
                textAnchor={placement.anchor}
                alignmentBaseline="middle"
              >
                {formatVectorPercent(shares[id] ?? 0)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <VectorHitTargets
        points={HUMAN_DIMENSION_IDS.map((id, index) => {
          const placement = getOctagonLabelPlacement(
            index,
            OCTAGON_SIDE_COUNT,
            LABEL_RADIUS,
            CENTER,
          );
          return { id, x: placement.x, y: placement.y };
        })}
        onSelect={(id) => {
          setOpenVector(id);
          void Haptics.selectionAsync();
        }}
      />
      </View>
      <VectorInfoSheet dimensionId={openVector} onClose={() => setOpenVector(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  chart: {
    width: SIZE,
    height: SIZE,
  },
});
