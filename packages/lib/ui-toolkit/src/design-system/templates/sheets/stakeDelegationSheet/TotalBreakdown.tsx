import React from 'react';

import { spacing } from '../../../../design-tokens';
import { Column, Divider, Row, Text } from '../../../atoms';

interface TotalBreakdownProps {
  totalBreakdownLabel: string;
  stakeKeyDepositLabel?: string;
  stakeKeyDepositAda?: string;
  stakeKeyDepositReturnLabel?: string;
  stakeKeyDepositReturnAda?: string;
  transactionFeeLabel: string;
  transactionFeeAda: string;
  totalLabel: string;
  totalAda: string;
}

export const TotalBreakdown = ({
  totalBreakdownLabel,
  stakeKeyDepositLabel,
  stakeKeyDepositAda,
  stakeKeyDepositReturnLabel,
  stakeKeyDepositReturnAda,
  transactionFeeLabel,
  transactionFeeAda,
  totalLabel,
  totalAda,
}: TotalBreakdownProps) => {
  return (
    <Column gap={spacing.M}>
      <Text.L>{totalBreakdownLabel}</Text.L>

      {/* Stake key Deposit (only for first-time delegation) */}
      {stakeKeyDepositAda && (
        <Row justifyContent="space-between">
          <Text.M variant="secondary">{stakeKeyDepositLabel}</Text.M>
          <Text.M>{stakeKeyDepositAda}</Text.M>
        </Row>
      )}

      {/* Stake key Deposit return (only for undelegation) */}
      {stakeKeyDepositReturnAda && (
        <Row justifyContent="space-between">
          <Text.M variant="secondary">{stakeKeyDepositReturnLabel}</Text.M>
          <Text.M>{stakeKeyDepositReturnAda}</Text.M>
        </Row>
      )}

      {/* Transaction Fee */}
      <Row justifyContent="space-between">
        <Text.M variant="secondary">{transactionFeeLabel}</Text.M>
        <Text.M>{transactionFeeAda}</Text.M>
      </Row>

      <Divider />

      {/* Total */}
      <Row justifyContent="space-between">
        <Text.M variant="secondary">{totalLabel}</Text.M>
        <Text.M>{totalAda}</Text.M>
      </Row>
    </Column>
  );
};
