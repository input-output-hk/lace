import React from 'react';
import { useTranslate } from '@src/ui/hooks';
import { TransactionSummary } from '@lace/ui';

export interface TransactionFeeProps {
  fee: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  label?: string;
  className?: string;
  testId?: string;
  tooltipInfo?: string;
  displayFiat?: boolean;
  highlightPositiveAmount?: boolean;
}
export const TransactionFee = ({
  fee,
  amountTransformer,
  coinSymbol,
  label,
  className,
  testId,
  tooltipInfo,
  displayFiat,
  highlightPositiveAmount
}: TransactionFeeProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <TransactionSummary.Amount
      amount={`${fee} ${coinSymbol}`}
      fiatPrice={amountTransformer(fee)}
      label={label ?? t('core.activityDetails.transactionFee')}
      tooltip={tooltipInfo}
      data-testid={testId ?? 'fee'}
      className={className}
      displayFiat={displayFiat}
      highlightPositiveAmount={highlightPositiveAmount}
    />
  );
};
