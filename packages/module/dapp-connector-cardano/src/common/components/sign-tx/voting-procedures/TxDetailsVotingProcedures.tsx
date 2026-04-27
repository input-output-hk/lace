import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { mapVotingProceduresToView } from '../../../utils';
import { CollapsibleSection } from '../CollapsibleSection';

import { VotingProcedure } from './VotingProcedure';

import type { Cardano } from '@cardano-sdk/core';

/**
 * Props for the TxDetailsVotingProcedures component.
 */
export interface TxDetailsVotingProceduresProps {
  /** Array of voting procedures from the transaction */
  votingProcedures: Cardano.VotingProcedures;
  /** Base URL for the block explorer */
  explorerBaseUrl: string;
  /** Test identifier */
  testID?: string;
}

/**
 * Wrapper component that renders voting procedure details for a transaction.
 *
 * Maps raw Cardano voting procedures to view models and displays them
 * within a collapsible section. Shows voter information and all votes
 * cast by each voter.
 *
 * @param props - Component props
 * @returns React element displaying all voting procedures
 */
export const TxDetailsVotingProcedures = ({
  votingProcedures,
  explorerBaseUrl,
  testID,
}: TxDetailsVotingProceduresProps) => {
  const { t } = useTranslation();

  const votingProcedureViews = useMemo(
    () => mapVotingProceduresToView(votingProcedures, explorerBaseUrl),
    [votingProcedures, explorerBaseUrl],
  );

  const totalVotes = useMemo(
    () => votingProcedureViews.reduce((sum, vp) => sum + vp.votes.length, 0),
    [votingProcedureViews],
  );

  return (
    <CollapsibleSection
      title={t('dapp-connector.cardano.sign-tx.voting-procedures-label', {
        count: totalVotes,
      })}
      testID={testID}>
      <Column gap={spacing.L}>
        {votingProcedureViews.map((procedureView, index) => (
          <Column
            key={`${procedureView.voter.type}_${procedureView.voter.dRepId}`}
            gap={spacing.L}>
            <VotingProcedure
              procedureView={procedureView}
              showVoteIndex={votingProcedureViews.length > 1}
              voteIndex={index}
              testID={testID ? `${testID}-procedure-${index}` : undefined}
            />
            {index < votingProcedureViews.length - 1 && <Divider />}
          </Column>
        ))}
      </Column>
    </CollapsibleSection>
  );
};
