/* eslint-disable no-magic-numbers */
import React from 'react';
import { useTranslate } from '@src/ui/hooks';
import { Amount } from './Amount';

export interface Props {
  collateral: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
}
export const Collateral = ({ collateral, amountTransformer, coinSymbol }: Props): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <Amount
      amount={collateral}
      amountTransformer={amountTransformer}
      coinSymbol={coinSymbol}
      label={t('package.core.activityDetails.collateral')}
      tooltip={t('package.core.activityDetails.collateralInfo')}
    />
  );
};
