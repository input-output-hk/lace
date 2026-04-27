import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';

import { spacing, useTheme, type Theme } from '../../design-tokens';
import { Brand } from '../atoms';
import { TabBarMetrics } from '../organisms';

export const TIMEOUT_DURATION = 1500;

export type ColorType =
  | 'black'
  | 'lightGray'
  | 'negative'
  | 'neutral'
  | 'positive'
  | 'primary'
  | 'secondary'
  | 'white';

type ChromeGlobal = {
  runtime?: {
    id?: string;
  };
};

export type BackgroundType = 'colored' | 'semiTransparent' | 'transparent';
export type AmountParts = { value: string; ticker: string };

const KEYBOARD_VERTICAL_OFFSET_IOS = 50;
const KEYBOARD_VERTICAL_OFFSET_ANDROID = 20;

const SMALL_WIDTH = 744;
const MEDIUM_WIDTH = 1512;
export const TOAST_TRANSLATE_Y = 20;
export const MIN_SHEET_CONTENT_HEIGHT = 200;
export const SHEET_HEADER_HEIGHT = 60;
export const LOGO_HEIGHT = 30;
export const NAME_MAX_LENGTH = 20;
export const PORTFOLIO_MAX_CONTENT_WIDTH_WEB_EXTENSION = 960;
export const PORTFOLIO_MIN_GUTTER_WEB_EXTENSION = 16;
export const PORTFOLIO_CONTENT_FILL_RATIO_WEB_EXTENSION = 0.92;
export const getMinContentPortfolioWidth = (availableWidth: number) =>
  Math.min(
    availableWidth - PORTFOLIO_MIN_GUTTER_WEB_EXTENSION * 2,
    Math.round(availableWidth * PORTFOLIO_CONTENT_FILL_RATIO_WEB_EXTENSION),
    PORTFOLIO_MAX_CONTENT_WIDTH_WEB_EXTENSION,
  );

export const clampCenteredContentWidth = (availableWidth: number): number =>
  Math.max(0, getMinContentPortfolioWidth(availableWidth));

export const isCompactWidth = (width: number) => width <= SMALL_WIDTH;
export const isMediumWidth = (width: number) => width < MEDIUM_WIDTH;
export const isLargeWidth = (width: number) => width >= MEDIUM_WIDTH;

export const getLeftGapOnSideMenu = (isSideMenu: boolean) =>
  isSideMenu ? TabBarMetrics.vertical.width : 0;

export const getIsDark = (theme: Theme) => theme.name === 'dark';
export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const androidApiLevel =
  isAndroid && typeof Platform.Version === 'number'
    ? Platform.Version
    : undefined;
export const isAndroid15Plus =
  androidApiLevel !== undefined && androidApiLevel >= 35;

const getChromeRuntimeId = (): string | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const chromeGlobal = (
    globalThis as typeof globalThis & { chrome?: ChromeGlobal }
  ).chrome;
  return chromeGlobal?.runtime?.id;
};

export const isExtension = isWeb && !!getChromeRuntimeId();

export const isExtensionSidePanel = isExtension;

export const getIsMobile = (windowWidth: number) => windowWidth < 768;
export const getIsTablet = (windowWidth: number) =>
  windowWidth >= 768 && windowWidth < 1024;
export const getIsWideLayout = (windowWidth: number) =>
  isWeb && windowWidth >= 768;

export const KEYBOARD_VERTICAL_OFFSET = isIOS
  ? KEYBOARD_VERTICAL_OFFSET_IOS
  : KEYBOARD_VERTICAL_OFFSET_ANDROID;
export const keyboardBehavior = isIOS ? 'padding' : 'height';

// Background color constants
export const BACKGROUND_OPACITY = {
  SEMI_TRANSPARENT: 0.2,
} as const;

export const DEFAULT_SEMI_TRANSPARENT_BACKGROUND = 'rgba(0, 0, 0, 0.4)';

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Get background color based on color type and background type
 * Consistent opacity rules for all components:
 * - colored: 100% opacity (solid color)
 * - semiTransparent: 40% opacity
 * - transparent: 0% opacity (transparent)
 */
export const getBackgroundColor = (
  backgroundColorMap: Record<ColorType, string>,
  color: ColorType | undefined,
  backgroundType: BackgroundType,
): string => {
  if (color) {
    if (backgroundType === 'colored') {
      return backgroundColorMap[color];
    } else if (backgroundType === 'semiTransparent') {
      return hexToRgba(
        backgroundColorMap[color],
        BACKGROUND_OPACITY.SEMI_TRANSPARENT,
      );
    }
  } else {
    // When no color is provided
    if (backgroundType === 'semiTransparent') {
      return DEFAULT_SEMI_TRANSPARENT_BACKGROUND;
    }
  }

  // For transparent or when no valid conditions match
  return 'transparent';
};

export const renderLaceFooterLogo = () => {
  const { theme } = useTheme();
  const isDark = getIsDark(theme);
  const variant = isDark ? 'negative' : 'positive';
  return (
    <View style={styles.footer}>
      <Brand variant={variant} onlyLogo height={LOGO_HEIGHT} />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingBottom: spacing.XXXXL,
    paddingTop: spacing.L,
    alignSelf: 'center',
  },
});

export const getAndroidRipple = ({
  isDisabled,
  theme,
}: {
  isDisabled: boolean;
  theme: Theme;
}) => {
  if (isWeb) return undefined;
  if (isDisabled) return undefined;
  return {
    color: theme.extra.shadowDrop,
    borderless: false,
    foreground: true,
  };
};

export const getOverlayColor = (theme: Theme) => {
  const overlayBaseColor = theme.background.overlay;
  return overlayBaseColor.startsWith('#')
    ? hexToRgba(
        overlayBaseColor.slice(0, 8),
        BACKGROUND_OPACITY.SEMI_TRANSPARENT,
      )
    : overlayBaseColor;
};

export const getEarnedRewards = (earnedCoin: string) => {
  const normalized = earnedCoin.replace(/[^\d.,-]/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0;
};

export const getAmountParts = (amount?: string | null): AmountParts => {
  if (!amount) return { ticker: '', value: '' };

  const parts = amount.trim().split(/\s+/);
  if (parts.length === 0) return { ticker: '', value: '' };
  if (parts.length === 1) return { ticker: '', value: parts[0] ?? '' };

  const ticker = parts[parts.length - 1] ?? '';
  const value = parts.slice(0, -1).join(' ');
  return { value, ticker };
};
