import type { ViewStyle } from 'react-native';

import { radius, spacing } from '@lace-lib/ui-toolkit';

/**
 * The layout the summary screens share. Plain objects, not `StyleSheet.create`:
 * they are passed to `Card`'s `cardStyle` and merged with its own sheet either
 * way.
 */
export const cardLayout: {
  body: ViewStyle;
  card: ViewStyle;
  content: ViewStyle;
} = {
  /** Takes the row's spare width, so figures stay pinned to the right edge. */
  body: { flex: 1 },
  // radius.M, not the Card atom's default radius.S: the wizard's own option
  // cards are radius.M, and a flow that changes its corner radius between steps
  // reads as two different surfaces.
  card: { gap: spacing.M, borderRadius: radius.M },
  // Own margin rather than a bigger title block, matching the choose-
  // destination step: the frame's title spacing is the heading-to-body-copy
  // gap, and the first thing here is a section caption, not body copy.
  content: { marginTop: spacing.M },
};
