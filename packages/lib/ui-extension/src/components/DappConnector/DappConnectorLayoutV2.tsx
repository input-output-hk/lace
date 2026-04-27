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
}: LayoutProps) => {
  const { vars } = useTheme();

  const containerStyle: CSSProperties = useMemo(
    () => ({
      width: CONTAINER_WIDTH,
      height: CONTAINER_HEIGHT,
      backgroundColor: vars.colors.$dialog_container_bgColor,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }),
    [vars],
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
      paddingTop: 8,
      paddingLeft: PADDING,
      paddingRight: PADDING,
      paddingBottom: PADDING,
    }),
    [],
  );

  const footerStyle: CSSProperties = useMemo(
    () => ({
      flexShrink: 0,
      borderTop: `1px solid ${vars.colors.$divider_bgColor}`,
      backgroundColor: vars.colors.$dialog_container_bgColor,
      padding: PADDING,
      paddingBottom: 50,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }),
    [vars],
  );

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <LaceLogo height={40} width={40} data-testid="dapp-connector-logo" />
      </div>

      <div style={contentStyle}>{children}</div>

      <div style={footerStyle}>
        {primaryButton && (
          <Button.CallToAction
            label={primaryButton.label}
            w="$fill"
            onClick={primaryButton.action}
            disabled={primaryButton.disabled}
            data-testid="dapp-connector-primary-button"
          />
        )}
        {secondaryButton && (
          <Button.Secondary
            label={secondaryButton.label}
            w="$fill"
            onClick={secondaryButton.action}
            data-testid="dapp-connector-secondary-button"
          />
        )}
      </div>
    </div>
  );
};
