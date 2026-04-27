import { Cardano } from '@cardano-sdk/core';
import {
  convertLovelacesToAda,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';

import { formatPercentages } from './formatting';
import {
  convertFractionToPercentage,
  getBaseGovernanceActionViewData,
} from './governance-action-base';

import type { Data as HardForkInitiationActionProps } from '../components/ActivityDetails/ProposalProcedures/HardForkInitiationAction/types';
import type { Data as InfoActionProps } from '../components/ActivityDetails/ProposalProcedures/InfoAction/types';
import type { Data as NewConstitutionActionProps } from '../components/ActivityDetails/ProposalProcedures/NewConstitutionAction/types';
import type { Data as NoConfidenceActionProps } from '../components/ActivityDetails/ProposalProcedures/NoConfidenceAction/types';
import type { Data as ParameterChangeActionProps } from '../components/ActivityDetails/ProposalProcedures/ParameterChangeAction/types';
import type { Data as TreasuryWithdrawalsActionProps } from '../components/ActivityDetails/ProposalProcedures/TreasuryWithdrawalsAction/types';
import type { Data as UpdateCommitteeActionProps } from '../components/ActivityDetails/ProposalProcedures/UpdateCommitteeAction/types';
import type { NetworkType } from '@lace-contract/network';

export const getParameterChangeActionViewData = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  explorerBaseUrl = '',
  networkType,
}: {
  governanceAction: Cardano.ParameterChangeAction;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  explorerBaseUrl: string;
  networkType: NetworkType;
}): ParameterChangeActionProps => {
  const {
    protocolParamUpdate: {
      maxBlockBodySize,
      maxTxSize,
      maxBlockHeaderSize,
      maxValueSize,
      maxExecutionUnitsPerTransaction,
      maxExecutionUnitsPerBlock,
      maxCollateralInputs,
      stakeKeyDeposit,
      poolDeposit,
      minFeeCoefficient,
      minFeeConstant,
      treasuryExpansion,
      monetaryExpansion,
      minPoolCost,
      coinsPerUtxoByte,
      prices,
      poolInfluence,
      poolRetirementEpochBound,
      desiredNumberOfPools,
      costModels,
      collateralPercentage,
      governanceActionDeposit,
      dRepDeposit,
      governanceActionValidityPeriod,
      dRepInactivityPeriod,
      minCommitteeSize,
      committeeTermLimit,
      dRepVotingThresholds,
    },
  } = governanceAction;

  return {
    ...getBaseGovernanceActionViewData({
      governanceAction,
      deposit,
      rewardAccount,
      anchor,
      explorerBaseUrl,
      networkType,
    }),
    protocolParamUpdate: {
      maxTxExUnits: {
        memory: maxExecutionUnitsPerTransaction?.memory?.toString() ?? '',
        step: maxExecutionUnitsPerTransaction?.steps?.toString() ?? '',
      },
      maxBlockExUnits: {
        memory: maxExecutionUnitsPerBlock?.memory?.toString() ?? '',
        step: maxExecutionUnitsPerBlock?.steps?.toString() ?? '',
      },
      networkGroup: {
        maxBBSize: maxBlockBodySize?.toString() ?? '',
        maxTxSize: maxTxSize?.toString() ?? '',
        maxBHSize: maxBlockHeaderSize?.toString() ?? '',
        maxValSize: maxValueSize?.toString() ?? '',
        maxCollateralInputs: maxCollateralInputs?.toString() ?? '',
      },
      economicGroup: {
        minFeeA: minFeeCoefficient?.toString() ?? '',
        minFeeB: minFeeConstant?.toString() ?? '',
        keyDeposit: stakeKeyDeposit?.toString() ?? '',
        poolDeposit: poolDeposit?.toString() ?? '',
        rho: monetaryExpansion ?? '',
        tau: treasuryExpansion ?? '',
        minPoolCost: minPoolCost?.toString() ?? '',
        coinsPerUTxOByte: coinsPerUtxoByte?.toString() ?? '',
        price: {
          memory: prices?.memory?.toString() ?? '',
          step: prices?.steps?.toString() ?? '',
        },
      },
      technicalGroup: {
        a0: poolInfluence ?? '',
        eMax: poolRetirementEpochBound?.toString() ?? '',
        nOpt: desiredNumberOfPools?.toString() ?? '',
        costModels: {
          PlutusV1: Object.entries(
            costModels?.get(Cardano.PlutusLanguageVersion.V1) || {},
          ).reduce(
            (accumulator, current) => ({
              ...accumulator,
              [current[0]]: current[1],
            }),
            {},
          ),
          PlutusV2: Object.entries(
            costModels?.get(Cardano.PlutusLanguageVersion.V2) || {},
          ).reduce(
            (accumulator, current) => ({
              ...accumulator,
              [current[0]]: current[1],
            }),
            {},
          ),
        },
        collateralPercentage: collateralPercentage?.toString() ?? '',
      },
      governanceGroup: {
        govActionLifetime: governanceActionValidityPeriod?.toString() ?? '',
        govActionDeposit: governanceActionDeposit?.toString() ?? '',
        drepDeposit: dRepDeposit?.toString() ?? '',
        drepActivity: dRepInactivityPeriod?.toString() ?? '',
        ccMinSize: minCommitteeSize?.toString() ?? '',
        ccMaxTermLength: committeeTermLimit?.toString() ?? '',
        dRepVotingThresholds: {
          ...(dRepVotingThresholds?.motionNoConfidence
            ? {
                motionNoConfidence: formatPercentages(
                  dRepVotingThresholds.motionNoConfidence.numerator /
                    dRepVotingThresholds.motionNoConfidence.denominator,
                ),
              }
            : { motionNoConfidence: '' }),
          committeeNormal: convertFractionToPercentage(
            dRepVotingThresholds?.committeeNormal.numerator,
            dRepVotingThresholds?.committeeNormal.denominator,
          ),
          committeeNoConfidence: convertFractionToPercentage(
            dRepVotingThresholds?.committeeNoConfidence.numerator,
            dRepVotingThresholds?.committeeNoConfidence.denominator,
          ),
          updateConstitution: convertFractionToPercentage(
            dRepVotingThresholds?.updateConstitution.numerator,
            dRepVotingThresholds?.updateConstitution.denominator,
          ),
          hardForkInitiation: convertFractionToPercentage(
            dRepVotingThresholds?.hardForkInitiation.numerator,
            dRepVotingThresholds?.hardForkInitiation.denominator,
          ),
          ppNetworkGroup: convertFractionToPercentage(
            dRepVotingThresholds?.ppNetworkGroup.numerator,
            dRepVotingThresholds?.ppNetworkGroup.denominator,
          ),
          ppEconomicGroup: convertFractionToPercentage(
            dRepVotingThresholds?.ppEconomicGroup.numerator,
            dRepVotingThresholds?.ppEconomicGroup.denominator,
          ),
          ppTechnicalGroup: convertFractionToPercentage(
            dRepVotingThresholds?.ppTechnicalGroup.numerator,
            dRepVotingThresholds?.ppTechnicalGroup.denominator,
          ),
          ppGovernanceGroup: convertFractionToPercentage(
            dRepVotingThresholds?.ppGovernanceGroup?.numerator,
            dRepVotingThresholds?.ppGovernanceGroup.denominator,
          ),
          treasuryWithdrawal: convertFractionToPercentage(
            dRepVotingThresholds?.treasuryWithdrawal.numerator,
            dRepVotingThresholds?.treasuryWithdrawal.denominator,
          ),
        },
      },
    },
  };
};

