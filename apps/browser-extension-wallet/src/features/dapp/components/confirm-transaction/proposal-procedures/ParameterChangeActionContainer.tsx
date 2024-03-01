/* eslint-disable unicorn/no-array-reduce */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPercentages } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { ParameterChangeAction } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { SignTxData } from '../types';
import { useCexplorerBaseUrl } from '../hooks';

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

  const explorerBaseUrl = useCexplorerBaseUrl();

  // TODO: consider encapsulating it inside the component itself, check if all the translations have the fallback to the parent int provider (LW-9920)
  const translations = useMemo<Parameters<typeof ParameterChangeAction>[0]['translations']>(
    () => ({
      txDetails: {
        title: t('core.ProposalProcedure.txDetails.title'),
        txType: t('core.ProposalProcedure.txDetails.txType'),
        deposit: t('core.ProposalProcedure.txDetails.deposit'),
        rewardAccount: t('core.ProposalProcedure.txDetails.rewardAccount')
      },
      anchor: {
        url: t('core.ProposalProcedure.procedure.anchor.url'),
        hash: t('core.ProposalProcedure.procedure.anchor.hash')
      },
      memory: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.memory'),
      step: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.step'),
      networkGroup: {
        title: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.title'),
        maxBBSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxBBSize'),
        maxTxSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxTxSize'),
        maxBHSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxBHSize'),
        maxValSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxValSize'),
        maxTxExUnits: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxTxExUnits'),
        maxBlockExUnits: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxBlockExUnits'),
        maxCollateralInputs: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxCollateralInputs'
        ),
        coinsByUTXOByte: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.coinsByUTXOByte'),
        tooltip: {
          maxBBSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxBBSize'),
          maxTxSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxTxSize'),
          maxBHSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxBHSize'),
          maxValSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxValSize'),
          maxTxExUnits: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxTxExUnits'
          ),
          maxBlockExUnits: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxBlockExUnits'
          ),
          maxCollateralInputs: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxCollateralInputs'
          ),
          coinsByUTXOByte: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.coinsByUTXOByte'
          )
        }
      },
      economicGroup: {
        title: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.title'),
        minFeeA: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.minFeeA'),
        minFeeB: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.minFeeB'),
        keyDeposit: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.keyDeposit'),
        poolDeposit: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.poolDeposit'),
        rho: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.rho'),
        tau: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tau'),
        minPoolCost: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.minPoolCost'),
        coinsPerUTxOByte: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.coinsPerUTxOByte'
        ),
        prices: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.prices'),
        tooltip: {
          minFeeA: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minFeeA'),
          minFeeB: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minFeeB'),
          keyDeposit: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.keyDeposit'),
          poolDeposit: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.poolDeposit'
          ),
          rho: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.rho'),
          tau: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.tau'),
          minPoolCost: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minPoolCost'
          ),
          coinsPerUTxOByte: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.coinsPerUTxOByte'
          ),
          prices: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.prices')
        }
      },
      technicalGroup: {
        title: t('core.ProposalProcedure.governanceAction.technicalGroup.title'),
        a0: t('core.ProposalProcedure.governanceAction.technicalGroup.a0'),
        eMax: t('core.ProposalProcedure.governanceAction.technicalGroup.eMax'),
        nOpt: t('core.ProposalProcedure.governanceAction.technicalGroup.nOpt'),
        costModels: t('core.ProposalProcedure.governanceAction.technicalGroup.costModels'),
        collateralPercentage: t('core.ProposalProcedure.governanceAction.technicalGroup.collateralPercentage'),
        tooltip: {
          a0: t('core.ProposalProcedure.governanceAction.technicalGroup.tooltip.a0'),
          eMax: t('core.ProposalProcedure.governanceAction.technicalGroup.tooltip.eMax'),
          nOpt: t('core.ProposalProcedure.governanceAction.technicalGroup.tooltip.nOpt'),
          costModels: t('core.ProposalProcedure.governanceAction.technicalGroup.tooltip.costModels'),
          collateralPercentage: t('core.ProposalProcedure.governanceAction.technicalGroup.tooltip.collateralPercentage')
        }
      },
      governanceGroup: {
        title: t('core.ProposalProcedure.governanceAction.governanceGroup.title'),
        govActionLifetime: t('core.ProposalProcedure.governanceAction.governanceGroup.govActionLifetime'),
        govActionDeposit: t('core.ProposalProcedure.governanceAction.governanceGroup.govActionDeposit'),
        drepDeposit: t('core.ProposalProcedure.governanceAction.governanceGroup.drepDeposit'),
        drepActivity: t('core.ProposalProcedure.governanceAction.governanceGroup.drepActivity'),
        ccMinSize: t('core.ProposalProcedure.governanceAction.governanceGroup.ccMinSize'),
        ccMaxTermLength: t('core.ProposalProcedure.governanceAction.governanceGroup.ccMaxTermLength'),
        dRepVotingThresholds: {
          title: t('core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.title'),
          motionNoConfidence: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.motionNoConfidence'
          ),
          committeeNormal: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.committeeNormal'
          ),
          committeeNoConfidence: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.committeeNoConfidence'
          ),
          updateConstitution: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.updateConstitution'
          ),
          hardForkInitiation: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.hardForkInitiation'
          ),
          ppNetworkGroup: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.ppNetworkGroup'
          ),
          ppEconomicGroup: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.ppEconomicGroup'
          ),
          ppTechnicalGroup: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.ppTechnicalGroup'
          ),
          ppGovernanceGroup: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.ppGovernanceGroup'
          ),
          treasuryWithdrawal: t(
            'core.ProposalProcedure.governanceAction.governanceGroup.dRepVotingThresholds.treasuryWithdrawal'
          )
        },
        tooltip: {
          govActionLifetime: t('core.ProposalProcedure.governanceAction.governanceGroup.tooltip.govActionLifetime'),
          govActionDeposit: t('core.ProposalProcedure.governanceAction.governanceGroup.tooltip.govActionDeposit'),
          drepDeposit: t('core.ProposalProcedure.governanceAction.governanceGroup.tooltip.drepDeposit'),
          drepActivity: t('core.ProposalProcedure.governanceAction.governanceGroup.tooltip.drepActivity'),
          ccMinSize: t('core.ProposalProcedure.governanceAction.governanceGroup.tooltip.ccMinSize'),
          ccMaxTermLength: t('core.ProposalProcedure.governanceAction.governanceGroup.tooltip.ccMaxTermLength'),
          dRepVotingThresholds: {
            title: t('core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.title'),
            motionNoConfidence: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.motionNoConfidence'
            ),
            committeeNormal: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.committeeNormal'
            ),
            committeeNoConfidence: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.committeeNoConfidence'
            ),
            updateConstitution: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.updateConstitution'
            ),
            hardForkInitiation: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.hardForkInitiation'
            ),
            ppNetworkGroup: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.ppNetworkGroup'
            ),
            ppEconomicGroup: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.ppEconomicGroup'
            ),
            ppTechnicalGroup: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.ppTechnicalGroup'
            ),
            ppGovernanceGroup: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.ppGovernanceGroup'
            ),
            treasuryWithdrawal: t(
              'core.ProposalProcedure.governanceAction.governanceGroup.tooltip.dRepVotingThresholds.treasuryWithdrawal'
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

  const data: Parameters<typeof ParameterChangeAction>[0]['data'] = {
    txDetails: {
      txType: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.title'),
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
        memory: maxExecutionUnitsPerTransaction.memory.toString(),
        step: maxExecutionUnitsPerTransaction.steps.toString()
      },
      maxBlockExUnits: {
        memory: maxExecutionUnitsPerBlock.memory.toString(),
        step: maxExecutionUnitsPerBlock.steps.toString()
      },
      networkGroup: {
        maxBBSize: maxBlockBodySize.toString(),
        maxTxSize: maxTxSize.toString(),
        maxBHSize: maxBlockHeaderSize.toString(),
        maxValSize: maxValueSize.toString(),
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
          motionNoConfidence: formatPercentages(motionNoConfidence.numerator / motionNoConfidence.denominator),
          committeeNormal: formatPercentages(committeeNormal.numerator / committeeNormal.denominator),
          committeeNoConfidence: formatPercentages(commiteeNoConfidence.numerator / commiteeNoConfidence.denominator),
          updateToConstitution: formatPercentages(updateConstitution.numerator / updateConstitution.denominator),
          hardForkInitiation: formatPercentages(hardForkInitiation.numerator / hardForkInitiation.denominator),
          ppNetworkGroup: formatPercentages(ppNetworkGroup.numerator / ppNetworkGroup.denominator),
          ppEconomicGroup: formatPercentages(ppEconomicGroup.numerator / ppEconomicGroup.denominator),
          ppTechnicalGroup: formatPercentages(ppTechnicalGroup.numerator / ppTechnicalGroup.denominator),
          ppGovGroup: formatPercentages(ppGovernanceGroup.numerator / ppGovernanceGroup.denominator),
          treasuryWithdrawal: formatPercentages(treasuryWithdrawal.numerator / treasuryWithdrawal.denominator)
        }
      }
    }
  };

  return (
    <ParameterChangeAction dappInfo={dappInfo} errorMessage={errorMessage} data={data} translations={translations} />
  );
};
