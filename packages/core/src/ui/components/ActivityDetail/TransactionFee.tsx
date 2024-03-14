import React from 'react';
import { useTranslate } from '@src/ui/hooks';
import { TransactionSummary } from '@lace/ui';

export interface TransactionFeeProps {
  fee: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
}
export const TransactionFee = ({ fee, amountTransformer, coinSymbol }: TransactionFeeProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <TransactionSummary.Amount
      amount={`${fee} ${coinSymbol}`}
      fiatPrice={amountTransformer(fee)}
      label={t('core.activityDetails.transactionFee')}
      tooltip={t('core.activityDetails.transactionFeeInfo')}
      data-testid="fee"
    />
  );
};
