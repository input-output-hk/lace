import { spacing } from '../../../design-tokens';

/**
 * Tab bar dimension constants.
 * Extracted to a separate file to avoid pulling in expo-haptics and
 * react-native-reanimated dependencies when only the metrics are needed.
 */
export const TabBarMetrics = {
  horizontal: {
    height: 58,
    bottom: spacing.M,
  },
  vertical: {
    width: 122,
  },
  laceButton: {
    width: 74,
    height: 74,
  },
};
