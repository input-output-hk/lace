/* eslint-disable no-magic-numbers */
import React from 'react';
import { useTranslate } from '@src/ui/hooks';
import { Amount } from './Amount';

export interface TransactionFeeProps {
  fee: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
}
export const TransactionFee = ({ fee, amountTransformer, coinSymbol }: TransactionFeeProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <Amount
      amount={fee}
      amountTransformer={amountTransformer}
      coinSymbol={coinSymbol}
      label={t('package.core.activityDetails.transactionFee')}
      tooltip={t('package.core.activityDetails.transactionFeeInfo')}
    />
  );
};
