import React from 'react';
import { useTranslate } from '@src/ui/hooks';
import { TransactionSummary } from '@lace/ui';

export interface Props {
  collateral: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
}
export const Collateral = ({ collateral, amountTransformer, coinSymbol }: Props): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <TransactionSummary.Amount
      amount={`${collateral} ${coinSymbol}`}
      fiatPrice={amountTransformer(collateral)}
      label={t('core.activityDetails.collateral')}
      tooltip={t('core.activityDetails.collateralInfo')}
    />
  );
};
