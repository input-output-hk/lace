import React from 'react';

import { spacing } from '../../../../design-tokens';
import { Column, Text } from '../../../atoms';
import { TotalBreakdown } from '../stakeDelegationSheet/TotalBreakdown';

export type EarnRewardsSummarySheetProps = {
  /**
   * Display-ready rate statement shown above the cost breakdown (e.g.
   * "You'll earn up to 3.2% a year"). Omitted when no rate is advertised.
   */
  earningRate?: string;

  /** Fee/deposit/total breakdown (see TotalBreakdown). */
  totalBreakdownLabel: string;
  stakeKeyDepositLabel?: string;
  stakeKeyDepositAda?: string;
  transactionFeeLabel: string;
  transactionFeeAda: string;
  totalLabel: string;
  totalAda: string;

  /**
   * Optional footnote clarifying what delegation means for the user — that
   * voting power backs Lace staying free, open-source and secure, and that the
   * pool / DRep can be changed later.
   */
  note?: string;

  testID?: string;
};

/**
 * Read-only summary body for the one-tap earn-rewards flow. "Earn rewards" is
 * an abstraction over the locked pool + DRep targets, so the summary shows only
 * the cost breakdown before signing — deliberately not the specific delegation
 * targets. Presentational only; the confirm action is wired by the hosting
 * sheet's footer.
 */
export const EarnRewardsSummarySheet = ({
  earningRate,
  totalBreakdownLabel,
  stakeKeyDepositLabel,
  stakeKeyDepositAda,
  transactionFeeLabel,
  transactionFeeAda,
  totalLabel,
  totalAda,
  note,
  testID = 'earn-rewards-summary',
}: EarnRewardsSummarySheetProps) => {
  return (
    <Column gap={spacing.L} testID={testID}>
      {earningRate !== undefined && (
        <Text.L testID={`${testID}-earning-rate`}>{earningRate}</Text.L>
      )}

      <TotalBreakdown
        totalBreakdownLabel={totalBreakdownLabel}
        stakeKeyDepositLabel={stakeKeyDepositLabel}
        stakeKeyDepositAda={stakeKeyDepositAda}
        transactionFeeLabel={transactionFeeLabel}
        transactionFeeAda={transactionFeeAda}
        totalLabel={totalLabel}
        totalAda={totalAda}
      />

      {note !== undefined && (
        <Text.XS variant="tertiary" testID={`${testID}-note`}>
          {note}
        </Text.XS>
      )}
    </Column>
  );
};
