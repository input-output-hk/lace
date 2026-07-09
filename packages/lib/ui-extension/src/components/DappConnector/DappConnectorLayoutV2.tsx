import type { ReactNode } from 'react';

import { Button, spacing, useTheme } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import LaceLogo from '../../assets/images/lace-logo.component.svg';

/**
 * Props for action buttons in the layout footer.
 */
type ButtonProps = {
  /**
   * Handler called when the button is pressed.
   */
  action: () => void;
  /**
   * Text label displayed on the button.
   */
  label: string;
  /**
   * Whether the button is disabled. Defaults to false.
   */
  disabled?: boolean;
};

/**
 * Props for the DappConnectorLayout component.
 */
interface LayoutProps {
  /**
   * Content to display in the scrollable area.
   */
  children: ReactNode;
  /**
   * Primary action button (e.g., "Authorize", "Confirm").
   * Rendered as a call-to-action button.
   */
  primaryButton?: ButtonProps;
  /**
   * Secondary action button (e.g., "Cancel", "Deny").
   * Rendered as a secondary button.
   */
  secondaryButton?: ButtonProps;
  /**
   * Footer button layout. Defaults to the existing stacked popup layout.
   */
  footerOrientation?: 'horizontal' | 'vertical';
  /**
   * Whether to render the Lace logo header. Defaults to the existing popup chrome.
   */
  showHeader?: boolean;
  /**
   * When true, the layout fills the available viewport instead of using the
   * fixed 360×650 popup size. Use this when the layout is rendered in a
   * resizable popupWindow so the content grows with the window.
   */
  fillViewport?: boolean;
}

const CONTAINER_WIDTH = 360;
const CONTAINER_HEIGHT = 650;
const FOOTER_PADDING_BOTTOM_VERTICAL = 50;

const staticStyles = StyleSheet.create({
  fixedContainer: {
    width: CONTAINER_WIDTH,
    height: CONTAINER_HEIGHT,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  fillContainer: {
    // 'fixed' pins to the viewport regardless of any wrapping RN Web shell.
    // Cast to 'absolute' to satisfy RN's PositionValue type — RN Web renders it as CSS position:fixed.
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexShrink: 0,
    padding: spacing.M,
    paddingBottom: spacing.S,
  },
  scrollView: {
    flex: 1,
  },
  footerBase: {
    flexShrink: 0,
    borderTopWidth: 1,
    padding: spacing.M,
    gap: spacing.S,
  },
  footerHorizontal: {
    flexDirection: 'row',
    paddingBottom: spacing.M,
  },
  footerVertical: {
    flexDirection: 'column',
    paddingBottom: FOOTER_PADDING_BOTTOM_VERTICAL,
  },
  buttonWrapperFlex: {
    flex: 1,
  },
});

/**
 * Theme-aware dApp connector layout for Lace-Extension.
 * Uses theme tokens from @lace-lib/ui-toolkit for dark/light mode support.
 *
 * The layout has a fixed header (Lace logo), scrollable content area,
 * and fixed footer (action buttons) - matching Lace V1 behavior.
 *
 * @param props - Component props
 * @returns React element containing the layout structure
 */
export const DappConnectorLayoutV2 = ({
  children,
  primaryButton,
  secondaryButton,
  footerOrientation = 'vertical',
  showHeader = true,
  fillViewport = false,
}: LayoutProps) => {
  const { theme } = useTheme();
  const isHorizontalFooter = footerOrientation === 'horizontal';

  const containerStyle = useMemo(
    () => [
      fillViewport ? staticStyles.fillContainer : staticStyles.fixedContainer,
      { backgroundColor: theme.background.page },
    ],
    [fillViewport, theme],
  );

  const contentStyle = useMemo(
    () => ({
      paddingTop: showHeader ? spacing.S : spacing.M,
      paddingHorizontal: spacing.M,
      paddingBottom: spacing.M,
    }),
    [showHeader],
  );

  const footerStyle = useMemo(
    () => [
      staticStyles.footerBase,
      isHorizontalFooter
        ? staticStyles.footerHorizontal
        : staticStyles.footerVertical,
      {
        borderTopColor: theme.border.top,
        backgroundColor: theme.background.page,
      },
    ],
    [isHorizontalFooter, theme],
  );

  const buttonWrapper = isHorizontalFooter
    ? staticStyles.buttonWrapperFlex
    : undefined;

  const secondaryButtonElement = secondaryButton ? (
    <View style={buttonWrapper}>
      <Button.Secondary
        fullWidth
        label={secondaryButton.label}
        onPress={secondaryButton.action}
        testID="dapp-connector-secondary-button"
      />
    </View>
  ) : null;

  const primaryButtonElement = primaryButton ? (
    <View style={buttonWrapper}>
      <Button.Primary
        fullWidth
        label={primaryButton.label}
        onPress={primaryButton.action}
        disabled={primaryButton.disabled}
        testID="dapp-connector-primary-button"
      />
    </View>
  ) : null;

  return (
    <View style={containerStyle}>
      {showHeader && (
        <View style={staticStyles.header}>
          <LaceLogo height={40} width={40} data-testid="dapp-connector-logo" />
        </View>
      )}
      <ScrollView
        style={staticStyles.scrollView}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      <View style={footerStyle}>
        {isHorizontalFooter ? secondaryButtonElement : primaryButtonElement}
        {isHorizontalFooter ? primaryButtonElement : secondaryButtonElement}
      </View>
    </View>
  );
};
