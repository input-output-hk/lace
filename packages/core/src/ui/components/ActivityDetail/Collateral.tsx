import React from 'react';
import { useTranslate } from '@src/ui/hooks';
import { Box, TransactionSummary, InfoBar } from '@lace/ui';
import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';

export enum CollateralStatus {
  REVIEW = 'review',
  SUCCESS = 'success',
  ERROR = 'error',
  NONE = 'none'
}

export interface Props {
  collateral: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  displayFiat?: boolean;
  className?: string;
  status?: CollateralStatus;
}

export const Collateral = ({
  collateral,
  amountTransformer,
  coinSymbol,
  displayFiat,
  className,
  status = CollateralStatus.REVIEW
}: Props): React.ReactElement => {
  const { t } = useTranslate();

  const getTooltipText = (): string => {
    switch (status) {
      case 'review':
      case 'error':
        return t('package.core.activityDetails.collateral.tooltip.info');
      case 'success':
        return t('package.core.activityDetails.collateral.tooltip.success');
    }

    return '';
  };

  return (
    <>
      <TransactionSummary.Amount
        amount={`${collateral} ${coinSymbol}`}
        fiatPrice={amountTransformer(collateral)}
        label={t('package.core.activityDetails.collateral.label')}
        tooltip={getTooltipText()}
        displayFiat={displayFiat}
        className={className}
      />
      {status === CollateralStatus.ERROR && (
        <Box mt="$32">
          <InfoBar icon={<InfoIcon />} message={t('package.core.activityDetails.collateral.error')} />
        </Box>
      )}
    </>
  );
};
