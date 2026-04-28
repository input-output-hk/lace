import type { ImageURISource, StyleProp, ViewStyle } from 'react-native';

import { getAssetImageUrl } from '../design-system';
import { radius, spacing } from '../design-tokens';

import type { IconName } from '../design-system';

export type ImageShape = 'hexagon' | 'rounded' | 'squared';

export interface AvatarStyleSheetProps {
  size: number;
  shape: ImageShape;
  isShielded?: boolean;
}

export type AvatarContent = {
  img?: ImageURISource;
  fallback?: string;
};

export interface AvatarProps {
  size?: number;
  content: AvatarContent;
  shape?: ImageShape;
  isShielded?: boolean;
  chainSymbol?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const getShieldIconPosition = (
  shape: ImageShape,
  size: number,
  iconSize = 12,
) => {
  switch (shape) {
    case 'squared':
      const squaredOffset = Math.max(4, size * 0.1);
      return {
        top: squaredOffset,
        right: squaredOffset,
      };

    case 'rounded':
    case 'hexagon':
      const offset = iconSize / 2;
      const adjustment = size * 0.1;
      return {
        top: -offset + adjustment,
        right: -offset + adjustment,
      };

    default:
      const defaultAdjustment = size * 0.1;
      return {
        top: -iconSize / 2 + defaultAdjustment,
        right: -iconSize / 2 + defaultAdjustment,
      };
  }
};

export const getChainSymbolPosition = (
  assetSize: number,
  beaconSize = spacing.M,
): { bottom: number; right: number } => {
  const offset = beaconSize / 2;
  const overflow = -offset * 0.3;
  const position = assetSize * 0.04;

  return {
    bottom: overflow + position,
    right: overflow + position,
  };
};

export const getImageSource = (
  content: AvatarContent,
): ImageURISource | undefined => {
  const uri = getAssetImageUrl(content.img?.uri);
  return uri ? { uri } : undefined;
};

export const getBorderRadius = (
  size: number,
  shape: AvatarStyleSheetProps['shape'],
): number => {
  switch (shape) {
    case 'rounded':
      return size / 2;
    case 'squared':
      return Math.min(radius.S, size * 0.25);
    case 'hexagon':
      return 0;
    default:
      return radius.XS;
  }
};
