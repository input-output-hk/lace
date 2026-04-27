import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

import { GovernanceActionIdSection } from './GovernanceActionIdSection';
import { ProposalProcedureHeader } from './ProposalProcedureHeader';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the NoConfidenceAction component.
 */
export interface NoConfidenceActionProps {
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
  /** Base URL for the block explorer */
  explorerBaseUrl: string;
  /** The no confidence governance action */
  governanceAction: Cardano.NoConfidence;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays a no confidence governance action proposal.
 *
 * This action expresses no confidence in the current constitutional committee.
 *
 * @param props - Component props
 * @returns React element displaying no confidence action details
 */
export const NoConfidenceAction = ({
  deposit,
  rewardAccount,
  anchor,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  explorerBaseUrl,
  governanceAction,
  testID,
}: NoConfidenceActionProps) => {
  const { t } = useTranslation();

  return (
    <Column gap={spacing.L} testID={testID}>
      <ProposalProcedureHeader
        actionType={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.no-confidence',
        )}
        deposit={deposit}
        rewardAccount={rewardAccount}
        anchor={anchor}
        coinSymbol={coinSymbol}
        tokenPrices={tokenPrices}
        currencyTicker={currencyTicker}
        testID={testID ? `${testID}-header` : undefined}
      />

      {governanceAction.governanceActionId && (
        <GovernanceActionIdSection
          governanceActionId={governanceAction.governanceActionId}
          explorerBaseUrl={explorerBaseUrl}
          testID={testID ? `${testID}-action-id` : undefined}
        />
      )}

      <Divider />

      <Text.XS variant="secondary">
        {t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.no-confidence-notice',
        )}
      </Text.XS>
    </Column>
  );
};
