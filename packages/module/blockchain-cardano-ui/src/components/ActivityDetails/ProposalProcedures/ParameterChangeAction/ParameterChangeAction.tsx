import { useTranslation } from '@lace-contract/i18n';
import { Divider } from '@lace-lib/ui-toolkit';
import React from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';

import { EconomicGroup } from './EconomicGroup';
import { GovernanceGroup } from './GovernanceGroup';
import { NetworkGroup } from './NetworkGroup';
import { TechnicalGroup } from './TechnicalGroup';

import type * as Types from './types';

interface ParameterChangeActionProps {
  data: Types.Data;
}

export const ParameterChangeAction = ({
  data: {
    txDetails,
    protocolParamUpdate,
    procedure: { anchor },
  },
}: ParameterChangeActionProps): React.JSX.Element => {
  const { t } = useTranslation();
  const {
    economicGroup,
    governanceGroup,
    networkGroup,
    technicalGroup,
    maxTxExUnits,
    maxBlockExUnits,
  } = protocolParamUpdate;

  // TODO: consider encapsulating it inside the component itself, check if all the translations have the fallback to the parent int provider (LW-9920)

  const translations: Types.Translations = {
    txDetails: {
      title: t('v2.activity-details.sheet.ProposalProcedure.txDetails.title'),
      txType: t('v2.activity-details.sheet.ProposalProcedure.txDetails.txType'),
      deposit: t(
        'v2.activity-details.sheet.ProposalProcedure.txDetails.deposit',
      ),
      rewardAccount: t(
        'v2.activity-details.sheet.ProposalProcedure.txDetails.rewardAccount',
      ),
    },
    anchor: {
      url: t(
        'v2.activity-details.sheet.ProposalProcedure.procedure.anchor.url',
      ),
      hash: t(
        'v2.activity-details.sheet.ProposalProcedure.procedure.anchor.hash',
      ),
    },
    memory: t(
      'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.memory',
    ),
    step: t(
      'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.step',
    ),
    networkGroup: {
      title: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.title',
      ),
      maxBBSize: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxBBSize',
      ),
      maxTxSize: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxTxSize',
      ),
      maxBHSize: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxBHSize',
      ),
      maxValSize: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxValSize',
      ),
      maxTxExUnits: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxTxExUnits',
      ),
      maxBlockExUnits: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxBlockExUnits',
      ),
      maxCollateralInputs: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxCollateralInputs',
      ),
      tooltip: {
        maxBBSize: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxBBSize',
        ),
        maxTxSize: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxTxSize',
        ),
        maxBHSize: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxBHSize',
        ),
        maxValSize: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxValSize',
        ),
        maxTxExUnits: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxTxExUnits',
        ),
        maxBlockExUnits: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxBlockExUnits',
        ),
        maxCollateralInputs: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.tooltip.maxCollateralInputs',
        ),
      },
    },
    economicGroup: {
      title: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.title',
      ),
      minFeeA: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.minFeeA',
      ),
      minFeeB: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.minFeeB',
      ),
      keyDeposit: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.keyDeposit',
      ),
      poolDeposit: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.poolDeposit',
      ),
      rho: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.rho',
      ),
      tau: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tau',
      ),
      minPoolCost: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.minPoolCost',
      ),
      coinsPerUTxOByte: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.coinsPerUTxOByte',
      ),
      prices: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.prices',
      ),
      tooltip: {
        minFeeA: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minFeeA',
        ),
        minFeeB: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minFeeB',
        ),
        keyDeposit: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.keyDeposit',
        ),
        poolDeposit: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.poolDeposit',
        ),
        rho: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.rho',
        ),
        tau: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.tau',
        ),
        minPoolCost: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minPoolCost',
        ),
        coinsPerUTxOByte: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.coinsPerUTxOByte',
        ),
        prices: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.prices',
        ),
      },
    },
    technicalGroup: {
      title: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.title',
      ),
      a0: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.a0',
      ),
      eMax: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.eMax',
      ),
      nOpt: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.nOpt',
      ),
      costModels: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.costModels',
      ),
      collateralPercentage: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.collateralPercentage',
      ),
      tooltip: {
        a0: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.a0',
        ),
        eMax: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.eMax',
        ),
        nOpt: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.nOpt',
        ),
        costModels: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.costModels',
        ),
        collateralPercentage: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.collateralPercentage',
        ),
      },
    },
    governanceGroup: {
      title: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.title',
      ),
      govActionLifetime: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.govActionLifetime',
      ),
      govActionDeposit: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.govActionDeposit',
      ),
      drepDeposit: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.drepDeposit',
      ),
      drepActivity: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.drepActivity',
      ),
      ccMinSize: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.ccMinSize',
      ),
      ccMaxTermLength: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.ccMaxTermLength',
      ),
      dRepVotingThresholds: {
        title: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.title',
        ),
        motionNoConfidence: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.motionNoConfidence',
        ),
        committeeNormal: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.committeeNormal',
        ),
        committeeNoConfidence: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.committeeNoConfidence',
        ),
        updateConstitution: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.updateConstitution',
        ),
        hardForkInitiation: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.hardForkInitiation',
        ),
        ppNetworkGroup: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppNetworkGroup',
        ),
        ppEconomicGroup: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppEconomicGroup',
        ),
        ppTechnicalGroup: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppTechnicalGroup',
        ),
        ppGovernanceGroup: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppGovernanceGroup',
        ),
        treasuryWithdrawal: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.treasuryWithdrawal',
        ),
      },
      tooltip: {
        govActionLifetime: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.govActionLifetime',
        ),
        govActionDeposit: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.govActionDeposit',
        ),
        drepDeposit: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.drepDeposit',
        ),
        drepActivity: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.drepActivity',
        ),
        ccMinSize: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.ccMinSize',
        ),
        ccMaxTermLength: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.ccMaxTermLength',
        ),
        dRepVotingThresholds: {
          title: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.title',
          ),
          motionNoConfidence: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.motionNoConfidence',
          ),
          committeeNormal: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.committeeNormal',
          ),
          committeeNoConfidence: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.committeeNoConfidence',
          ),
          updateConstitution: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.updateConstitution',
          ),
          hardForkInitiation: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.hardForkInitiation',
          ),
          ppNetworkGroup: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.ppNetworkGroup',
          ),
          ppEconomicGroup: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.ppEconomicGroup',
          ),
          ppTechnicalGroup: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.ppTechnicalGroup',
          ),
          ppGovernanceGroup: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.ppGovernanceGroup',
          ),
          treasuryWithdrawal: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.treasuryWithdrawal',
          ),
        },
      },
    },
  };

  return (
    <>
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.title',
        )}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      <ActivityDetailItem
        label={translations.anchor.hash}
        value={anchor.hash}
      />
      <ActivityDetailItem label={translations.anchor.url} value={anchor.url} />
      <ActivityDetailItem label={translations.networkGroup.maxTxExUnits} />
      <ActivityDetailItem
        label={translations.memory}
        value={maxTxExUnits?.memory}
      />
      <ActivityDetailItem
        label={translations.step}
        value={maxTxExUnits?.step}
      />
      <ActivityDetailItem label={translations.networkGroup.maxBlockExUnits} />
      <ActivityDetailItem
        label={translations.memory}
        value={maxBlockExUnits?.memory}
      />
      <ActivityDetailItem
        label={translations.step}
        value={maxBlockExUnits?.step}
      />
      <NetworkGroup
        networkGroup={networkGroup}
        translations={translations.networkGroup}
      />
      <EconomicGroup
        economicGroup={economicGroup}
        translations={{
          ...translations.economicGroup,
          memory: translations.memory,
          step: translations.step,
        }}
      />
      <TechnicalGroup
        technicalGroup={technicalGroup}
        translations={translations.technicalGroup}
      />
      <GovernanceGroup
        governanceGroup={governanceGroup}
        translations={translations.governanceGroup}
      />
      <Divider />
    </>
  );
};
