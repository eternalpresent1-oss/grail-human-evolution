import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polygon } from 'react-native-svg';

import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { VectorInfoSheet } from '@/components/VectorInfoSheet';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { dimensionShortKey, talentVectorKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, layout, motion, radius, space, typography, withAlpha } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';
import { HUMAN_DIMENSION_IDS, type HumanDimensionId } from '@/types/grail';
import { type TalentNode } from '@/types/talent';
import { playConfirm, playDeny } from '@/utils/grailSound';
import {
  canAddTalent,
  canGrantTalentXp,
  isTalentLeaf,
  talentChildren,
} from '@/utils/talent';
import {
  OCTAGON_SIDE_COUNT,
  getOctagonAngle,
  getOctagonRingPoints,
  toSvgPoints,
} from '@/utils/octagonMath';
import { localDateKey } from '@/utils/taskTime';

const MIN_CANVAS = 540;
const RING = 52;
const VECTOR_R = 88;
const STEP = 92;
const NODE_W = 62;
const NODE_H = 38;
const SIBLING_GAP = 18;
const PLUS = 22;
const PAD = 40;
const HEADER_BLOCK = 64;
const COMPOSER_BLOCK = 248;
const FIT_SPAN = VECTOR_R * 2 + NODE_H + PLUS + 36;

function clampPan(next: number, view: number, size: number): number {
  'worklet';
  if (view <= 1) {
    return next;
  }
  if (size >= view) {
    const min = view - size;
    return Math.min(0, Math.max(min, next));
  }
  return Math.min(view - size, Math.max(0, next));
}

function centerTree(view: number, size: number): number {
  'worklet';
  return (view - size) / 2;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface PlacedTalent {
  readonly node: TalentNode;
  readonly x: number;
  readonly y: number;
  readonly isLeaf: boolean;
}

interface PlusSlot {
  readonly dimensionId: HumanDimensionId;
  readonly parentId?: string;
  readonly x: number;
  readonly y: number;
}

interface BranchLine {
  readonly key: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

interface TreeLayout {
  readonly placed: readonly PlacedTalent[];
  readonly pluses: readonly PlusSlot[];
  readonly lines: readonly BranchLine[];
  readonly canvas: number;
}

function polar(angle: number, radius: number, center: number): Point {
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

function rectEdge(center: Point, toward: Point, width: number, height: number): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) {
    return center;
  }

  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : width / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : height / 2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function circleEdge(center: Point, toward: Point, radius: number): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: center.x + (dx / length) * radius, y: center.y + (dy / length) * radius };
}

function octagonEdge(center: Point, toward: Point, vertexRadius: number): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) {
    return center;
  }

  const angle = Math.atan2(dy, dx);
  const fullTurn = Math.PI * 2;
  const sector = Math.PI / 4;
  const half = Math.PI / 8;
  let shifted = (angle + Math.PI / 2) % fullTurn;
  if (shifted < 0) {
    shifted += fullTurn;
  }

  let into = (shifted - half) % sector;
  if (into < 0) {
    into += sector;
  }
  if (into > half) {
    into -= sector;
  }

  const distance = (vertexRadius * Math.cos(half)) / Math.cos(into);
  return { x: center.x + distance * Math.cos(angle), y: center.y + distance * Math.sin(angle) };
}

function reachOf(point: Point, pad: number): number {
  return Math.hypot(point.x, point.y) + pad;
}

function layoutTree(talents: readonly TalentNode[]): TreeLayout {
  const draft = placeTree(talents, 0);
  let reach = RING + PAD;
  for (const item of draft.placed) {
    reach = Math.max(reach, reachOf(item, Math.hypot(NODE_W, NODE_H) / 2 + PAD));
  }
  for (const slot of draft.pluses) {
    reach = Math.max(reach, reachOf(slot, PLUS / 2 + PAD));
  }

  const canvas = Math.max(MIN_CANVAS, Math.ceil(reach * 2));
  return { ...placeTree(talents, canvas / 2), canvas };
}

