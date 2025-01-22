/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import { Cardano } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { formatPercentages } from '@lace/common';
import {
  HardForkInitiationAction,
  InfoAction,
  NewConstitutionAction,
  NoConfidenceAction,
  ParameterChangeAction,
  TreasuryWithdrawalsAction,
  UpdateCommitteeAction
} from '../components/ProposalProcedures';

const convertFractionToPercentage = (
  numerator?: Cardano.Fraction['numerator'],
  denominator?: Cardano.Fraction['denominator']
): string => {
  if (numerator && denominator) {
    return formatPercentages(numerator / denominator);
  }
  return '';
};

export const getParameterChangeActionViewData = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  cardanoCoin,
  explorerBaseUrl
}: {
  governanceAction: Cardano.ParameterChangeAction;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}): Parameters<typeof ParameterChangeAction>[0]['data'] => {
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
      dRepVotingThresholds
    }
  } = governanceAction;

  return {
    txDetails: {
      deposit: Wallet.util.getFormattedAmount({
        amount: deposit.toString(),
        cardanoCoin
      }),
      rewardAccount
    },
    anchor: {
      url: anchor.url,
      hash: anchor.dataHash,
      txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`
    },
    protocolParamUpdate: {
      maxTxExUnits: {
        memory: maxExecutionUnitsPerTransaction?.memory?.toString() ?? '',
        step: maxExecutionUnitsPerTransaction?.steps?.toString() ?? ''
      },
      maxBlockExUnits: {
        memory: maxExecutionUnitsPerBlock?.memory?.toString() ?? '',
        step: maxExecutionUnitsPerBlock?.steps?.toString() ?? ''
      },
      networkGroup: {
        maxBBSize: maxBlockBodySize?.toString() ?? '',
        maxTxSize: maxTxSize?.toString() ?? '',
        maxBHSize: maxBlockHeaderSize?.toString() ?? '',
        maxValSize: maxValueSize?.toString() ?? '',
        maxCollateralInputs: maxCollateralInputs?.toString() ?? ''
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
          step: prices?.steps?.toString() ?? ''
        }
      },
      technicalGroup: {
        a0: poolInfluence ?? '',
        eMax: poolRetirementEpochBound?.toString() ?? '',
        nOpt: desiredNumberOfPools?.toString() ?? '',
        costModels: {
          PlutusV1: Object.entries(costModels?.get(Cardano.PlutusLanguageVersion.V1) || {}).reduce(
            (acc, cur) => ({ ...acc, [cur[0]]: cur[1] }),
            {}
          ),
          PlutusV2: Object.entries(costModels?.get(Cardano.PlutusLanguageVersion.V2) || {}).reduce(
            (acc, cur) => ({ ...acc, [cur[0]]: cur[1] }),
            {}
          )
        },
        collateralPercentage: collateralPercentage?.toString() ?? ''
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
                    dRepVotingThresholds.motionNoConfidence.denominator
                )
              }
            : { motionNoConfidence: '' }),
          committeeNormal: convertFractionToPercentage(
            dRepVotingThresholds?.committeeNormal.numerator,
            dRepVotingThresholds?.committeeNormal.denominator
          ),
          committeeNoConfidence: convertFractionToPercentage(
            dRepVotingThresholds?.committeeNoConfidence.numerator,
            dRepVotingThresholds?.committeeNoConfidence.denominator
          ),
          updateToConstitution: convertFractionToPercentage(
            dRepVotingThresholds?.updateConstitution.numerator,
            dRepVotingThresholds?.updateConstitution.denominator
          ),
          hardForkInitiation: convertFractionToPercentage(
            dRepVotingThresholds?.hardForkInitiation.numerator,
            dRepVotingThresholds?.hardForkInitiation.denominator
          ),
          ppNetworkGroup: convertFractionToPercentage(
            dRepVotingThresholds?.ppNetworkGroup.numerator,
            dRepVotingThresholds?.ppNetworkGroup.denominator
          ),
          ppEconomicGroup: convertFractionToPercentage(
            dRepVotingThresholds?.ppEconomicGroup.numerator,
            dRepVotingThresholds?.ppEconomicGroup.denominator
          ),
          ppTechnicalGroup: convertFractionToPercentage(
            dRepVotingThresholds?.ppTechnicalGroup.numerator,
            dRepVotingThresholds?.ppTechnicalGroup.denominator
          ),
          ppGovGroup: convertFractionToPercentage(
            dRepVotingThresholds?.ppGovernanceGroup?.numerator,
            dRepVotingThresholds?.ppGovernanceGroup.denominator
          ),
          treasuryWithdrawal: convertFractionToPercentage(
            dRepVotingThresholds?.treasuryWithdrawal.numerator,
            dRepVotingThresholds?.treasuryWithdrawal.denominator
          )
        }
      }
    }
  };
};

export const getHardForkInitiationActionViewData = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  cardanoCoin,
  explorerBaseUrl
}: {
  governanceAction: Cardano.HardForkInitiationAction;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}): Parameters<typeof HardForkInitiationAction>[0]['data'] => ({
  txDetails: {
    deposit: Wallet.util.getFormattedAmount({
      amount: deposit.toString(),
      cardanoCoin
    }),
    rewardAccount
  },
  procedure: {
    anchor: {
      url: anchor.url,
      hash: anchor.dataHash,
      txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`
    }
  },
  protocolVersion: {
    major: governanceAction.protocolVersion.major.toString(),
    minor: governanceAction.protocolVersion.minor.toString()
  },
  ...(governanceAction.governanceActionId && {
    actionId: {
      index: governanceAction.governanceActionId.actionIndex.toString(),
      id: governanceAction.governanceActionId.id || ''
    }
  })
});

