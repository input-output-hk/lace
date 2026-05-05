import type { CSSProperties, ReactNode } from 'react';

import { Button, useTheme } from '@input-output-hk/lace-ui-toolkit';
import React, { useMemo } from 'react';

import LaceLogo from '../../assets/images/lace-logo.component.svg';

/**
 * Props for action buttons in the layout footer.
 */
type ButtonProps = {
  /**
   * Handler called when the button is clicked.
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
const PADDING = 16;

/**
 * Theme-aware dApp connector layout for Lace-Extension.
 * Uses vanilla-extract CSS variables from lace-ui-toolkit for proper
 * dark/light mode support in the Expo web context.
 *
 * The layout has a fixed header (Lace logo + title), scrollable content area,
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
  const { vars } = useTheme();
  const isHorizontalFooter = footerOrientation === 'horizontal';

  const containerStyle: CSSProperties = useMemo(
    () =>
      fillViewport
        ? {
            // Pin to the viewport so the layout fills the popupWindow exactly,
            // independent of any wrapping React Native Web / Expo shell layout.
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: vars.colors.$dialog_container_bgColor,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }
        : {
            width: CONTAINER_WIDTH,
            height: CONTAINER_HEIGHT,
            backgroundColor: vars.colors.$dialog_container_bgColor,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
    [fillViewport, vars],
  );

  const headerStyle: CSSProperties = useMemo(
    () => ({
      flexShrink: 0,
      padding: PADDING,
      paddingBottom: 8,
    }),
    [],
  );

  const contentStyle: CSSProperties = useMemo(
    () => ({
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingTop: showHeader ? 8 : PADDING,
      paddingLeft: PADDING,
      paddingRight: PADDING,
      paddingBottom: PADDING,
    }),
    [showHeader],
  );

  const footerStyle: CSSProperties = useMemo(
    () => ({
      flexShrink: 0,
      borderTop: `1px solid ${vars.colors.$divider_bgColor}`,
      backgroundColor: vars.colors.$dialog_container_bgColor,
      padding: PADDING,
      paddingBottom: isHorizontalFooter ? PADDING : 50,
      display: 'flex',
      flexDirection: isHorizontalFooter ? 'row' : 'column',
      gap: 8,
    }),
    [isHorizontalFooter, vars],
  );

  const buttonWrapperStyle: CSSProperties | undefined = useMemo(
    () => (isHorizontalFooter ? { flex: 1 } : undefined),
    [isHorizontalFooter],
  );

  const secondaryButtonElement = secondaryButton ? (
    <div style={buttonWrapperStyle}>
      <Button.Secondary
        label={secondaryButton.label}
        w="$fill"
        onClick={secondaryButton.action}
        data-testid="dapp-connector-secondary-button"
      />
    </div>
  ) : null;

  const primaryButtonElement = primaryButton ? (
    <div style={buttonWrapperStyle}>
      <Button.CallToAction
        label={primaryButton.label}
        w="$fill"
        onClick={primaryButton.action}
        disabled={primaryButton.disabled}
        data-testid="dapp-connector-primary-button"
      />
    </div>
  ) : null;

  return (
    <div style={containerStyle}>
      {showHeader && (
        <div style={headerStyle}>
          <LaceLogo height={40} width={40} data-testid="dapp-connector-logo" />
        </div>
      )}

      <div style={contentStyle}>{children}</div>

      <div style={footerStyle}>
        {isHorizontalFooter ? secondaryButtonElement : primaryButtonElement}
        {isHorizontalFooter ? primaryButtonElement : secondaryButtonElement}
      </div>
    </div>
  );
};
