import React from 'react';
import { useTranslate } from '@src/ui/hooks';
import { TransactionSummary } from '@lace/ui';

export interface Props {
  collateral: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  displayFiat?: boolean;
  className?: string;
}
export const Collateral = ({
  collateral,
  amountTransformer,
  coinSymbol,
  displayFiat,
  className
}: Props): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <TransactionSummary.Amount
      amount={`${collateral} ${coinSymbol}`}
      fiatPrice={amountTransformer(collateral)}
      label={t('package.core.activityDetails.collateral')}
      tooltip={t('package.core.activityDetails.collateralInfo')}
      displayFiat={displayFiat}
      className={className}
    />
  );
};
