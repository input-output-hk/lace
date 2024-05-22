import React from 'react';
import { Box, TransactionSummary, InfoBar } from '@lace/ui';
import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';
import { useTranslation } from 'react-i18next';

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
  testId?: string;
}

export const Collateral = ({
  collateral,
  amountTransformer,
  coinSymbol,
  displayFiat,
  className,
  testId,
  status = CollateralStatus.REVIEW
}: Props): React.ReactElement => {
  const { t } = useTranslation();

  const getTooltipText = (): string => {
    switch (status) {
      case 'review':
      case 'error':
        return t('core.activityDetails.collateral.tooltip.info');
      case 'success':
        return t('core.activityDetails.collateral.tooltip.success');
    }

    return '';
  };

  return (
    <>
      <TransactionSummary.Amount
        amount={`${collateral} ${coinSymbol}`}
        fiatPrice={amountTransformer(collateral)}
        label={t('core.activityDetails.collateral.label')}
        tooltip={getTooltipText()}
        displayFiat={displayFiat}
        className={className}
        data-testid={testId ?? 'collateral'}
      />
      {status === CollateralStatus.ERROR && (
        <Box mt="$32">
          <InfoBar icon={<InfoIcon />} message={t('core.activityDetails.collateral.error')} />
        </Box>
      )}
    </>
  );
};