function placeTree(
  talents: readonly TalentNode[],
  center: number,
): Omit<TreeLayout, 'canvas'> {
  const placed: PlacedTalent[] = [];
  const pluses: PlusSlot[] = [];
  const lines: BranchLine[] = [];
  const hub = { x: center, y: center };

  HUMAN_DIMENSION_IDS.forEach((dimensionId, index) => {
    const baseAngle = getOctagonAngle(index, OCTAGON_SIDE_COUNT);
    const vector = polar(baseAngle, VECTOR_R, center);
    const axisStart = octagonEdge(hub, vector, RING);
    const axisEnd = rectEdge(vector, hub, NODE_W, NODE_H);
    lines.push({
      key: `axis-${dimensionId}`,
      x1: axisStart.x,
      y1: axisStart.y,
      x2: axisEnd.x,
      y2: axisEnd.y,
    });

    const walk = (
      parentId: string | undefined,
      depth: number,
      angle: number,
      from: Point,
    ): void => {
      const kids = talentChildren(talents, parentId, dimensionId);
      const radius = VECTOR_R + (depth + 1) * STEP;
      const stepAngle = (NODE_W + SIBLING_GAP) / radius;

      const pushPlus = (plusAngle: number): void => {
        const tip = polar(plusAngle, radius, center);
        const fromEdge = rectEdge(from, tip, NODE_W, NODE_H);
        const toEdge = circleEdge(tip, from, PLUS / 2);
        pluses.push({
          dimensionId,
          ...(parentId === undefined ? {} : { parentId }),
          x: tip.x,
          y: tip.y,
        });
        lines.push({
          key: `plus-line-${dimensionId}-${parentId ?? 'root'}-${plusAngle.toFixed(3)}`,
          x1: fromEdge.x,
          y1: fromEdge.y,
          x2: toEdge.x,
          y2: toEdge.y,
        });
      };

      if (kids.length === 0) {
        pushPlus(angle);
        return;
      }

      kids.forEach((kid, kidIndex) => {
        const spread = kids.length === 1 ? 0 : (kidIndex - (kids.length - 1) / 2) * stepAngle;
        const nextAngle = angle + spread;
        const point = polar(nextAngle, radius, center);
        const fromEdge = rectEdge(from, point, NODE_W, NODE_H);
        const toEdge = rectEdge(point, from, NODE_W, NODE_H);
        placed.push({
          node: kid,
          x: point.x,
          y: point.y,
          isLeaf: isTalentLeaf(talents, kid.id, dimensionId),
        });
        lines.push({
          key: `line-${kid.id}`,
          x1: fromEdge.x,
          y1: fromEdge.y,
          x2: toEdge.x,
          y2: toEdge.y,
        });
        walk(kid.id, depth + 1, nextAngle, point);
      });

      const flank = ((kids.length - 1) / 2) * stepAngle;
      pushPlus(angle + flank + stepAngle);
    };

    walk(undefined, 0, baseAngle, vector);
  });

  return { placed, pluses, lines };
}

interface TalentTreeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TalentTreeModal({ visible, onClose }: TalentTreeModalProps): ReactElement {
  const t = useTranslator();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const talents = useGrailStore((state) => state.talents);
  const addTalent = useGrailStore((state) => state.addTalent);
  const removeTalent = useGrailStore((state) => state.removeTalent);
  const renameTalent = useGrailStore((state) => state.renameTalent);
  const [compose, setCompose] = useState<
    | { readonly mode: 'add'; readonly dimensionId: HumanDimensionId; readonly parentId?: string }
    | { readonly mode: 'rename'; readonly id: string; readonly dimensionId: HumanDimensionId }
    | null
  >(null);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [openVector, setOpenVector] = useState<HumanDimensionId | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const viewW = useSharedValue(1);
  const viewH = useSharedValue(1);
  const fitScale = useSharedValue(1);
  const userScale = useSharedValue(1);
  const pinchStart = useSharedValue(1);

