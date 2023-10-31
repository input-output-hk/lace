/* eslint-disable unicorn/no-array-reduce */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPercentages } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { ParameterChangeAction } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { SignTxData } from '../types';
import { useCExpolorerBaseUrl } from '../hooks';

interface Props {
  dappInfo: SignTxData['dappInfo'];
  governanceAction: Wallet.Cardano.ParameterChangeAction;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
  errorMessage?: string;
}

export const ParameterChangeActionContainer = ({
  dappInfo,
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  errorMessage
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();

  const explorerBaseUrl = useCExpolorerBaseUrl();

  const translations = useMemo(
    () => ({
      procedure: {
        title: t('core.proposalProcedure.governanceAction.protocolParamUpdate.title'),
        deposit: t('core.proposalProcedure.procedure.deposit'),
        rewardAccount: t('core.proposalProcedure.procedure.rewardAccount'),
        anchor: {
          url: t('core.proposalProcedure.procedure.anchor.url'),
          hash: t('core.proposalProcedure.procedure.anchor.hash')
        }
      },
      networkGroup: {
        title: t('core.proposalProcedure.governanceAction.protocolParamUpdate.networkGroup.title'),
        tooltip: {
          maxBBSize: t('core.proposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxBBSize'),
          maxTxSize: t('core.proposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxTxSize'),
          maxBHSize: t('core.proposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxBHSize'),
          maxValSize: t('core.proposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxValSize'),
          maxTxExUnits: t(
            'core.proposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxTxExUnits'
          ),
          maxBlockExUnits: t(
            'core.proposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxBlockExUnits'
          ),
          maxCollateralInputs: t(
            'core.proposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxCollateralInputs'
          )
        }
      },
      economicGroup: {
        title: t('core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.title'),
        tooltip: {
          minFeeA: t('core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minFeeA'),
          minFeeB: t('core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minFeeB'),
          keyDeposit: t('core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.keyDeposit'),
          poolDeposit: t(
            'core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.poolDeposit'
          ),
          rho: t('core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.rho'),
          tau: t('core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.tau'),
          minPoolCost: t(
            'core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minPoolCost'
          ),
          coinsPerUTxOByte: t(
            'core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.coinsPerUTxOByte'
          ),
          prices: t('core.proposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.prices')
        }
      },
      technicalGroup: {
        title: t('core.proposalProcedure.governanceAction.technicalGroup.title'),
        tooltip: {
          a0: t('core.proposalProcedure.governanceAction.technicalGroup.tooltip.a0'),
          eMax: t('core.proposalProcedure.governanceAction.technicalGroup.tooltip.eMax'),
          nOpt: t('core.proposalProcedure.governanceAction.technicalGroup.tooltip.nOpt'),
          costModels: t('core.proposalProcedure.governanceAction.technicalGroup.tooltip.costModels'),
          collateralPercentage: t('core.proposalProcedure.governanceAction.technicalGroup.tooltip.collateralPercentage')
        }
      },
      governanceGroup: {
        title: t('core.proposalProcedure.governanceAction.governanceGroup.title'),
        tooltip: {
          govActionLifetime: t('core.proposalProcedure.governanceAction.governanceGroup.tooltip.govActionLifetime'),
          govActionDeposit: t('core.proposalProcedure.governanceAction.governanceGroup.tooltip.govActionDeposit'),
          drepDeposit: t('core.proposalProcedure.governanceAction.governanceGroup.tooltip.drepDeposit'),
          drepActivity: t('core.proposalProcedure.governanceAction.governanceGroup.tooltip.drepActivity'),
          ccMinSize: t('core.proposalProcedure.governanceAction.governanceGroup.tooltip.ccMinSize'),
          ccMaxTermLength: t('core.proposalProcedure.governanceAction.governanceGroup.tooltip.ccMaxTermLength'),
          dRepVotingThresholds: {
            title: t('core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.title'),
            motionNoConfidence: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.motionNoConfidence'
            ),
            committeeNormal: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.committeeNormal'
            ),
            commiteeNoConfidence: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.commiteeNoConfidence'
            ),
            updateConstitution: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.updateConstitution'
            ),
            hardForkInitiation: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.hardForkInitiation'
            ),
            ppNetworkGroup: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.ppNetworkGroup'
            ),
            ppEconomicGroup: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.ppEconomicGroup'
            ),
            ppTechnicalGroup: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.ppTechnicalGroup'
            ),
            ppGovernanceGroup: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.ppGovernanceGroup'
            ),
            treasuryWithdrawal: t(
              'core.proposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.treasuryWithdrawal'
            )
          }
        }
      }
    }),
    [t]
  );

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
      dRepVotingThresholds: {
        motionNoConfidence,
        committeeNormal,
        commiteeNoConfidence,
        updateConstitution,
        hardForkInitiation,
        ppNetworkGroup,
        ppEconomicGroup,
        ppTechnicalGroup,
        ppGovernanceGroup,
        treasuryWithdrawal
      }
    }
  } = governanceAction;

  const data = {
    procedure: {
      deposit: `${Wallet.util.lovelacesToAdaString(deposit.toString())} ${cardanoCoin.symbol}`,
      rewardAccount,
      ...(anchor.url && {
        anchor: {
          url: anchor.url,
          hash: anchor.dataHash,
          ...(explorerBaseUrl && { txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}` })
        }
      })
    },
    protocolParamUpdate: {
      networkGroup: {
        maxBBSize: maxBlockBodySize.toString(),
        maxTxSize: maxTxSize.toString(),
        maxBHSize: maxBlockHeaderSize.toString(),
        maxValSize: maxValueSize.toString(),
        maxTxExUnits: {
          memory: maxExecutionUnitsPerTransaction.memory.toString(),
          step: maxExecutionUnitsPerTransaction.steps.toString()
        },
        maxBlockExUnits: {
          memory: maxExecutionUnitsPerBlock.memory.toString(),
          step: maxExecutionUnitsPerBlock.steps.toString()
        },
        maxCollateralInputs: maxCollateralInputs.toString()
      },
      economicGroup: {
        minFeeA: minFeeCoefficient.toString(),
        minFeeB: minFeeConstant.toString(),
        keyDeposit: stakeKeyDeposit.toString(),
        poolDeposit: poolDeposit.toString(),
        rho: monetaryExpansion,
        tau: treasuryExpansion,
        minPoolCost: minPoolCost.toString(),
        coinsPerUTxOByte: coinsPerUtxoByte.toString(),
        price: {
          memory: prices.memory.toString(),
          step: prices.steps.toString()
        }
      },
      technicalGroup: {
        a0: poolInfluence,
        eMax: poolRetirementEpochBound.toString(),
        nOpt: desiredNumberOfPools.toString(),
        costModels: {
          PlutusV1: Object.entries(costModels.get(Wallet.Cardano.PlutusLanguageVersion.V1)).reduce(
            (acc, cur) => ({ ...acc, [cur[0]]: cur[1] }),
            {}
          ),
          PlutusV2: Object.entries(costModels.get(Wallet.Cardano.PlutusLanguageVersion.V2)).reduce(
            (acc, cur) => ({ ...acc, [cur[0]]: cur[1] }),
            {}
          )
        },
        collateralPercentage: collateralPercentage.toString()
      },
      governanceGroup: {
        govActionLifetime: governanceActionValidityPeriod.toString(),
        govActionDeposit: governanceActionDeposit.toString(),
        drepDeposit: dRepDeposit.toString(),
        drepActivity: dRepInactivityPeriod.toString(),
        ccMinSize: minCommitteeSize.toString(),
        ccMaxTermLength: committeeTermLimit.toString(),
        dRepVotingThresholds: {
          dvtMotionNoConfidence: formatPercentages(motionNoConfidence.numerator / motionNoConfidence.denominator),
          dvtCommitteeNormal: formatPercentages(committeeNormal.numerator / committeeNormal.denominator),
          dvtCommitteeNoConfidence: formatPercentages(
            commiteeNoConfidence.numerator / commiteeNoConfidence.denominator
          ),
          dvtUpdateToConstitution: formatPercentages(updateConstitution.numerator / updateConstitution.denominator),
          dvtHardForkInitiation: formatPercentages(hardForkInitiation.numerator / hardForkInitiation.denominator),
          dvtPPNetworkGroup: formatPercentages(ppNetworkGroup.numerator / ppNetworkGroup.denominator),
          dvtPPEconomicGroup: formatPercentages(ppEconomicGroup.numerator / ppEconomicGroup.denominator),
          dvtPPTechnicalGroup: formatPercentages(ppTechnicalGroup.numerator / ppTechnicalGroup.denominator),
          dvtPPGovGroup: formatPercentages(ppGovernanceGroup.numerator / ppGovernanceGroup.denominator),
          dvtTreasuryWithdrawal: formatPercentages(treasuryWithdrawal.numerator / treasuryWithdrawal.denominator)
        }
      }
    }
  };

  return (
    <ParameterChangeAction dappInfo={dappInfo} errorMessage={errorMessage} data={data} translations={translations} />
  );
};
