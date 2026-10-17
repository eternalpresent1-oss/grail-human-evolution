import { type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { CharacterOctagon } from '@/components/CharacterOctagon';
import type { OctagonViewMode } from '@/types/grail';

interface BreathingCharacterCoreProps {
  mode: OctagonViewMode;
  interactiveToggle?: boolean;
}

/** Holds the background layer that sits behind the octagon. */
export function BreathingCharacterCore({
  mode,
  interactiveToggle = false,
}: BreathingCharacterCoreProps): ReactElement {
  return (
    <View style={styles.stage}>
      <CharacterOctagon embedded mode={mode} interactiveToggle={interactiveToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