  const { placed, pluses, lines, canvas } = useMemo(() => layoutTree(talents), [talents]);
  const center = canvas / 2;
  const ring = getOctagonRingPoints(OCTAGON_SIDE_COUNT, 100, RING, center);
  const canvasSize = useSharedValue(canvas);
  const composing = compose !== null;
  const keyboardHeight = useKeyboardHeight(visible && composing);
  const browseHeight = Math.max(280, Math.min(380, Math.round(windowHeight * 0.48)));
  const composerBlock = keyboardHeight > 0 ? 128 : COMPOSER_BLOCK;
  const availableTree = Math.max(
    120,
    windowHeight -
      keyboardHeight -
      Math.max(insets.top, space.md) -
      space.sm -
      HEADER_BLOCK -
      composerBlock -
      (notice !== null ? 28 : 0),
  );
  const viewportHeight = composing ? Math.min(browseHeight, availableTree) : browseHeight;

  if (
    !visible &&
    (compose !== null || draft.length > 0 || notice !== null || openVector !== null)
  ) {
    setCompose(null);
    setDraft('');
    setNotice(null);
    setOpenVector(null);
  }

  useEffect(() => {
    if (!visible) {
      return;
    }

    const width = viewW.get();
    const height = viewH.get();
    canvasSize.set(canvas);
    if (width > 1 && height > 1) {
      const size = canvas * fitScale.get() * userScale.get();
      const x = centerTree(width, size);
      const y = centerTree(height, size);
      translateX.set(x);
      translateY.set(y);
      startX.set(x);
      startY.set(y);
    }
  }, [visible, canvas, canvasSize, startX, startY, translateX, translateY, viewH, viewW]);

