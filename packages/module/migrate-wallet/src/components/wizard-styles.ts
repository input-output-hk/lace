import type { TextStyle } from 'react-native';

/**
 * Explicit line heights, since most sentences here wrap. Two values because
 * `Text.M` is 16px and `Text.S` is 14px — one constant leaves the larger at a
 * 1.25 ratio, tight enough that warnings set as a solid block.
 */
export const BODY_LINE_HEIGHT = 24;
export const SMALL_LINE_HEIGHT = 20;

/**
 * Plain objects, not `StyleSheet.create`: some steps are unit-tested with
 * ui-toolkit mocked out and never load react-native, and a runtime import here
 * would be the only thing pulling it into those graphs.
 */
export const wizardText: {
  bodyLine: TextStyle;
  smallLine: TextStyle;
} = {
  bodyLine: {
    lineHeight: BODY_LINE_HEIGHT,
  },
  smallLine: {
    lineHeight: SMALL_LINE_HEIGHT,
  },
};
