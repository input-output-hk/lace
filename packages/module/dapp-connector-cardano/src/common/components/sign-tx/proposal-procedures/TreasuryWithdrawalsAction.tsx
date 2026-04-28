import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import {
  formatLovelace,
  formatRewardAccount,
  truncateHash,
} from '../../../utils';
import { calculateAdaFiatValue } from '../../../utils/sign-tx-utils';
import { InfoRow } from '../InfoRow';

import { ProposalProcedureHeader } from './ProposalProcedureHeader';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the TreasuryWithdrawalsAction component.
 */
export interface TreasuryWithdrawalsActionProps {
  /** The deposit amount in lovelace */
  deposit: Cardano.Lovelace;
  /** The reward account to return the deposit to */
  rewardAccount: Cardano.RewardAccount;
  /** The anchor containing URL and data hash */
  anchor: Cardano.Anchor;
  /** The coin symbol for display (e.g., "ADA", "tADA") */
  coinSymbol: string;
  /** Token prices for fiat conversion (optional) */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. "USD") */
  currencyTicker?: string;
  /** The treasury withdrawals governance action */
  governanceAction: Cardano.TreasuryWithdrawalsAction;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays a treasury withdrawals governance action proposal.
 *
 * Shows the list of withdrawal recipients and amounts.
 *
 * @param props - Component props
 * @returns React element displaying treasury withdrawals action details
 */
export const TreasuryWithdrawalsAction = ({
  deposit,
  rewardAccount,
  anchor,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  governanceAction,
  testID,
}: TreasuryWithdrawalsActionProps) => {
  const { t } = useTranslation();

  const withdrawals = useMemo(
    () => Array.from(governanceAction.withdrawals),
    [governanceAction.withdrawals],
  );

  return (
    <Column gap={spacing.L} testID={testID}>
      <ProposalProcedureHeader
        actionType={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.treasury-withdrawals',
        )}
        deposit={deposit}
        rewardAccount={rewardAccount}
        anchor={anchor}
        coinSymbol={coinSymbol}
        tokenPrices={tokenPrices}
        currencyTicker={currencyTicker}
        testID={testID ? `${testID}-header` : undefined}
      />

      <Divider />
      <Text.XS>
        {t('dapp-connector.cardano.sign-tx.proposal-procedures.withdrawals')}
      </Text.XS>

      {withdrawals.map((withdrawal, index) => (
        <Column gap={spacing.L} key={`${withdrawal.rewardAccount}-${index}`}>
          {index > 0 && <Divider />}
          <InfoRow
            label={t(
              'dapp-connector.cardano.sign-tx.proposal-procedures.withdrawal-recipient',
            )}
            value={truncateHash(formatRewardAccount(withdrawal.rewardAccount))}
            testID={testID ? `${testID}-recipient-${index}` : undefined}
          />

          <InfoRow
            label={t(
              'dapp-connector.cardano.sign-tx.proposal-procedures.withdrawal-amount',
            )}
            value={formatLovelace(withdrawal.coin, coinSymbol)}
            secondaryValue={calculateAdaFiatValue(
              withdrawal.coin,
              tokenPrices,
              currencyTicker,
            )}
            testID={testID ? `${testID}-amount-${index}` : undefined}
          />
        </Column>
      ))}

      {governanceAction.policyHash && (
        <>
          <Divider />
          <InfoRow
            label={t(
              'dapp-connector.cardano.sign-tx.proposal-procedures.policy-hash',
            )}
            value={truncateHash(governanceAction.policyHash)}
            testID={testID ? `${testID}-policy-hash` : undefined}
          />
        </>
      )}
    </Column>
  );
};
