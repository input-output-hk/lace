/* eslint-disable new-cap */
/* eslint-disable no-magic-numbers */
import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16, Hash32ByteBase16 } from '@cardano-sdk/crypto';

const DUMMY_DEPOSIT = '100000' as never as bigint;
const rewardAccount = Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj');
const anchor = {
  url: 'anchorUrl',
  // eslint-disable-next-line new-cap
  dataHash: Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
};

const hardForkInitiationAction = {
  __typename: Cardano.GovernanceActionType.hard_fork_initiation_action
} as Cardano.HardForkInitiationAction;
const infoAction = {
  __typename: Cardano.GovernanceActionType.info_action
} as Cardano.InfoAction;
const newConstitution = {
  __typename: Cardano.GovernanceActionType.new_constitution
} as Cardano.NewConstitution;
const noConfidence = {
  __typename: Cardano.GovernanceActionType.no_confidence
} as Cardano.NoConfidence;
const parameterChangeAction = {
  __typename: Cardano.GovernanceActionType.parameter_change_action
} as Cardano.ParameterChangeAction;
const treasuryWithdrawalsAction = {
  __typename: Cardano.GovernanceActionType.treasury_withdrawals_action
} as Cardano.TreasuryWithdrawalsAction;
const updateCommittee = {
  __typename: Cardano.GovernanceActionType.update_committee
} as Cardano.UpdateCommittee;

export const mockProposalProcedure: Record<
  Cardano.GovernanceActionType,
  {
    governanceAction: Cardano.GovernanceAction;
    deposit: Cardano.ProposalProcedure['deposit'];
    rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
    anchor: Cardano.ProposalProcedure['anchor'];
  }
> = {
  [Cardano.GovernanceActionType.hard_fork_initiation_action]: {
    deposit: DUMMY_DEPOSIT,
    rewardAccount,
    anchor,
    governanceAction: {
      ...hardForkInitiationAction,
      protocolVersion: {
        major: 5,
        minor: 0
      }
    }
  },
  [Cardano.GovernanceActionType.info_action]: {
    deposit: DUMMY_DEPOSIT,
    rewardAccount,
    anchor,
    governanceAction: infoAction
  },
  [Cardano.GovernanceActionType.new_constitution]: {
    deposit: DUMMY_DEPOSIT,
    rewardAccount,
    anchor,
    governanceAction: {
      ...newConstitution,
      constitution: {
        anchor: {
          dataHash: Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex')),
          url: 'https://www.someurl.io'
        },
        scriptHash: Hash28ByteBase16(Buffer.from('1234567890123456789012345678').toString('hex'))
      }
    }
  },
  [Cardano.GovernanceActionType.no_confidence]: {
    deposit: DUMMY_DEPOSIT,
    rewardAccount,
    anchor,
    governanceAction: noConfidence
  },
  [Cardano.GovernanceActionType.parameter_change_action]: {
    deposit: DUMMY_DEPOSIT,
    rewardAccount,
    anchor,
    governanceAction: {
      ...parameterChangeAction,
      protocolParamUpdate: {
        maxBlockBodySize: 1,
        maxTxSize: 2,
        maxBlockHeaderSize: 3,
        maxValueSize: 4,
        maxExecutionUnitsPerTransaction: {
          memory: 5,
          steps: 6
        },
        maxExecutionUnitsPerBlock: {
          memory: 7,
          steps: 8
        },
        maxCollateralInputs: 9,
        stakeKeyDeposit: 10,
        poolDeposit: 11,
        minFeeCoefficient: 12,
        minFeeConstant: 13,
        treasuryExpansion: '14',
        monetaryExpansion: '15',
        minPoolCost: 16,
        coinsPerUtxoByte: 17,
        prices: {
          memory: 18,
          steps: 19
        },
        poolInfluence: '20',
        poolRetirementEpochBound: 21,
        desiredNumberOfPools: 22,
        costModels: new Map([
          [0, [23, 24]],
          [1, [25, 26]]
        ]),
        collateralPercentage: 27,
        governanceActionDeposit: 28,
        dRepDeposit: 29,
        governanceActionValidityPeriod: Cardano.EpochNo(30),
        dRepInactivityPeriod: Cardano.EpochNo(31),
        minCommitteeSize: 32,
        committeeTermLimit: 33,
        dRepVotingThresholds: {
          motionNoConfidence: {
            numerator: 34,
            denominator: 35
          },
          committeeNormal: {
            numerator: 36,
            denominator: 37
          },
          commiteeNoConfidence: {
            numerator: 38,
            denominator: 39
          },
          updateConstitution: {
            numerator: 40,
            denominator: 41
          },
          hardForkInitiation: {
            numerator: 42,
            denominator: 43
          },
          ppNetworkGroup: {
            numerator: 44,
            denominator: 45
          },
          ppEconomicGroup: {
            numerator: 46,
            denominator: 47
          },
          ppTechnicalGroup: {
            numerator: 48,
            denominator: 49
          },
          ppGovernanceGroup: {
            numerator: 50,
            denominator: 51
          },
          treasuryWithdrawal: {
            numerator: 55,
            denominator: 56
          }
        }
      }
    }
  },
  [Cardano.GovernanceActionType.treasury_withdrawals_action]: {
    deposit: DUMMY_DEPOSIT,
    rewardAccount,
    anchor,
    governanceAction: {
      ...treasuryWithdrawalsAction,
      withdrawals: new Set([
        { rewardAccount, coin: BigInt('10000000') },
        { rewardAccount, coin: BigInt('10000001') }
      ])
    }
  },
  [Cardano.GovernanceActionType.update_committee]: {
    deposit: DUMMY_DEPOSIT,
    rewardAccount,
    anchor,
    governanceAction: {
      ...updateCommittee,
      membersToBeAdded: new Set([
        {
          coldCredential: {
            type: 0,
            hash: Hash28ByteBase16(Buffer.from('updateCommitteecoldCredenti1').toString('hex'))
          },
          epoch: Cardano.EpochNo(1)
        },
        {
          coldCredential: {
            type: 1,
            hash: Hash28ByteBase16(Buffer.from('updateCommitteecoldCredenti2').toString('hex'))
          },
          epoch: Cardano.EpochNo(2)
        }
      ]),
      membersToBeRemoved: new Set([
        {
          type: 0,
          hash: Hash28ByteBase16(Buffer.from('updateCommitteecoldCredenti2').toString('hex'))
        },
        {
          type: 1,
          hash: Hash28ByteBase16(Buffer.from('updateCommitteecoldCredenti3').toString('hex'))
        }
      ])
    }
  }
};
