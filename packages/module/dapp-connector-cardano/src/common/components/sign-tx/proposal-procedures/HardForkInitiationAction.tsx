import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

import { formatProtocolVersion } from '../../../utils';
import { InfoRow } from '../InfoRow';

import { GovernanceActionIdSection } from './GovernanceActionIdSection';
import { ProposalProcedureHeader } from './ProposalProcedureHeader';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the HardForkInitiationAction component.
 */
export interface HardForkInitiationActionProps {
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
  /** The hard fork initiation governance action */
  governanceAction: Cardano.HardForkInitiationAction;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays a hard fork initiation governance action proposal.
 *
 * Shows the target protocol version for the hard fork.
 *
 * @param props - Component props
 * @returns React element displaying hard fork initiation action details
 */
export const HardForkInitiationAction = ({
  deposit,
  rewardAccount,
  anchor,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  explorerBaseUrl,
  governanceAction,
  testID,
}: HardForkInitiationActionProps) => {
  const { t } = useTranslation();

  return (
    <Column gap={spacing.L} testID={testID}>
      <ProposalProcedureHeader
        actionType={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.hard-fork-initiation',
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
        {t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.protocol-version',
        )}
      </Text.XS>

      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.target-version',
        )}
        value={formatProtocolVersion(governanceAction.protocolVersion)}
        testID={testID ? `${testID}-target-version` : undefined}
      />

      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.major-version',
        )}
        value={governanceAction.protocolVersion.major.toString()}
        testID={testID ? `${testID}-major-version` : undefined}
      />

      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.minor-version',
        )}
        value={governanceAction.protocolVersion.minor.toString()}
        testID={testID ? `${testID}-minor-version` : undefined}
      />

      {governanceAction.governanceActionId && (
        <GovernanceActionIdSection
          governanceActionId={governanceAction.governanceActionId}
          explorerBaseUrl={explorerBaseUrl}
          testID={testID ? `${testID}-action-id` : undefined}
        />
      )}
    </Column>
  );
};
