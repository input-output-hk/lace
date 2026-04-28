import { useTheme } from '../../design-tokens';

import type { Theme } from '../../design-tokens/theme/types';
import type { BlockchainName } from '@lace-lib/util-store';

/**
 * Gets the appropriate ProgressBar color based on a percentage value.
 * Used for saturation-based color logic.
 *
 * @param percentage - The percentage value (0-100)
 * @returns The appropriate color string
 */
export const getSaturationColor = (
  percentage: number,
): 'negative' | 'neutral' | 'positive' => {
  if (percentage >= 80) return 'negative';
  if (percentage >= 60) return 'neutral';
  return 'positive';
};

/**
 * Gets the theme color value for a given ProgressBarColor.
 *
 * @param color - The ProgressBarColor to convert
 * @param theme - The current theme
 * @returns The color value as a string
 */
export const getProgressBarColorForTheme = (
  color: 'negative' | 'neutral' | 'positive' | 'primary' | 'secondary',
  theme: Theme,
): string => {
  switch (color) {
    case 'primary':
      return theme.brand.ascending;
    case 'secondary':
      return theme.brand.ascendingSecondary;
    case 'positive':
      return theme.data.positive;
    case 'negative':
      return theme.data.negative;
    case 'neutral':
      return theme.brand.yellow;
    default:
      return theme.brand.ascending;
  }
};

export const getBlockchainColor = (blockchainName: BlockchainName) => {
  const { theme } = useTheme();
  switch (blockchainName) {
    case 'Cardano':
      return theme.extra.chathamsBlue;
    case 'Bitcoin':
      return theme.brand.orange;
    case 'Midnight':
      return theme.background.primary;
    default:
      return theme.background.primary;
  }
};
