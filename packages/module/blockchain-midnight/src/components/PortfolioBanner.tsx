import { InlineWindow, useTheme } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import { useMidnightProofServerBannerContent } from './useMidnightProofServerBannerContent';

interface PortfolioBannerProps {
  accountId: string;
}

export const PortfolioBanner = ({ accountId }: PortfolioBannerProps) => {
  const { theme } = useTheme();
  const { description, leftIcon, leftIconColor } =
    useMidnightProofServerBannerContent();

  const accountTokens = useLaceSelector(
    'tokens.selectAggregatedTokensByAccountId',
    accountId,
  );
  const hasTokens = (accountTokens?.length ?? 0) > 0;

  const isDismissed = useLaceSelector(
    'midnightContext.selectIsPortfolioBannerDismissed',
  );

  const dismissPortfolioBanner = useDispatchLaceAction(
    'midnightContext.dismissPortfolioBanner',
  );
  const handleDismiss = useCallback(() => {
    dismissPortfolioBanner();
  }, [dismissPortfolioBanner]);

  const cardStyle = useMemo(() => {
    // Light theme: use supportSecondary for better contrast with secondary text; dark: Brand/BrandSupport
    const bgColor =
      theme.name === 'light'
        ? theme.brand.supportSecondary
        : theme.brand.support;
    return {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: bgColor,
      backgroundColor: bgColor,
    };
  }, [theme.name, theme.brand.support, theme.brand.supportSecondary]);

  // Don't show on empty state
  if (!hasTokens) return null;

  // Don't show if already dismissed
  if (isDismissed) return null;

  return (
    <InlineWindow
      description={description}
      leftIcon={leftIcon}
      leftIconColor={leftIconColor}
      action={() => {}}
      progressValue={0}
      onClose={handleDismiss}
      cardStyle={cardStyle}
    />
  );
};
