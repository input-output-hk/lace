import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

import { InfoRow } from '../InfoRow';
import { LinkableText } from '../LinkableText';

import { GovernanceActionIdSection } from './GovernanceActionIdSection';
import { ProposalProcedureHeader } from './ProposalProcedureHeader';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the NewConstitutionAction component.
 */
export interface NewConstitutionActionProps {
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
  /** The new constitution governance action */
  governanceAction: Cardano.NewConstitution;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays a new constitution governance action proposal.
 *
 * Shows the constitution anchor URL, hash, and optional script hash.
 *
 * @param props - Component props
 * @returns React element displaying new constitution action details
 */
export const NewConstitutionAction = ({
  deposit,
  rewardAccount,
  anchor,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  explorerBaseUrl,
  governanceAction,
  testID,
}: NewConstitutionActionProps) => {
  const { t } = useTranslation();

  return (
    <Column gap={spacing.L} testID={testID}>
      <ProposalProcedureHeader
        actionType={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.new-constitution',
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
        {t('dapp-connector.cardano.sign-tx.proposal-procedures.constitution')}
      </Text.XS>

      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.constitution-url',
        )}
        value={
          <LinkableText
            url={governanceAction.constitution.anchor.url}
            displayText={governanceAction.constitution.anchor.url}
            numberOfLines={2}
          />
        }
        testID={testID ? `${testID}-constitution-url` : undefined}
      />

      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.constitution-hash',
        )}
        value={governanceAction.constitution.anchor.dataHash}
        testID={testID ? `${testID}-constitution-hash` : undefined}
      />

      {governanceAction.constitution.scriptHash && (
        <InfoRow
          label={t(
            'dapp-connector.cardano.sign-tx.proposal-procedures.script-hash',
          )}
          value={governanceAction.constitution.scriptHash}
          testID={testID ? `${testID}-script-hash` : undefined}
        />
      )}

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
