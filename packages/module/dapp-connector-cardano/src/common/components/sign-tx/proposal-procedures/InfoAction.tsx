import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

import { ProposalProcedureHeader } from './ProposalProcedureHeader';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the InfoAction component.
 */
export interface InfoActionProps {
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
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays an info governance action proposal.
 *
 * Info actions are purely informational and don't have additional parameters.
 *
 * @param props - Component props
 * @returns React element displaying info action details
 */
export const InfoAction = ({
  deposit,
  rewardAccount,
  anchor,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  testID,
}: InfoActionProps) => {
  const { t } = useTranslation();

  return (
    <Column gap={spacing.L} testID={testID}>
      <ProposalProcedureHeader
        actionType={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.info-action',
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

      <Text.XS variant="secondary">
        {t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.info-action-notice',
        )}
      </Text.XS>
    </Column>
  );
};
