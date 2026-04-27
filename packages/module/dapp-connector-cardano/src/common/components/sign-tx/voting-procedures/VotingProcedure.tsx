import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

import {
  getVoteTranslationKey,
  getVoterTypeTranslationKey,
  truncateHash,
  VoterTypeEnum,
  type VotingProcedureView,
} from '../../../utils';
import { InfoRow } from '../InfoRow';
import { LinkableText } from '../LinkableText';

/**
 * Props for the VotingProcedure component.
 */
export interface VotingProcedureProps {
  /** The voting procedure view model to display */
  procedureView: VotingProcedureView;
  /** Whether to show the vote index number */
  showVoteIndex?: boolean;
  /** The index of this vote (when showing multiple votes) */
  voteIndex?: number;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays a single voting procedure with voter information and votes.
 *
 * Shows the voter type, voter ID, and all votes cast by this voter
 * including vote decision, anchor data, and governance action references.
 *
 * @param props - Component props
 * @returns React element displaying voting procedure details
 */
export const VotingProcedure = ({
  procedureView,
  showVoteIndex = false,
  voteIndex = 0,
  testID,
}: VotingProcedureProps) => {
  const { t } = useTranslation();

  const { voter, votes } = procedureView;

  return (
    <Column gap={spacing.L} testID={testID}>
      {showVoteIndex && (
        <Text.XS testID={testID ? `${testID}-vote-index` : undefined}>
          {t('dapp-connector.cardano.sign-tx.voting-procedures.vote')}{' '}
          {voteIndex + 1}
        </Text.XS>
      )}

      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.voting-procedures.voter-type')}
        value={t(getVoterTypeTranslationKey(voter.type))}
        testID={testID ? `${testID}-voter-type` : undefined}
      />

      {voter.dRepId && (
        <InfoRow
          label={t(
            voter.type === VoterTypeEnum.DREP
              ? 'dapp-connector.cardano.sign-tx.voting-procedures.drep-id'
              : 'dapp-connector.cardano.sign-tx.voting-procedures.voter-id',
          )}
          value={truncateHash(voter.dRepId)}
          testID={testID ? `${testID}-voter-id` : undefined}
        />
      )}

      {votes.map(({ actionId, votingProcedure }, voteIndex_) => (
        <Column
          key={`${actionId.txHash}_${actionId.index}`}
          gap={spacing.L}
          testID={testID ? `${testID}-vote-block-${voteIndex_}` : undefined}>
          <Divider />

          {votes.length > 1 && (
            <Text.XS
              testID={
                testID ? `${testID}-procedure-title-${voteIndex_}` : undefined
              }>
              {t(
                'dapp-connector.cardano.sign-tx.voting-procedures.procedure-title',
              )}{' '}
              {voteIndex_ + 1}
            </Text.XS>
          )}

          <InfoRow
            label={t(
              'dapp-connector.cardano.sign-tx.voting-procedures.vote-decision',
            )}
            value={t(getVoteTranslationKey(votingProcedure.vote))}
            testID={
              testID ? `${testID}-vote-${voteIndex_}-decision` : undefined
            }
          />

          {votingProcedure.anchor && (
            <>
              <InfoRow
                label={t(
                  'dapp-connector.cardano.sign-tx.voting-procedures.anchor-url',
                )}
                value={
                  <LinkableText
                    url={votingProcedure.anchor.url}
                    displayText={truncateHash(
                      votingProcedure.anchor.url,
                      20,
                      20,
                    )}
                    variant="XXS"
                    numberOfLines={3}
                  />
                }
                testID={
                  testID ? `${testID}-vote-${voteIndex_}-anchor-url` : undefined
                }
              />

              <InfoRow
                label={t(
                  'dapp-connector.cardano.sign-tx.voting-procedures.anchor-hash',
                )}
                value={truncateHash(votingProcedure.anchor.hash)}
                testID={
                  testID
                    ? `${testID}-vote-${voteIndex_}-anchor-hash`
                    : undefined
                }
              />
            </>
          )}

          <Divider />

          <Text.XS
            testID={
              testID
                ? `${testID}-vote-${voteIndex_}-governance-action-title`
                : undefined
            }>
            {t(
              'dapp-connector.cardano.sign-tx.voting-procedures.action-id-title',
            )}
          </Text.XS>

          <InfoRow
            label={t(
              'dapp-connector.cardano.sign-tx.voting-procedures.tx-hash',
            )}
            value={
              actionId.txHashUrl ? (
                <LinkableText
                  url={actionId.txHashUrl}
                  displayText={truncateHash(actionId.txHash)}
                  variant="XXS"
                  numberOfLines={3}
                />
              ) : (
                truncateHash(actionId.txHash)
              )
            }
            testID={testID ? `${testID}-vote-${voteIndex_}-tx-hash` : undefined}
          />

          <InfoRow
            label={t(
              'dapp-connector.cardano.sign-tx.voting-procedures.action-index',
            )}
            value={String(actionId.index)}
            testID={
              testID ? `${testID}-vote-${voteIndex_}-action-index` : undefined
            }
          />
        </Column>
      ))}
    </Column>
  );
};
