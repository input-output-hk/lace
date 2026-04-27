import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { formatFraction, truncateHash } from '../../../utils';
import { InfoRow } from '../InfoRow';

import { GovernanceActionIdSection } from './GovernanceActionIdSection';
import { ProposalProcedureHeader } from './ProposalProcedureHeader';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the UpdateCommitteeAction component.
 */
export interface UpdateCommitteeActionProps {
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
  /** The update committee governance action */
  governanceAction: Cardano.UpdateCommittee;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays an update committee governance action proposal.
 *
 * Shows members to be added, removed, and the new quorum threshold.
 *
 * @param props - Component props
 * @returns React element displaying update committee action details
 */
export const UpdateCommitteeAction = ({
  deposit,
  rewardAccount,
  anchor,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  explorerBaseUrl,
  governanceAction,
  testID,
}: UpdateCommitteeActionProps) => {
  const { t } = useTranslation();

  const membersToBeAdded = useMemo(
    () => Array.from(governanceAction.membersToBeAdded),
    [governanceAction.membersToBeAdded],
  );

  const membersToBeRemoved = useMemo(
    () => Array.from(governanceAction.membersToBeRemoved),
    [governanceAction.membersToBeRemoved],
  );

  return (
    <Column gap={spacing.L} testID={testID}>
      <ProposalProcedureHeader
        actionType={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.update-committee',
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
      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.quorum-threshold',
        )}
        value={formatFraction(governanceAction.newQuorumThreshold)}
        testID={testID ? `${testID}-quorum` : undefined}
      />

      {membersToBeAdded.length > 0 && (
        <Column gap={spacing.L}>
          <Divider />
          <Text.XS>
            {t(
              'dapp-connector.cardano.sign-tx.proposal-procedures.members-to-add',
            )}
          </Text.XS>

          {membersToBeAdded.map((member, index) => (
            <Column
              gap={spacing.L}
              key={`${member.coldCredential.hash}-${index}`}>
              {index > 0 && <Divider />}
              <InfoRow
                label={t(
                  'dapp-connector.cardano.sign-tx.proposal-procedures.cold-credential',
                )}
                value={truncateHash(member.coldCredential.hash)}
                testID={
                  testID
                    ? `${testID}-add-member-${index}-credential`
                    : undefined
                }
              />

              <InfoRow
                label={t(
                  'dapp-connector.cardano.sign-tx.proposal-procedures.term-expiry-epoch',
                )}
                value={member.epoch.toString()}
                testID={
                  testID ? `${testID}-add-member-${index}-epoch` : undefined
                }
              />
            </Column>
          ))}
        </Column>
      )}

      {membersToBeRemoved.length > 0 && (
        <Column gap={spacing.L}>
          <Divider />
          <Text.XS>
            {t(
              'dapp-connector.cardano.sign-tx.proposal-procedures.members-to-remove',
            )}
          </Text.XS>

          {membersToBeRemoved.map((credential, index) => (
            <Column gap={spacing.L} key={`${credential.hash}-${index}`}>
              {index > 0 && <Divider />}
              <InfoRow
                label={t(
                  'dapp-connector.cardano.sign-tx.proposal-procedures.cold-credential',
                )}
                value={truncateHash(credential.hash)}
                testID={testID ? `${testID}-remove-member-${index}` : undefined}
              />
            </Column>
          ))}
        </Column>
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
