import { Cardano } from '@cardano-sdk/core';
import { drepIDasBech32FromHash } from './drep';

const { VoterType, Vote } = Cardano;

export enum VoterTypeEnum {
  CONSTITUTIONAL_COMMITTEE = 'constitutionalCommittee',
  SPO = 'spo',
  DREP = 'drep'
}

export const getVoterType = (voterType: Cardano.VoterType): VoterTypeEnum => {
  switch (voterType) {
    case VoterType.ccHotKeyHash:
    case VoterType.ccHotScriptHash:
      return VoterTypeEnum.CONSTITUTIONAL_COMMITTEE;
    case VoterType.stakePoolKeyHash:
      return VoterTypeEnum.SPO;
    case VoterType.dRepKeyHash:
    case VoterType.dRepScriptHash:
      return VoterTypeEnum.DREP;
    default:
      return VoterTypeEnum.DREP;
  }
};

export const getDRepId = (voter: Cardano.Voter): Cardano.DRepID | string =>
  getVoterType(voter.__typename) === VoterTypeEnum.DREP
    ? drepIDasBech32FromHash(voter.credential.hash)
    : voter.credential.hash.toString();

export enum VotesEnum {
  YES = 'yes',
  NO = 'no',
  ABSTAIN = 'abstain'
}

export const getVote = (vote: Cardano.Vote): VotesEnum => {
  switch (vote) {
    case Vote.yes:
      return VotesEnum.YES;
    case Vote.no:
      return VotesEnum.NO;
    case Vote.abstain:
    default:
      return VotesEnum.ABSTAIN;
  }
};

type VotingProcedureView = {
  voter: {
    type: VoterTypeEnum;
    dRepId?: string;
  };
  votes: {
    actionId: {
      index: number;
      txHash: string;
      txHashUrl?: string;
    };
    votingProcedure: {
      vote: VotesEnum;
      anchor: {
        url: string;
        hash: string;
      } | null;
    };
  }[];
};

export const mapVotingProcedureToView = (
  votingProcedure: Cardano.VotingProcedures[number],
  explorerBaseUrl: string
): VotingProcedureView => {
  const voterType = getVoterType(votingProcedure.voter.__typename);

  return {
    voter: {
      type: voterType,
      dRepId: getDRepId(votingProcedure.voter)
    },
    votes: votingProcedure.votes.map((vote) => ({
      actionId: {
        index: vote.actionId.actionIndex,
        txHash: vote.actionId.id.toString(),
        txHashUrl: `${explorerBaseUrl}/${vote.actionId.id}`
      },
      votingProcedure: {
        vote: getVote(vote.votingProcedure.vote),
        anchor: !!vote.votingProcedure.anchor && {
          url: vote.votingProcedure.anchor.url,
          hash: vote.votingProcedure.anchor.dataHash.toString()
        }
      }
    }))
  };
};