export const getHardForkInitiationActionViewData = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  explorerBaseUrl,
  networkType,
}: {
  governanceAction: Cardano.HardForkInitiationAction;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  explorerBaseUrl: string;
  networkType: NetworkType;
}): HardForkInitiationActionProps => ({
  ...getBaseGovernanceActionViewData({
    governanceAction,
    deposit,
    rewardAccount,
    anchor,
    explorerBaseUrl,
    networkType,
  }),
  protocolVersion: {
    major: governanceAction.protocolVersion.major.toString(),
    minor: governanceAction.protocolVersion.minor.toString(),
  },
});

export const getInfoActionViewData = ({
  anchor,
  explorerBaseUrl,
  deposit,
  rewardAccount,
  networkType,
}: {
  anchor: Cardano.ProposalProcedure['anchor'];
  explorerBaseUrl: string;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  networkType: NetworkType;
}): InfoActionProps => ({
  ...getBaseGovernanceActionViewData({
    deposit,
    rewardAccount,
    anchor,
    explorerBaseUrl,
    networkType,
  }),
});

export const getNewConstitutionActionViewData = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  explorerBaseUrl,
  networkType,
}: {
  governanceAction: Cardano.NewConstitution;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  explorerBaseUrl: string;
  networkType: NetworkType;
}): NewConstitutionActionProps => ({
  ...getBaseGovernanceActionViewData({
    governanceAction,
    deposit,
    rewardAccount,
    anchor,
    explorerBaseUrl,
    networkType,
  }),
  constitution: {
    anchor: {
      dataHash: governanceAction.constitution.anchor.dataHash.toString(),
      url: governanceAction.constitution.anchor.url.toString(),
    },
    ...(governanceAction.constitution.scriptHash && {
      scriptHash: governanceAction.constitution.scriptHash.toString(),
    }),
  },
});

