import { type ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { dimensionNameKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { type HumanDimensionId } from '@/types/grail';

const HIT = 52;

export function VectorHitTargets({
  points,
  onSelect,
}: {
  points: readonly {
    readonly id: HumanDimensionId;
    readonly x: number;
    readonly y: number;
  }[];
  onSelect: (id: HumanDimensionId) => void;
}): ReactElement {
  const t = useTranslator();

  return (
    <>
      {points.map((point) => (
        <Pressable
          key={point.id}
          onPress={() => onSelect(point.id)}
          accessibilityRole="button"
          accessibilityLabel={t(dimensionNameKey(point.id))}
          hitSlop={4}
          style={[
            styles.hit,
            {
              left: point.x - HIT / 2,
              top: point.y - HIT / 2,
            },
          ]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    width: HIT,
    height: HIT,
  },
});
