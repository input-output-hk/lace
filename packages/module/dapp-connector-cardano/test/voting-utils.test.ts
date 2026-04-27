import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  getVote,
  getVoterId,
  getVoterType,
  getVoterTypeTranslationKey,
  getVoteTranslationKey,
  mapVotingProcedureToView,
  mapVotingProceduresToView,
  VoterTypeEnum,
  VotesEnum,
} from '../src/common/utils';

describe('voting-utils', () => {
  describe('getVoterType', () => {
    it('returns CONSTITUTIONAL_COMMITTEE for ccHotKeyHash', () => {
      const result = getVoterType(Cardano.VoterType.ccHotKeyHash);
      expect(result).toBe(VoterTypeEnum.CONSTITUTIONAL_COMMITTEE);
    });

    it('returns CONSTITUTIONAL_COMMITTEE for ccHotScriptHash', () => {
      const result = getVoterType(Cardano.VoterType.ccHotScriptHash);
      expect(result).toBe(VoterTypeEnum.CONSTITUTIONAL_COMMITTEE);
    });

    it('returns SPO for stakePoolKeyHash', () => {
      const result = getVoterType(Cardano.VoterType.stakePoolKeyHash);
      expect(result).toBe(VoterTypeEnum.SPO);
    });

    it('returns DREP for dRepKeyHash', () => {
      const result = getVoterType(Cardano.VoterType.dRepKeyHash);
      expect(result).toBe(VoterTypeEnum.DREP);
    });

    it('returns DREP for dRepScriptHash', () => {
      const result = getVoterType(Cardano.VoterType.dRepScriptHash);
      expect(result).toBe(VoterTypeEnum.DREP);
    });

    it('defaults to DREP for unknown voter types', () => {
      const result = getVoterType('unknown' as Cardano.VoterType);
      expect(result).toBe(VoterTypeEnum.DREP);
    });
  });

  describe('getVoterId', () => {
    it('returns the credential hash as a string', () => {
      const hashValue =
        '00000000000000000000000000000000000000000000000000000001';
      const voter = {
        __typename: Cardano.VoterType.dRepKeyHash,
        credential: {
          type: Cardano.CredentialType.KeyHash,
          hash: Crypto.Ed25519KeyHashHex(hashValue),
        },
      } as Cardano.Voter;
      const result = getVoterId(voter);
      expect(result).toBe(hashValue);
    });
  });

  describe('getVote', () => {
    it('returns YES for Vote.yes', () => {
      const result = getVote(Cardano.Vote.yes);
      expect(result).toBe(VotesEnum.YES);
    });

    it('returns NO for Vote.no', () => {
      const result = getVote(Cardano.Vote.no);
      expect(result).toBe(VotesEnum.NO);
    });

    it('returns ABSTAIN for Vote.abstain', () => {
      const result = getVote(Cardano.Vote.abstain);
      expect(result).toBe(VotesEnum.ABSTAIN);
    });

    it('defaults to ABSTAIN for unknown vote values', () => {
      const result = getVote(999 as Cardano.Vote);
      expect(result).toBe(VotesEnum.ABSTAIN);
    });
  });

  describe('mapVotingProcedureToView', () => {
    const DEFAULT_CREDENTIAL_HASH =
      '0000000000000000000000000000000000000000000000000000000a';
    const DEFAULT_TX_HASH =
      '0000000000000000000000000000000000000000000000000000000000000001';
    const DEFAULT_ANCHOR_HASH =
      '0000000000000000000000000000000000000000000000000000000000000002';

    const createMockVotingProcedure = (
      overrides?: Partial<{
        voterType: Cardano.VoterType;
        credentialHash: string;
        vote: Cardano.Vote;
        txHash: string;
        actionIndex: number;
        hasAnchor: boolean;
      }>,
    ): Cardano.VotingProcedures[number] =>
      ({
        voter: {
          __typename: overrides?.voterType ?? Cardano.VoterType.dRepKeyHash,
          credential: {
            type: Cardano.CredentialType.KeyHash,
            hash: Crypto.Ed25519KeyHashHex(
              overrides?.credentialHash ?? DEFAULT_CREDENTIAL_HASH,
            ),
          },
        },
        votes: [
          {
            actionId: {
              id: Cardano.TransactionId(overrides?.txHash ?? DEFAULT_TX_HASH),
              actionIndex: overrides?.actionIndex ?? 0,
            },
            votingProcedure: {
              vote: overrides?.vote ?? Cardano.Vote.yes,
              anchor:
                overrides?.hasAnchor !== false
                  ? {
                      url: 'https://example.com/metadata.json',
                      dataHash: Crypto.Hash32ByteBase16(DEFAULT_ANCHOR_HASH),
                    }
                  : null,
            },
          },
        ],
      } as Cardano.VotingProcedures[number]);

    const explorerBaseUrl = 'https://cexplorer.io';

    it('maps voter type correctly', () => {
      const votingProcedure = createMockVotingProcedure({
        voterType: Cardano.VoterType.stakePoolKeyHash,
      });
      const result = mapVotingProcedureToView(votingProcedure, explorerBaseUrl);
      expect(result.voter.type).toBe(VoterTypeEnum.SPO);
    });

    it('maps voter ID correctly', () => {
      const customCredentialHash =
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
      const votingProcedure = createMockVotingProcedure({
        credentialHash: customCredentialHash,
      });
      const result = mapVotingProcedureToView(votingProcedure, explorerBaseUrl);
      expect(result.voter.dRepId).toBe(customCredentialHash);
    });

    it('maps vote decision correctly', () => {
      const votingProcedure = createMockVotingProcedure({
        vote: Cardano.Vote.no,
      });
      const result = mapVotingProcedureToView(votingProcedure, explorerBaseUrl);
      expect(result.votes[0].votingProcedure.vote).toBe(VotesEnum.NO);
    });

    it('maps action ID with explorer URL', () => {
      const customTxHash =
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const votingProcedure = createMockVotingProcedure({
        txHash: customTxHash,
        actionIndex: 2,
      });
      const result = mapVotingProcedureToView(votingProcedure, explorerBaseUrl);
      expect(result.votes[0].actionId.txHash).toBe(customTxHash);
      expect(result.votes[0].actionId.index).toBe(2);
      expect(result.votes[0].actionId.txHashUrl).toBe(
        `https://cexplorer.io/tx/${customTxHash}`,
      );
    });

    it('maps anchor when present', () => {
      const votingProcedure = createMockVotingProcedure({ hasAnchor: true });
      const result = mapVotingProcedureToView(votingProcedure, explorerBaseUrl);
      expect(result.votes[0].votingProcedure.anchor).not.toBeNull();
      expect(result.votes[0].votingProcedure.anchor?.url).toBe(
        'https://example.com/metadata.json',
      );
      expect(result.votes[0].votingProcedure.anchor?.hash).toBe(
        DEFAULT_ANCHOR_HASH,
      );
    });

    it('returns null anchor when not present', () => {
      const votingProcedure = createMockVotingProcedure({ hasAnchor: false });
      const result = mapVotingProcedureToView(votingProcedure, explorerBaseUrl);
      expect(result.votes[0].votingProcedure.anchor).toBeNull();
    });

    it('returns undefined txHashUrl when explorerBaseUrl is empty', () => {
      const votingProcedure = createMockVotingProcedure();
      const result = mapVotingProcedureToView(votingProcedure, '');
      expect(result.votes[0].actionId.txHashUrl).toBeUndefined();
    });
  });

  describe('mapVotingProceduresToView', () => {
    const DREP_HASH =
      '00000000000000000000000000000000000000000000000000000003';
    const POOL_HASH =
      '00000000000000000000000000000000000000000000000000000004';
    const TX1_HASH =
      '0000000000000000000000000000000000000000000000000000000000000005';
    const TX2_HASH =
      '0000000000000000000000000000000000000000000000000000000000000006';

    it('maps empty array to empty array', () => {
      const result = mapVotingProceduresToView([], 'https://cexplorer.io');
      expect(result).toEqual([]);
    });

    it('maps multiple voting procedures', () => {
      const votingProcedures = [
        {
          voter: {
            __typename: Cardano.VoterType.dRepKeyHash,
            credential: {
              type: Cardano.CredentialType.KeyHash,
              hash: Crypto.Ed25519KeyHashHex(DREP_HASH),
            },
          },
          votes: [
            {
              actionId: {
                id: Cardano.TransactionId(TX1_HASH),
                actionIndex: 0,
              },
              votingProcedure: {
                vote: Cardano.Vote.yes,
                anchor: null,
              },
            },
          ],
        },
        {
          voter: {
            __typename: Cardano.VoterType.stakePoolKeyHash,
            credential: {
              type: Cardano.CredentialType.KeyHash,
              hash: Crypto.Ed25519KeyHashHex(POOL_HASH),
            },
          },
          votes: [
            {
              actionId: {
                id: Cardano.TransactionId(TX2_HASH),
                actionIndex: 1,
              },
              votingProcedure: {
                vote: Cardano.Vote.no,
                anchor: null,
              },
            },
          ],
        },
      ] as Cardano.VotingProcedures;
      const result = mapVotingProceduresToView(
        votingProcedures,
        'https://cexplorer.io',
      );
      expect(result).toHaveLength(2);
      expect(result[0].voter.type).toBe(VoterTypeEnum.DREP);
      expect(result[1].voter.type).toBe(VoterTypeEnum.SPO);
    });
  });

  describe('getVoterTypeTranslationKey', () => {
    it('returns correct key for CONSTITUTIONAL_COMMITTEE', () => {
      const result = getVoterTypeTranslationKey(
        VoterTypeEnum.CONSTITUTIONAL_COMMITTEE,
      );
      expect(result).toBe(
        'dapp-connector.cardano.sign-tx.voting-procedures.voter-types.constitutionalCommittee',
      );
    });

    it('returns correct key for SPO', () => {
      const result = getVoterTypeTranslationKey(VoterTypeEnum.SPO);
      expect(result).toBe(
        'dapp-connector.cardano.sign-tx.voting-procedures.voter-types.spo',
      );
    });

    it('returns correct key for DREP', () => {
      const result = getVoterTypeTranslationKey(VoterTypeEnum.DREP);
      expect(result).toBe(
        'dapp-connector.cardano.sign-tx.voting-procedures.voter-types.drep',
      );
    });
  });

  describe('getVoteTranslationKey', () => {
    it('returns correct key for YES', () => {
      const result = getVoteTranslationKey(VotesEnum.YES);
      expect(result).toBe(
        'dapp-connector.cardano.sign-tx.voting-procedures.votes.yes',
      );
    });

    it('returns correct key for NO', () => {
      const result = getVoteTranslationKey(VotesEnum.NO);
      expect(result).toBe(
        'dapp-connector.cardano.sign-tx.voting-procedures.votes.no',
      );
    });

    it('returns correct key for ABSTAIN', () => {
      const result = getVoteTranslationKey(VotesEnum.ABSTAIN);
      expect(result).toBe(
        'dapp-connector.cardano.sign-tx.voting-procedures.votes.abstain',
      );
    });
  });
});