export const getNoConfidenceActionViewData = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  explorerBaseUrl,
  networkType,
}: {
  governanceAction: Cardano.NoConfidence;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  explorerBaseUrl: string;
  networkType: NetworkType;
}): NoConfidenceActionProps => ({
  ...getBaseGovernanceActionViewData({
    governanceAction,
    deposit,
    rewardAccount,
    anchor,
    explorerBaseUrl,
    networkType,
  }),
});

export const getTreasuryWithdrawalsActionViewData = ({
  governanceAction,
  deposit,
  anchor,
  rewardAccount,
  explorerBaseUrl,
  networkType,
}: {
  governanceAction: Cardano.TreasuryWithdrawalsAction;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  explorerBaseUrl: string;
  networkType: NetworkType;
}): TreasuryWithdrawalsActionProps => ({
  ...getBaseGovernanceActionViewData({
    governanceAction,
    deposit,
    rewardAccount,
    anchor,
    explorerBaseUrl,
    networkType,
  }),
  withdrawals: [...governanceAction.withdrawals].map(withdrawal => ({
    rewardAccount: withdrawal.rewardAccount.toString(),
    lovelace: `${convertLovelacesToAda(
      withdrawal.coin,
    )} ${getAdaTokenTickerByNetwork(networkType)}`,
  })),
});

export const getUpdateCommitteeActionViewData = ({
  anchor,
  deposit,
  explorerBaseUrl,
  governanceAction,
  rewardAccount,
  networkType,
}: {
  governanceAction: Cardano.UpdateCommittee;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  explorerBaseUrl: string;
  networkType: NetworkType;
}): UpdateCommitteeActionProps => ({
  ...getBaseGovernanceActionViewData({
    governanceAction,
    deposit,
    rewardAccount,
    anchor,
    explorerBaseUrl,
    networkType,
  }),
  membersToBeAdded: [...governanceAction.membersToBeAdded].map(
    ({ coldCredential: { hash }, epoch }) => ({
      coldCredential: {
        hash: hash.toString(),
      },
      epoch: epoch.toString(),
    }),
  ),
  membersToBeRemoved: [...governanceAction.membersToBeRemoved].map(
    ({ hash }) => ({
      hash: hash.toString(),
    }),
  ),
});
