import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { useTranslation } from '@lace-contract/i18n';
import { Accordion } from '@lace-lib/ui-toolkit';
import React from 'react';

import { ActivityDetailItem } from './ActivityDetailItem';

import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

export enum VoterTypeEnum {
  CONSTITUTIONAL_COMMITTEE = 'constitutionalCommittee',
  SPO = 'spo',
  DREP = 'drep',
}

export const drepIDasBech32FromHash = (
  value: Hash28ByteBase16,
): Cardano.DRepID =>
  Cardano.DRepID(HexBlob.toTypedBech32('drep', HexBlob(value)));

export const getDRepId = (voter: Cardano.Voter): Cardano.DRepID | string =>
  getVoterType(voter.__typename) === VoterTypeEnum.DREP
    ? drepIDasBech32FromHash(voter.credential.hash)
    : voter.credential.hash.toString();

export const getVoterType = (voterType: Cardano.VoterType): VoterTypeEnum => {
  switch (voterType) {
    case Cardano.VoterType.ccHotKeyHash:
    case Cardano.VoterType.ccHotScriptHash:
      return VoterTypeEnum.CONSTITUTIONAL_COMMITTEE;
    case Cardano.VoterType.stakePoolKeyHash:
      return VoterTypeEnum.SPO;
    case Cardano.VoterType.dRepKeyHash:
    case Cardano.VoterType.dRepScriptHash:
      return VoterTypeEnum.DREP;
    default:
      return VoterTypeEnum.DREP;
  }
};

export const ActivityDetailsVotingProcedure = ({
  votingProcedures,
}: {
  votingProcedures: Cardano.VotingProcedures;
}) => {
  if (!votingProcedures || votingProcedures.length === 0) return null;
  const { t } = useTranslation();

  const getVoterTypeName = (type: Cardano.VoterType): string => {
    switch (type) {
      case Cardano.VoterType.ccHotKeyHash:
      case Cardano.VoterType.ccHotScriptHash:
        return t('v2.activity-details.sheet.constitutionalCommittee');
      case Cardano.VoterType.dRepScriptHash:
      case Cardano.VoterType.dRepKeyHash:
        return t('v2.activity-details.sheet.drepId');
      case Cardano.VoterType.stakePoolKeyHash:
        return t('v2.activity-details.sheet.spo');
    }
  };

  const getVoteName = (vote: Cardano.Vote): string => {
    switch (vote) {
      case Cardano.Vote.yes:
        return t('v2.activity-details.sheet.voteYes');
      case Cardano.Vote.no:
        return t('v2.activity-details.sheet.voteNo');
      case Cardano.Vote.abstain:
        return t('v2.activity-details.sheet.voteAbstain');
    }
  };

  return (
    <Accordion.Root title={t('v2.activity-details.sheet.votingProcedures')}>
      {votingProcedures.map(({ voter, votes }, voterIndex) => (
        <Accordion.AccordionContent key={`${voterIndex}`}>
          <ActivityDetailItem
            testID={`voting-procedures-voter-type-${voterIndex}`}
            label={t('v2.activity-details.sheet.voterType')}
            value={getVoterTypeName(voter.__typename)}
          />
          <ActivityDetailItem
            testID={`voting-procedures-drep-id-${voterIndex}`}
            label={t('v2.activity-details.sheet.drepId')}
            value={getDRepId(voter)}
          />
          {votes.map(({ actionId, votingProcedure }, voteIndex) => (
            <React.Fragment key={`${voterIndex}-${voteIndex}`}>
              <ActivityDetailItem
                testID={`voting-procedures-vote-${voterIndex}-${voteIndex}`}
                label={t('v2.activity-details.sheet.vote')}
                value={getVoteName(votingProcedure.vote)}
              />
              {votingProcedure.anchor && (
                <ActivityDetailItem
                  testID={`voting-procedures-anchor-url-${voterIndex}-${voteIndex}`}
                  label={t('v2.activity-details.sheet.anchorUrl')}
                  // TODO: refactor getExplorerUrl to become getBaseExplorerUrl
                  value={votingProcedure.anchor.url}
                />
              )}
              {votingProcedure.anchor?.dataHash && (
                <ActivityDetailItem
                  testID={`voting-procedures-anchor-hash-${voterIndex}-${voteIndex}`}
                  label={t('v2.activity-details.sheet.anchorHash')}
                  // TODO: refactor getExplorerUrl to become getBaseExplorerUrl
                  value={votingProcedure.anchor.dataHash.toString()}
                />
              )}
              <ActivityDetailItem
                testID={`voting-procedures-tx-hash-${voterIndex}-${voteIndex}`}
                label={t('v2.activity-details.sheet.txHash')}
                value={actionId.id.toString()}
              />
              <ActivityDetailItem
                testID={`voting-procedures-index-${voterIndex}-${voteIndex}`}
                label={t('v2.activity-details.sheet.index')}
                value={actionId.actionIndex.toString()}
              />
            </React.Fragment>
          ))}
        </Accordion.AccordionContent>
      ))}
    </Accordion.Root>
  );
};
