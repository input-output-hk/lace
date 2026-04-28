import { useTranslation } from '@lace-contract/i18n';
import { Column, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';

import {
  formatProposalDeposit,
  formatRewardAccount,
  truncateHash,
} from '../../../utils';
import { calculateAdaFiatValue } from '../../../utils/sign-tx-utils';
import { InfoRow } from '../InfoRow';
import { LinkableText } from '../LinkableText';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the ProposalProcedureHeader component.
 */
export interface ProposalProcedureHeaderProps {
  /** The title/type of the governance action */
  actionType: string;
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
 * Shared header component for proposal procedures.
 *
 * Displays common fields: action type, deposit, reward account, and anchor.
 *
 * @param props - Component props
 * @returns React element with common proposal procedure header information
 */
export const ProposalProcedureHeader = ({
  actionType,
  deposit,
  rewardAccount,
  anchor,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  testID,
}: ProposalProcedureHeaderProps) => {
  const { t } = useTranslation();

  return (
    <Column gap={spacing.L} testID={testID}>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.proposal-procedures.type')}
        value={actionType}
        testID={testID ? `${testID}-type` : undefined}
      />

      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.anchor-hash',
        )}
        value={anchor.dataHash}
        testID={testID ? `${testID}-anchor-hash` : undefined}
      />

      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.anchor-url',
        )}
        value={
          <LinkableText
            url={anchor.url}
            displayText={anchor.url}
            numberOfLines={2}
          />
        }
        testID={testID ? `${testID}-anchor-url` : undefined}
      />

      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.proposal-procedures.deposit')}
        value={formatProposalDeposit(deposit, coinSymbol)}
        secondaryValue={calculateAdaFiatValue(
          deposit,
          tokenPrices,
          currencyTicker,
        )}
        testID={testID ? `${testID}-deposit` : undefined}
      />

      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.reward-account',
        )}
        value={truncateHash(formatRewardAccount(rewardAccount))}
        testID={testID ? `${testID}-reward-account` : undefined}
      />
    </Column>
  );
};
