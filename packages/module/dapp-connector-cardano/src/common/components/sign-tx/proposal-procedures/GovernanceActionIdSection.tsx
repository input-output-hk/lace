import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

import { getGovernanceActionExplorerUrl, truncateHash } from '../../../utils';
import { InfoRow } from '../InfoRow';
import { LinkableText } from '../LinkableText';

import type { Cardano } from '@cardano-sdk/core';

/**
 * Props for the GovernanceActionIdSection component.
 */
export interface GovernanceActionIdSectionProps {
  /** The governance action ID to display */
  governanceActionId: Cardano.GovernanceActionId;
  /** Base URL for the block explorer */
  explorerBaseUrl: string;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays a governance action ID section with transaction ID and action index.
 *
 * Shows the transaction ID as a link to the block explorer if available.
 *
 * @param props - Component props
 * @returns React element displaying governance action ID details
 */
export const GovernanceActionIdSection = ({
  governanceActionId,
  explorerBaseUrl,
  testID,
}: GovernanceActionIdSectionProps) => {
  const { t } = useTranslation();

  const actionIdUrl = getGovernanceActionExplorerUrl(
    governanceActionId,
    explorerBaseUrl,
  );

  return (
    <Column gap={spacing.L} testID={testID}>
      <Divider />

      <Text.XS>
        {t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.governance-action-id',
        )}
      </Text.XS>

      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.proposal-procedures.tx-id')}
        value={
          actionIdUrl ? (
            <LinkableText
              url={actionIdUrl}
              displayText={truncateHash(governanceActionId.id)}
            />
          ) : (
            truncateHash(governanceActionId.id)
          )
        }
        testID={testID ? `${testID}-tx-id` : undefined}
      />

      <InfoRow
        label={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.action-index',
        )}
        value={governanceActionId.actionIndex.toString()}
        testID={testID ? `${testID}-action-index` : undefined}
      />
    </Column>
  );
};