  const pan = Gesture.Pan()
    .minDistance(8)
    .onBegin(() => {
      startX.set(translateX.get());
      startY.set(translateY.get());
    })
    .onUpdate((event) => {
      const scale = fitScale.get() * userScale.get();
      const size = canvasSize.get() * scale;
      translateX.set(clampPan(startX.get() + event.translationX, viewW.get(), size));
      translateY.set(clampPan(startY.get() + event.translationY, viewH.get(), size));
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      pinchStart.set(userScale.get());
    })
    .onUpdate((event) => {
      const previous = fitScale.get() * userScale.get();
      const nextUser = Math.min(2.8, Math.max(0.45, pinchStart.get() * event.scale));
      const next = fitScale.get() * nextUser;
      const width = viewW.get();
      const height = viewH.get();
      const anchorX = (width / 2 - translateX.get()) / previous;
      const anchorY = (height / 2 - translateY.get()) / previous;
      userScale.set(nextUser);
      translateX.set(clampPan(width / 2 - anchorX * next, width, canvasSize.get() * next));
      translateY.set(clampPan(height / 2 - anchorY * next, height, canvasSize.get() * next));
    });

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: fitScale.get() * userScale.get() },
    ],
  }));

  const submit = (): void => {
    if (compose === null) {
      return;
    }

    const title = draft.trim();
    if (title.length === 0) {
      setNotice(t('talent.error'));
      playDeny();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (compose.mode === 'rename') {
      renameTalent(compose.id, title);
      playConfirm();
      setNotice(null);
      setDraft('');
      setCompose(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    if (!canAddTalent(talents, compose.dimensionId)) {
      setNotice(t('talent.full'));
      playDeny();
      return;
    }

    const weekAlreadyFull =
      compose.dimensionId !== 'craft_career' &&
      !canGrantTalentXp(talents, compose.dimensionId, localDateKey());
    addTalent({
      dimensionId: compose.dimensionId,
      title,
      ...(compose.parentId === undefined ? {} : { parentId: compose.parentId }),
    });
    playConfirm();
    setNotice(weekAlreadyFull ? t('talent.cap') : null);
    setDraft('');
    setCompose(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <>
    <ModalSheet
      visible={visible}
      onClose={onClose}
      align={composing ? 'bottom' : 'center'}
      avoidKeyboard
      panelStyle={styles.sheet}
      accessibilityLabel={t('talent.title')}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('talent.title')}</Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={layout.hitSlop}
          style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
        >
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      </View>
      {notice !== null ? <Text style={styles.notice}>{notice}</Text> : null}

      <GestureHandlerRootView style={[styles.viewport, { height: viewportHeight }]}>
        <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
          <Animated.View
            style={styles.panStage}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              viewW.set(width);
              viewH.set(height);
              const fit = composing
                ? Math.min(1, Math.max(0.46, Math.min(width, height) / FIT_SPAN))
                : 1;
              fitScale.set(fit);
              userScale.set(1);
              canvasSize.set(canvas);
              const size = canvas * fit;
              const x = centerTree(width, size);
              const y = centerTree(height, size);
              translateX.set(x);
              translateY.set(y);
              startX.set(x);
              startY.set(y);
            }}
          >
            <Animated.View style={[styles.canvas, canvasStyle, { width: canvas, height: canvas }]}>
              <Svg width={canvas} height={canvas} style={StyleSheet.absoluteFill}>
                <Polygon
                  points={toSvgPoints(ring)}
                  fill={withAlpha(colors.accent.gold, 0.06)}
                  stroke={colors.accent.gold}
                  strokeWidth={1.2}
                />
                {lines.map((line) => (
                  <Line
                    key={line.key}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={
                      line.key.startsWith('axis-')
                        ? withAlpha(colors.accent.gold, 0.28)
                        : line.key.startsWith('plus-')
                          ? withAlpha(colors.accent.gold, 0.35)
                          : withAlpha(colors.accent.cyanBright, 0.55)
                    }
                    strokeWidth={line.key.startsWith('line-') ? 1.2 : 1}
                  />
                ))}
              </Svg>

              <Text style={[styles.hub, { left: center - 24, top: center - 8 }]}>GRAIL</Text>

              {HUMAN_DIMENSION_IDS.map((dimensionId, index) => {
                const point = polar(getOctagonAngle(index, OCTAGON_SIDE_COUNT), VECTOR_R, center);
                return (
                  <Pressable
                    key={dimensionId}
                    onPress={() => setOpenVector(dimensionId)}
                    accessibilityRole="button"
                    accessibilityLabel={t(dimensionShortKey(dimensionId))}
                    style={({ pressed }) => [
                      styles.vectorNode,
                      { left: point.x - NODE_W / 2, top: point.y - NODE_H / 2 },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={styles.vectorLabel} numberOfLines={2}>
                      {t(dimensionShortKey(dimensionId))}
                    </Text>
                  </Pressable>
                );
              })}

              {placed.map((item) => (
                <View
                  key={item.node.id}
                  style={[styles.talentSlot, { left: item.x - NODE_W / 2, top: item.y - NODE_H / 2 }]}
                >
                  <Pressable
                    onPress={() => {
                      setCompose({
                        mode: 'rename',
                        id: item.node.id,
                        dimensionId: item.node.dimensionId,
                      });
                      setDraft(item.node.title);
                      setNotice(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.node.title}
                    style={({ pressed }) => [styles.talentNode, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.talentLabel} numberOfLines={2}>
                      {item.node.title}
                    </Text>
                  </Pressable>
                  {item.isLeaf ? (
                    <Pressable
                      onPress={() => {
                        playDeny();
                        removeTalent(item.node.id);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t('talent.remove')}
                      style={({ pressed }) => [styles.minus, pressed ? styles.pressed : null]}
                    >
                      <Text style={styles.minusLabel}>−</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}

              {pluses.map((slot) => (
                <Pressable
                  key={`plus-${slot.dimensionId}-${slot.parentId ?? 'root'}`}
                  onPress={() => {
                    setCompose({
                      mode: 'add',
                      dimensionId: slot.dimensionId,
                      ...(slot.parentId === undefined ? {} : { parentId: slot.parentId }),
                    });
                    setDraft('');
                    setNotice(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('talent.add')}
                  style={({ pressed }) => [
                    styles.plus,
                    {
                      left: slot.x - PLUS / 2,
                      top: slot.y - PLUS / 2,
                    },
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.plusLabel}>+</Text>
                </Pressable>
              ))}
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>

      {compose !== null ? (
        <View style={styles.composer}>
          <Text style={styles.composerLabel}>
            {t(dimensionShortKey(compose.dimensionId))} · {t(compose.mode === 'rename' ? 'talent.save' : 'talent.add')}
          </Text>
          {keyboardHeight > 0 ? null : (
            <Text style={styles.composerHint}>{t(talentVectorKey(compose.dimensionId))}</Text>
          )}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('talent.placeholder')}
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            accessibilityLabel={t('talent.placeholder')}
            returnKeyType="done"
            autoFocus
            onSubmitEditing={submit}
          />
          <View style={styles.composerActions}>
            <ActionButton
              label={t('common.cancel')}
              variant="ghost"
              sound="deny"
              style={styles.composerAction}
              onPress={() => {
                setCompose(null);
                setDraft('');
              }}
            />
            <ActionButton
              label={t(compose.mode === 'rename' ? 'talent.save' : 'talent.add')}
              sound="none"
              onPress={submit}
              style={styles.composerAction}
            />
          </View>
        </View>
      ) : null}
    </ModalSheet>

      <VectorInfoSheet
        dimensionId={openVector}
        onClose={() => setOpenVector(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  title: {
    ...typography.modalTitle,
    flex: 1,
    color: colors.text.ivory,
  },
  notice: {
    ...typography.captionStrong,
    paddingHorizontal: space.lg,
    color: colors.accent.gold,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    ...typography.cardTitle,
    color: colors.text.primary,
  },
  viewport: {
    overflow: 'hidden',
    marginHorizontal: space.sm,
    marginBottom: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface.sunken,
  },
  panStage: {
    flex: 1,
  },
  canvas: {
    transformOrigin: 'left top',
  },
  hub: {
    position: 'absolute',
    width: 48,
    ...typography.micro,
    color: colors.accent.goldMuted,
    textAlign: 'center',
  },
  vectorNode: {
    position: 'absolute',
    width: NODE_W,
    height: NODE_H,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.tint.goldStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  vectorLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: colors.text.ivory,
    textAlign: 'center',
  },
  talentSlot: {
    position: 'absolute',
    width: NODE_W,
    height: NODE_H,
  },
  talentNode: {
    width: NODE_W,
    height: NODE_H,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.cyanStrong,
    backgroundColor: colors.surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  talentLabel: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  minus: {
    position: 'absolute',
    right: -7,
    top: -7,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.tint.burned,
    borderWidth: 1,
    borderColor: colors.border.burned,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusLabel: {
    ...typography.captionStrong,
    color: colors.state.burned,
  },
  plus: {
    position: 'absolute',
    width: PLUS,
    height: PLUS,
    borderRadius: PLUS / 2,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusLabel: {
    ...typography.labelLg,
    color: colors.accent.gold,
  },
  composer: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.sm,
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  composerAction: {
    flex: 1,
    gap: space.sm,
  },
  composerLabel: {
    ...typography.eyebrow,
    color: colors.accent.goldMuted,
  },
  composerHint: {
    ...typography.caption,
    color: colors.text.muted,
  },
  input: {
    ...typography.input,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.surface.sunken,
    color: colors.text.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  pressed: {
    opacity: motion.pressOpacity,
  },
});
