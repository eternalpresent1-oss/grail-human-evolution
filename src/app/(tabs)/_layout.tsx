import { needsAccountSignIn } from '@/api/accountGate';
import { useAccountSession } from '@/api/accountSession';
import { colors, space, typography } from '@/theme';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { useGrailStore } from '@/store/useGrailStore';
import { needsFirstRunGate } from '@/utils/firstRun';
import { Redirect, Tabs } from 'expo-router';
import { type ReactElement } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';

/**
 * Content height of the bar, excluding the bottom safe-area inset —
 * react-navigation pads that inset in on its own, so it must not be added here.
 */
const TAB_BAR_CONTENT_HEIGHT = 58;

const GLYPH_BOX = 24;
const GLYPH_CENTRE = GLYPH_BOX / 2;
const OCTAGON_SIDES = 8;

type TabIconProps = {
  readonly color: ColorValue;
  readonly focused: boolean;
  readonly size: number;
};

/** Vertex convention shared with the in-app octagon chart: first vertex points up. */
function octagonVertices(radius: number): readonly (readonly [number, number])[] {
  return Array.from({ length: OCTAGON_SIDES }, (_, index) => {
    const angle = (index * 2 * Math.PI) / OCTAGON_SIDES - Math.PI / 2;

    return [
      GLYPH_CENTRE + Math.cos(angle) * radius,
      GLYPH_CENTRE + Math.sin(angle) * radius,
    ] as const;
  });
}

function octagonPoints(radius: number): string {
  return octagonVertices(radius)
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
}

const OUTER_OCTAGON = octagonPoints(9.6);
const INNER_OCTAGON = octagonPoints(5);
const OUTER_VERTICES = octagonVertices(9.6);

/** Атомы — an atom: three orbitals around a nucleus. */
function AtomGlyph({ color, focused, size }: TabIconProps): ReactElement {
  const strokeWidth = focused ? 1.9 : 1.3;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`} fill="none">
      {[0, 60, 120].map((angle) => (
        <Ellipse
          key={angle}
          cx={GLYPH_CENTRE}
          cy={GLYPH_CENTRE}
          rx={10}
          ry={4.1}
          rotation={angle}
          originX={GLYPH_CENTRE}
          originY={GLYPH_CENTRE}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={focused ? 1 : 0.85}
        />
      ))}
      <Circle cx={GLYPH_CENTRE} cy={GLYPH_CENTRE} r={focused ? 3.1 : 2.1} fill={color} />
    </Svg>
  );
}

/** Грааль — the eight-vertex octagon the character chart is built on. */
function OctagonGlyph({ color, focused, size }: TabIconProps): ReactElement {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`} fill="none">
      <Polygon
        points={OUTER_OCTAGON}
        stroke={color}
        strokeWidth={focused ? 1.9 : 1.3}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={focused ? 0.16 : 0}
      />
      <Polygon
        points={INNER_OCTAGON}
        stroke={color}
        strokeWidth={focused ? 1.5 : 1.1}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={focused ? 0.55 : 0}
        opacity={focused ? 1 : 0.6}
      />
      {focused
        ? OUTER_VERTICES.map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.35} fill={color} />
          ))
        : null}
    </Svg>
  );
}

/** Анализ — a bar chart with a rising trend line. */
function ChartGlyph({ color, focused, size }: TabIconProps): ReactElement {
  const bars = [
    { x: 3.6, y: 13.4 },
    { x: 9.9, y: 9.6 },
    { x: 16.2, y: 5.8 },
  ] as const;
  const baseline = 19.6;
  const strokeWidth = focused ? 1.8 : 1.3;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`} fill="none">
      {bars.map((bar) => (
        <Rect
          key={bar.x}
          x={bar.x}
          y={bar.y}
          width={4.2}
          height={baseline - bar.y}
          rx={1.1}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          fill={color}
          fillOpacity={focused ? 0.5 : 0}
        />
      ))}
      <Path
        d={`M2.4 ${baseline + 1.6} H21.6`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={focused ? 1 : 0.7}
      />
    </Svg>
  );
}

export default function TabsLayout(): ReactElement {
  const insets = useSafeAreaInsets();
  const t = useTranslator();
  const session = useAccountSession();
  const surveyApplied = useGrailStore((state) => state.surveyApplied);
  const profile = useGrailStore((state) => state.profile);

  if (needsAccountSignIn(session) || needsFirstRunGate({ surveyApplied, profile })) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.gold,
        tabBarInactiveTintColor: colors.text.faint,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: colors.border.gold,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
        },
        tabBarItemStyle: {
          paddingTop: space.xs,
        },
        tabBarLabelStyle: {
          ...typography.micro,
          marginTop: space.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="atomizer"
        options={{
          title: t('tabs.atoms'),
          tabBarIcon: ({ color, focused, size }): ReactElement => (
            <AtomGlyph color={color} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="character"
        options={{
          title: t('tabs.grail'),
          tabBarIcon: ({ color, focused, size }): ReactElement => (
            <OctagonGlyph color={color} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('tabs.analysis'),
          tabBarIcon: ({ color, focused, size }): ReactElement => (
            <ChartGlyph color={color} focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