export const getInfoActionViewData = ({
  anchor,
  explorerBaseUrl,
  deposit,
  rewardAccount,
  cardanoCoin
}: {
  anchor: Cardano.ProposalProcedure['anchor'];
  explorerBaseUrl: string;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  cardanoCoin: Wallet.CoinId;
}): Parameters<typeof InfoAction>[0]['data'] => ({
  txDetails: {
    deposit: Wallet.util.getFormattedAmount({
      amount: deposit.toString(),
      cardanoCoin
    }),
    rewardAccount
  },
  procedure: {
    anchor: {
      url: anchor.url,
      hash: anchor.dataHash,
      txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`
    }
  }
});

export const getNewConstitutionActionViewData = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  cardanoCoin,
  explorerBaseUrl
}: {
  governanceAction: Cardano.NewConstitution;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}): Parameters<typeof NewConstitutionAction>[0]['data'] => ({
  txDetails: {
    deposit: Wallet.util.getFormattedAmount({
      amount: deposit.toString(),
      cardanoCoin
    }),
    rewardAccount
  },
  procedure: {
    anchor: {
      url: anchor.url,
      hash: anchor.dataHash,
      txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`
    }
  },
  ...(governanceAction.governanceActionId && {
    actionId: {
      index: governanceAction.governanceActionId.actionIndex.toString(),
      id: governanceAction.governanceActionId.id || ''
    }
  }),
  constitution: {
    anchor: {
      dataHash: governanceAction.constitution.anchor.dataHash.toString(),
      url: governanceAction.constitution.anchor.url.toString()
    },
    ...(governanceAction.constitution.scriptHash && { scriptHash: governanceAction.constitution.scriptHash.toString() })
  }
});

export const getNoConfidenceActionViewData = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  cardanoCoin,
  explorerBaseUrl
}: {
  governanceAction: Cardano.NoConfidence;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}): Parameters<typeof NoConfidenceAction>[0]['data'] => ({
  txDetails: {
    deposit: Wallet.util.getFormattedAmount({
      amount: deposit.toString(),
      cardanoCoin
    }),
    rewardAccount
  },
  procedure: {
    anchor: {
      url: anchor.url,
      hash: anchor.dataHash,
      txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`
    }
  },
  ...(governanceAction.governanceActionId && {
    actionId: {
      index: governanceAction.governanceActionId.actionIndex.toString(),
      id: governanceAction.governanceActionId.id || ''
    }
  })
});

export const getTreasuryWithdrawalsActionViewData = ({
  governanceAction,
  deposit,
  anchor,
  rewardAccount,
  cardanoCoin,
  explorerBaseUrl
}: {
  governanceAction: Cardano.TreasuryWithdrawalsAction;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}): Parameters<typeof TreasuryWithdrawalsAction>[0]['data'] => ({
  txDetails: {
    deposit: Wallet.util.getFormattedAmount({
      amount: deposit.toString(),
      cardanoCoin
    }),
    rewardAccount
  },
  procedure: {
    anchor: {
      url: anchor.url,
      hash: anchor.dataHash,
      txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`
    }
  },
  withdrawals: [...governanceAction.withdrawals].map((withdrawal) => ({
    rewardAccount: withdrawal.rewardAccount.toString(),
    lovelace: Wallet.util.getFormattedAmount({
      amount: withdrawal.coin.toString(),
      cardanoCoin
    })
  }))
});

export const getUpdateCommitteeActionViewData = ({
  anchor,
  cardanoCoin,
  deposit,
  explorerBaseUrl,
  governanceAction,
  rewardAccount
}: {
  governanceAction: Cardano.UpdateCommittee;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}): Parameters<typeof UpdateCommitteeAction>[0]['data'] => ({
  txDetails: {
    deposit: Wallet.util.getFormattedAmount({
      amount: deposit.toString(),
      cardanoCoin
    }),
    rewardAccount
  },
  procedure: {
    anchor: {
      url: anchor.url,
      hash: anchor.dataHash,
      txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`
    }
  },
  ...(governanceAction.governanceActionId && {
    actionId: {
      index: governanceAction.governanceActionId.actionIndex.toString(),
      id: governanceAction.governanceActionId.id || ''
    }
  }),
  membersToBeAdded: [...governanceAction.membersToBeAdded].map(({ coldCredential: { hash }, epoch }) => ({
    coldCredential: {
      hash: hash.toString()
    },
    epoch: epoch.toString()
  })),
  membersToBeRemoved: [...governanceAction.membersToBeRemoved].map(({ hash }) => ({
    hash: hash.toString()
  }))
});
