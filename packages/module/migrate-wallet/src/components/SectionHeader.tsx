import type { TextStyle } from 'react-native';

import { Text } from '@lace-lib/ui-toolkit';
import React from 'react';

/**
 * Names the block that follows. Set as a caption rather than a heading: these
 * label groups of figures, so at body size they compete with the figures
 * themselves.
 */
export const SectionHeader = ({ label }: { label: string }) => (
  <Text.XS variant="tertiary" style={sectionHeaderText}>
    {label}
  </Text.XS>
);

/**
 * A plain object rather than `StyleSheet.create`, so this stays out of
 * react-native's runtime graph — the steps that use it are unit-testable with
 * ui-toolkit mocked.
 */
const sectionHeaderText: TextStyle = {
  textTransform: 'uppercase',
  letterSpacing: 1.2,
};
