import { InlineWindow } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { useMidnightProofServerBannerContent } from './useMidnightProofServerBannerContent';

/**
 * Same content as PortfolioBanner (InlineWindow with proof server message), but without close button and with transparent background.
 * Rendered in send sheet footer below the divider for Midnight.
 */
export const SendSheetFooterTitleRow = () => {
  const { description, leftIcon, leftIconColor } =
    useMidnightProofServerBannerContent();

  const cardStyle = useMemo(
    () => ({
      backgroundColor: 'transparent' as const,
      borderWidth: 0,
      boxShadow: 'none' as const,
      shadowRadius: 0,
      elevation: 0,
      width: '100%' as const,
      paddingHorizontal: 0,
    }),
    [],
  );

  return (
    <InlineWindow
      description={description}
      leftIcon={leftIcon}
      leftIconColor={leftIconColor}
      action={() => {}}
      progressValue={0}
      cardStyle={cardStyle}
    />
  );
};
