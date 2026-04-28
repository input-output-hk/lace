import { Cardano } from '@cardano-sdk/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getParameterChangeActionViewData,
  getHardForkInitiationActionViewData,
  getInfoActionViewData,
  getNewConstitutionActionViewData,
  getNoConfidenceActionViewData,
  getTreasuryWithdrawalsActionViewData,
  getUpdateCommitteeActionViewData,
} from '../../src/utils/governance-action';
import * as governanceActionBaseUtils from '../../src/utils/governance-action-base';

import type { Hash28ByteBase16, Hash32ByteBase16 } from '@cardano-sdk/crypto';

// Mock the formatPercentages function
vi.mock('../../src/utils/formatting', () => ({
  formatPercentages: vi.fn((value: number) => (value * 100).toFixed(2)),
}));

const mockDeposit = 1000000n;
const mockRewardAccount = 'stake1ux...' as Cardano.RewardAccount;
const mockAnchor: Cardano.Anchor = {
  url: 'https://example.com',
  dataHash: '0x123...' as Hash32ByteBase16,
};
const mockExplorerBaseUrl = 'https://explorer.cardano.org';
const mockNetworkType = 'mainnet' as const;

describe('governance-action utils', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('convertFractionToPercentage', () => {
    it('should convert fraction to percentage when both values are provided', () => {
      expect(governanceActionBaseUtils.convertFractionToPercentage(1, 4)).toBe(
        '25.00',
      );
    });

    it('should return empty string when numerator is missing', () => {
      expect(
        governanceActionBaseUtils.convertFractionToPercentage(undefined, 4),
      ).toBe('');
    });

    it('should return empty string when denominator is missing', () => {
      expect(
        governanceActionBaseUtils.convertFractionToPercentage(1, undefined),
      ).toBe('');
    });

    it('should return empty string when both values are missing', () => {
      expect(
        governanceActionBaseUtils.convertFractionToPercentage(
          undefined,
          undefined,
        ),
      ).toBe('');
    });
  });

  describe('getBaseGovernanceActionViewData', () => {
    it('should return base data without governance action', () => {
      const result = governanceActionBaseUtils.getBaseGovernanceActionViewData({
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(result).toEqual({
        txDetails: {
          deposit: '1.00 ADA',
          rewardAccount: mockRewardAccount,
        },
        procedure: {
          anchor: {
            url: mockAnchor.url,
            hash: mockAnchor.dataHash,
            txHashUrl: `${mockExplorerBaseUrl}/${mockAnchor.dataHash}`,
          },
        },
      });
    });

    it('should include actionId when governance action has governanceActionId', () => {
      const mockGovernanceAction = {
        governanceActionId: {
          actionIndex: 1n,
          id: 'action-123',
        },
      } as unknown as Cardano.GovernanceAction;

      const result = governanceActionBaseUtils.getBaseGovernanceActionViewData({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(result.actionId).toEqual({
        index: '1',
        id: 'action-123',
      });
    });
  });

  describe('getParameterChangeActionViewData', () => {
    it('should return parameter change action data with minimal protocol params', () => {
      const mockGovernanceAction: Cardano.ParameterChangeAction = {
        protocolParamUpdate: {},
        governanceActionId: {
          actionIndex: 1n,
          id: 'param-change-123',
        },
      } as unknown as Cardano.ParameterChangeAction;

      const mockedBaseGovernanceActionViewData = {
        mockedBaseGovernanceActionViewData:
          'mockedBaseGovernanceActionViewData',
      } as unknown as ReturnType<
        typeof governanceActionBaseUtils.getBaseGovernanceActionViewData
      >;
      const getBaseGovernanceActionViewDataSpy = vi
        .spyOn(governanceActionBaseUtils, 'getBaseGovernanceActionViewData')
        .mockReturnValue(mockedBaseGovernanceActionViewData);

      const result = getParameterChangeActionViewData({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(getBaseGovernanceActionViewDataSpy).toHaveBeenCalledWith({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(result).toMatchObject({
        ...mockedBaseGovernanceActionViewData,
        protocolParamUpdate: {
          maxTxExUnits: { memory: '', step: '' },
          maxBlockExUnits: { memory: '', step: '' },
          networkGroup: {
            maxBBSize: '',
            maxTxSize: '',
            maxBHSize: '',
            maxValSize: '',
            maxCollateralInputs: '',
          },
          economicGroup: {
            minFeeA: '',
            minFeeB: '',
            keyDeposit: '',
            poolDeposit: '',
            rho: '',
            tau: '',
            minPoolCost: '',
            coinsPerUTxOByte: '',
            price: { memory: '', step: '' },
          },
          technicalGroup: {
            a0: '',
            eMax: '',
            nOpt: '',
            costModels: { PlutusV1: {}, PlutusV2: {} },
            collateralPercentage: '',
          },
          governanceGroup: {
            govActionLifetime: '',
            govActionDeposit: '',
            drepDeposit: '',
            drepActivity: '',
            ccMinSize: '',
            ccMaxTermLength: '',
            dRepVotingThresholds: {
              motionNoConfidence: '',
              committeeNormal: '',
              committeeNoConfidence: '',
              updateConstitution: '',
              hardForkInitiation: '',
              ppNetworkGroup: '',
              ppEconomicGroup: '',
              ppTechnicalGroup: '',
              ppGovernanceGroup: '',
              treasuryWithdrawal: '',
            },
          },
        },
      });
    });

    it('should handle protocol params with actual values', () => {
      const mockGovernanceAction: Cardano.ParameterChangeAction = {
        protocolParamUpdate: {
          maxBlockBodySize: 65536,
          maxTxSize: 16384,
          maxBlockHeaderSize: 1100,
          maxValueSize: 5000,
          maxExecutionUnitsPerTransaction: {
            memory: 10000000,
            steps: 10000000,
          },
          maxExecutionUnitsPerBlock: { memory: 50000000, steps: 50000000 },
          maxCollateralInputs: 3,
          stakeKeyDeposit: 2000000n,
          poolDeposit: 500000000n,
          minFeeCoefficient: 44,
          minFeeConstant: 155381n,
          treasuryExpansion: '0.2',
          monetaryExpansion: '0.003',
          minPoolCost: 340000000n,
          coinsPerUtxoByte: 4310n,
          prices: { memory: 0.0577, steps: 0.0000721 },
          poolInfluence: '0.3',
          poolRetirementEpochBound: 18,
          desiredNumberOfPools: 500,
          costModels: new Map([
            [Cardano.PlutusLanguageVersion.V1, { '0': 197209, '1': 0 }],
            [Cardano.PlutusLanguageVersion.V2, { '0': 197209, '1': 0 }],
          ]),
          collateralPercentage: 150,
          governanceActionDeposit: 1000000000n,
          dRepDeposit: 5000000n,
          governanceActionValidityPeriod: 1209600,
          dRepInactivityPeriod: 1296000,
          minCommitteeSize: 3,
          committeeTermLimit: 200,
          dRepVotingThresholds: {
            motionNoConfidence: { numerator: 1, denominator: 2 },
            committeeNormal: { numerator: 1, denominator: 2 },
            committeeNoConfidence: { numerator: 1, denominator: 2 },
            updateConstitution: { numerator: 1, denominator: 2 },
            hardForkInitiation: { numerator: 1, denominator: 2 },
            ppNetworkGroup: { numerator: 1, denominator: 2 },
            ppEconomicGroup: { numerator: 1, denominator: 2 },
            ppTechnicalGroup: { numerator: 1, denominator: 2 },
            ppGovernanceGroup: { numerator: 1, denominator: 2 },
            treasuryWithdrawal: { numerator: 1, denominator: 2 },
          },
        },
        governanceActionId: {
          actionIndex: 1n,
          id: 'param-change-123',
        },
      } as unknown as Cardano.ParameterChangeAction;

      const mockedBaseGovernanceActionViewData = {
        mockedBaseGovernanceActionViewData:
          'mockedBaseGovernanceActionViewData',
      } as unknown as ReturnType<
        typeof governanceActionBaseUtils.getBaseGovernanceActionViewData
      >;
      const getBaseGovernanceActionViewDataSpy = vi
        .spyOn(governanceActionBaseUtils, 'getBaseGovernanceActionViewData')
        .mockReturnValue(mockedBaseGovernanceActionViewData);

      const result = getParameterChangeActionViewData({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(getBaseGovernanceActionViewDataSpy).toHaveBeenCalledWith({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(result.protocolParamUpdate).toMatchObject({
        maxTxExUnits: {
          memory: '10000000',
          step: '10000000',
        },
        maxBlockExUnits: {
          memory: '50000000',
          step: '50000000',
        },
        networkGroup: {
          maxBBSize: '65536',
          maxTxSize: '16384',
          maxBHSize: '1100',
          maxValSize: '5000',
          maxCollateralInputs: '3',
        },
        economicGroup: {
          minFeeA: '44',
          minFeeB: '155381',
          keyDeposit: '2000000',
          poolDeposit: '500000000',
          rho: '0.003',
          tau: '0.2',
          minPoolCost: '340000000',
          coinsPerUTxOByte: '4310',
          price: { memory: '0.0577', step: '0.0000721' },
        },
        technicalGroup: {
          a0: '0.3',
          eMax: '18',
          nOpt: '500',
          costModels: {
            PlutusV1: { '0': 197209, '1': 0 },
            PlutusV2: { '0': 197209, '1': 0 },
          },
          collateralPercentage: '150',
        },
        governanceGroup: {
          govActionLifetime: '1209600',
          govActionDeposit: '1000000000',
          drepDeposit: '5000000',
          drepActivity: '1296000',
          ccMinSize: '3',
          ccMaxTermLength: '200',
          dRepVotingThresholds: {
            motionNoConfidence: '50.00',
            committeeNormal: '50.00',
            committeeNoConfidence: '50.00',
            updateConstitution: '50.00',
            hardForkInitiation: '50.00',
            ppNetworkGroup: '50.00',
            ppEconomicGroup: '50.00',
            ppTechnicalGroup: '50.00',
            ppGovernanceGroup: '50.00',
            treasuryWithdrawal: '50.00',
          },
        },
      });
    });
  });

  describe('getHardForkInitiationActionViewData', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should return hard fork initiation action data', () => {
      const mockGovernanceAction: Cardano.HardForkInitiationAction = {
        __typename: Cardano.GovernanceActionType.hard_fork_initiation_action,
        protocolVersion: {
          major: 8,
          minor: 0,
        },
        governanceActionId: {
          actionIndex: 1,
          id: 'hard-fork-123' as Cardano.TransactionId,
        },
      };

      const mockedBaseGovernanceActionViewData = {
        mockedBaseGovernanceActionViewData:
          'mockedBaseGovernanceActionViewData',
      } as unknown as ReturnType<
        typeof governanceActionBaseUtils.getBaseGovernanceActionViewData
      >;
      const getBaseGovernanceActionViewDataSpy = vi
        .spyOn(governanceActionBaseUtils, 'getBaseGovernanceActionViewData')
        .mockReturnValue(mockedBaseGovernanceActionViewData);

      const result = getHardForkInitiationActionViewData({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(getBaseGovernanceActionViewDataSpy).toHaveBeenCalledWith({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(result).toMatchObject({
        ...mockedBaseGovernanceActionViewData,
        protocolVersion: {
          major: '8',
          minor: '0',
        },
      });
    });
  });

  describe('getInfoActionViewData', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });
    it('should return info action data', () => {
      const mockedBaseGovernanceActionViewData = {
        mockedBaseGovernanceActionViewData:
          'mockedBaseGovernanceActionViewData',
      } as unknown as ReturnType<
        typeof governanceActionBaseUtils.getBaseGovernanceActionViewData
      >;
      const getBaseGovernanceActionViewDataSpy = vi
        .spyOn(governanceActionBaseUtils, 'getBaseGovernanceActionViewData')
        .mockReturnValue(mockedBaseGovernanceActionViewData);

      const result = getInfoActionViewData({
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        networkType: mockNetworkType,
      });

      expect(getBaseGovernanceActionViewDataSpy).toHaveBeenCalledWith({
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        networkType: mockNetworkType,
      });

      expect(result).toMatchObject(mockedBaseGovernanceActionViewData);
    });
  });

  describe('getNewConstitutionActionViewData', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });
    it('should return new constitution action data', () => {
      const mockedBaseGovernanceActionViewData = {
        mockedBaseGovernanceActionViewData:
          'mockedBaseGovernanceActionViewData',
      } as unknown as ReturnType<
        typeof governanceActionBaseUtils.getBaseGovernanceActionViewData
      >;
      const getBaseGovernanceActionViewDataSpy = vi
        .spyOn(governanceActionBaseUtils, 'getBaseGovernanceActionViewData')
        .mockReturnValue(mockedBaseGovernanceActionViewData);

      const mockGovernanceAction: Cardano.NewConstitution = {
        __typename: Cardano.GovernanceActionType.new_constitution,
        constitution: {
          anchor: {
            url: 'https://constitution.example.com',
            dataHash: '0x456...' as Hash32ByteBase16,
          },
          scriptHash: '0x789...' as Hash28ByteBase16,
        },
        governanceActionId: {
          actionIndex: 1,
          id: 'constitution-123' as Cardano.TransactionId,
        },
      };

      const result = getNewConstitutionActionViewData({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(getBaseGovernanceActionViewDataSpy).toHaveBeenCalledWith({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(result).toMatchObject({
        ...mockedBaseGovernanceActionViewData,
        constitution: {
          anchor: {
            dataHash: '0x456...',
            url: 'https://constitution.example.com',
          },
          scriptHash: '0x789...',
        },
      });
    });
  });

  describe('getNoConfidenceActionViewData', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });
    it('should return no confidence action data', () => {
      const mockedBaseGovernanceActionViewData = {
        mockedBaseGovernanceActionViewData:
          'mockedBaseGovernanceActionViewData',
      } as unknown as ReturnType<
        typeof governanceActionBaseUtils.getBaseGovernanceActionViewData
      >;
      const getBaseGovernanceActionViewDataSpy = vi
        .spyOn(governanceActionBaseUtils, 'getBaseGovernanceActionViewData')
        .mockReturnValue(mockedBaseGovernanceActionViewData);

      const mockGovernanceAction: Cardano.NoConfidence = {
        __typename: Cardano.GovernanceActionType.no_confidence,
        governanceActionId: {
          actionIndex: 1,
          id: 'no-confidence-123' as Cardano.TransactionId,
        },
      };

      const result = getNoConfidenceActionViewData({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(getBaseGovernanceActionViewDataSpy).toHaveBeenCalledWith({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        rewardAccount: mockRewardAccount,
        anchor: mockAnchor,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(result).toMatchObject(mockedBaseGovernanceActionViewData);
    });
  });

  describe('getTreasuryWithdrawalsActionViewData', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });
    it('should return treasury withdrawals action data', () => {
      const mockedBaseGovernanceActionViewData = {
        mockedBaseGovernanceActionViewData:
          'mockedBaseGovernanceActionViewData',
      } as unknown as ReturnType<
        typeof governanceActionBaseUtils.getBaseGovernanceActionViewData
      >;
      const getBaseGovernanceActionViewDataSpy = vi
        .spyOn(governanceActionBaseUtils, 'getBaseGovernanceActionViewData')
        .mockReturnValue(mockedBaseGovernanceActionViewData);

      const mockGovernanceAction: Cardano.TreasuryWithdrawalsAction = {
        __typename: Cardano.GovernanceActionType.treasury_withdrawals_action,
        withdrawals: new Set([
          {
            rewardAccount: 'stake1ux...' as Cardano.RewardAccount,
            coin: 5000000n,
          },
        ]),
        policyHash: '0x123...' as Hash28ByteBase16,
      };

      const result = getTreasuryWithdrawalsActionViewData({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        anchor: mockAnchor,
        rewardAccount: mockRewardAccount,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(getBaseGovernanceActionViewDataSpy).toHaveBeenCalledWith({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        anchor: mockAnchor,
        rewardAccount: mockRewardAccount,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(result).toMatchObject({
        ...mockedBaseGovernanceActionViewData,
        withdrawals: [
          {
            rewardAccount: 'stake1ux...',
            lovelace: '5.00 ADA',
          },
        ],
      });
    });
  });

  describe('getUpdateCommitteeActionViewData', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });
    it('should return update committee action data', () => {
      const mockedBaseGovernanceActionViewData = {
        mockedBaseGovernanceActionViewData:
          'mockedBaseGovernanceActionViewData',
      } as unknown as ReturnType<
        typeof governanceActionBaseUtils.getBaseGovernanceActionViewData
      >;
      const getBaseGovernanceActionViewDataSpy = vi
        .spyOn(governanceActionBaseUtils, 'getBaseGovernanceActionViewData')
        .mockReturnValue(mockedBaseGovernanceActionViewData);

      const mockGovernanceAction: Cardano.UpdateCommittee = {
        __typename: Cardano.GovernanceActionType.update_committee,
        membersToBeAdded: new Set([
          {
            coldCredential: {
              hash: '0xabc...' as Hash28ByteBase16,
              type: Cardano.CredentialType.KeyHash,
            },
            epoch: 100 as Cardano.EpochNo,
          },
        ]),
        membersToBeRemoved: new Set([
          {
            hash: '0xdef...' as Hash28ByteBase16,
            type: Cardano.CredentialType.KeyHash,
          },
        ]),
        newQuorumThreshold: {
          numerator: 2,
          denominator: 3,
        },
        governanceActionId: {
          actionIndex: 1,
          id: 'committee-123' as Cardano.TransactionId,
        },
      };

      const result = getUpdateCommitteeActionViewData({
        anchor: mockAnchor,
        deposit: mockDeposit,
        explorerBaseUrl: mockExplorerBaseUrl,
        governanceAction: mockGovernanceAction,
        rewardAccount: mockRewardAccount,
        networkType: mockNetworkType,
      });

      expect(getBaseGovernanceActionViewDataSpy).toHaveBeenCalledWith({
        governanceAction: mockGovernanceAction,
        deposit: mockDeposit,
        anchor: mockAnchor,
        rewardAccount: mockRewardAccount,
        explorerBaseUrl: mockExplorerBaseUrl,
        networkType: mockNetworkType,
      });

      expect(result).toMatchObject({
        ...mockedBaseGovernanceActionViewData,
        membersToBeAdded: [
          {
            coldCredential: {
              hash: '0xabc...',
            },
            epoch: '100',
          },
        ],
        membersToBeRemoved: [
          {
            hash: '0xdef...',
          },
        ],
      });
    });
  });
});
