import { Cardano } from '@cardano-sdk/core';

import type { TranslationKey } from '@lace-contract/i18n';

/**
 * Enum representing the type of voter in a governance vote.
 */
export enum VoterTypeEnum {
  CONSTITUTIONAL_COMMITTEE = 'constitutionalCommittee',
  SPO = 'spo',
  DREP = 'drep',
}

/**
 * Enum representing the possible vote decisions.
 */
export enum VotesEnum {
  YES = 'yes',
  NO = 'no',
  ABSTAIN = 'abstain',
}

/**
 * View model for a voting procedure action ID.
 */
export interface VotingProcedureActionIdView {
  /** The action index within the transaction */
  index: number;
  /** The transaction hash */
  txHash: string;
  /** Optional URL to view the governance action on explorer */
  txHashUrl?: string;
}

/**
 * View model for a voting procedure anchor.
 */
export interface VotingProcedureAnchorView {
  /** The anchor URL */
  url: string;
  /** The anchor data hash */
  hash: string;
}

/**
 * View model for a single vote within a voting procedure.
 */
export interface VotingProcedureVoteView {
  /** The governance action being voted on */
  actionId: VotingProcedureActionIdView;
  /** The voting procedure details */
  votingProcedure: {
    /** The vote decision */
    vote: VotesEnum;
    /** Optional anchor with metadata about the vote */
    anchor: VotingProcedureAnchorView | null;
  };
}

/**
 * View model for a voter.
 */
export interface VoterView {
  /** The type of voter */
  type: VoterTypeEnum;
  /** The voter's DRep ID, pool ID, or committee credential */
  dRepId?: string;
}

/**
 * Complete view model for a voting procedure.
 */
export interface VotingProcedureView {
  /** The voter information */
  voter: VoterView;
  /** Array of votes cast by this voter */
  votes: VotingProcedureVoteView[];
}

/**
 * Determines the voter type from a Cardano voter typename.
 *
 * @param voterType - The Cardano voter type
 * @returns The mapped voter type enum
 */
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

/**
 * Extracts the voter ID from a Cardano voter.
 * Returns the credential hash as a string.
 *
 * @param voter - The Cardano voter object
 * @returns The voter ID string
 */
export const getVoterId = (voter: Cardano.Voter): string =>
  voter.credential.hash.toString();

/**
 * Maps a Cardano vote enum to the display enum.
 *
 * @param vote - The Cardano vote value
 * @returns The mapped votes enum
 */
export const getVote = (vote: Cardano.Vote): VotesEnum => {
  switch (vote) {
    case Cardano.Vote.yes:
      return VotesEnum.YES;
    case Cardano.Vote.no:
      return VotesEnum.NO;
    case Cardano.Vote.abstain:
    default:
      return VotesEnum.ABSTAIN;
  }
};

/**
 * Maps a Cardano voting procedure to a view model for display.
 *
 * @param votingProcedure - A single voting procedure from the transaction
 * @param explorerBaseUrl - Base URL for the block explorer
 * @returns The view model representation of the voting procedure
 */
export const mapVotingProcedureToView = (
  votingProcedure: Cardano.VotingProcedures[number],
  explorerBaseUrl: string,
): VotingProcedureView => {
  const voterType = getVoterType(votingProcedure.voter.__typename);

  return {
    voter: {
      type: voterType,
      dRepId: getVoterId(votingProcedure.voter),
    },
    votes: votingProcedure.votes.map(vote => ({
      actionId: {
        index: vote.actionId.actionIndex,
        txHash: vote.actionId.id.toString(),
        txHashUrl: explorerBaseUrl
          ? `${explorerBaseUrl}/tx/${vote.actionId.id}`
          : undefined,
      },
      votingProcedure: {
        vote: getVote(vote.votingProcedure.vote),
        anchor: vote.votingProcedure.anchor
          ? {
              url: vote.votingProcedure.anchor.url,
              hash: vote.votingProcedure.anchor.dataHash.toString(),
            }
          : null,
      },
    })),
  };
};

/**
 * Maps all voting procedures from a transaction to view models.
 *
 * @param votingProcedures - Array of voting procedures from the transaction
 * @param explorerBaseUrl - Base URL for the block explorer
 * @returns Array of view model representations
 */
export const mapVotingProceduresToView = (
  votingProcedures: Cardano.VotingProcedures,
  explorerBaseUrl: string,
): VotingProcedureView[] =>
  votingProcedures.map(vp => mapVotingProcedureToView(vp, explorerBaseUrl));

const VOTER_TYPE_TRANSLATION_KEYS: Record<VoterTypeEnum, TranslationKey> = {
  [VoterTypeEnum.CONSTITUTIONAL_COMMITTEE]:
    'dapp-connector.cardano.sign-tx.voting-procedures.voter-types.constitutionalCommittee',
  [VoterTypeEnum.SPO]:
    'dapp-connector.cardano.sign-tx.voting-procedures.voter-types.spo',
  [VoterTypeEnum.DREP]:
    'dapp-connector.cardano.sign-tx.voting-procedures.voter-types.drep',
};

/**
 * Gets the translation key for a voter type.
 *
 * @param voterType - The voter type enum
 * @returns The i18n translation key
 */
export const getVoterTypeTranslationKey = (
  voterType: VoterTypeEnum,
): TranslationKey => VOTER_TYPE_TRANSLATION_KEYS[voterType];

const VOTE_TRANSLATION_KEYS: Record<VotesEnum, TranslationKey> = {
  [VotesEnum.YES]: 'dapp-connector.cardano.sign-tx.voting-procedures.votes.yes',
  [VotesEnum.NO]: 'dapp-connector.cardano.sign-tx.voting-procedures.votes.no',
  [VotesEnum.ABSTAIN]:
    'dapp-connector.cardano.sign-tx.voting-procedures.votes.abstain',
};

/**
 * Gets the translation key for a vote decision.
 *
 * @param vote - The vote enum
 * @returns The i18n translation key
 */
export const getVoteTranslationKey = (vote: VotesEnum): TranslationKey =>
  VOTE_TRANSLATION_KEYS[vote];
