import React from 'react';
import { Box, Grid, Divider, Metadata, MetadataLink, Cell } from '@lace/ui';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';
import * as Types from './ParameterChangeActionTypes';
import { EconomicGroup } from './EconomicGroup';
import { NetworkGroup } from './NetworkGroup';
import { TechnicalGroup } from './TechnicalGroup';
import { GovernanceGroup } from './GovernanceGroup';
import { Card } from '../components/Card';
import { useTranslation } from 'react-i18next';

interface ParameterChangeActionProps {
  data: Types.Data;
}

export const ParameterChangeAction = ({
  data: { txDetails, protocolParamUpdate, anchor }
}: ParameterChangeActionProps): JSX.Element => {
  const { t } = useTranslation();
  const { economicGroup, governanceGroup, networkGroup, technicalGroup, maxTxExUnits, maxBlockExUnits } =
    protocolParamUpdate;

  // TODO: consider encapsulating it inside the component itself, check if all the translations have the fallback to the parent int provider (LW-9920)

  const translations: Types.Translations = {
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
      coinsPerUTxOByte: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.coinsPerUTxOByte'),
      prices: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.prices'),
      tooltip: {
        minFeeA: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minFeeA'),
        minFeeB: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minFeeB'),
        keyDeposit: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.keyDeposit'),
        poolDeposit: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.poolDeposit'),
        rho: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.rho'),
        tau: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.tau'),
        minPoolCost: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.minPoolCost'),
        coinsPerUTxOByte: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.coinsPerUTxOByte'
        ),
        prices: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tooltip.prices')
      }
    },
    technicalGroup: {
      title: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.title'),
      a0: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.a0'),
      eMax: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.eMax'),
      nOpt: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.nOpt'),
      costModels: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.costModels'),
      collateralPercentage: t(
        'core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.collateralPercentage'
      ),
      tooltip: {
        a0: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.a0'),
        eMax: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.eMax'),
        nOpt: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.nOpt'),
        costModels: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.costModels'),
        collateralPercentage: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.tooltip.collateralPercentage'
        )
      }
    },
    governanceGroup: {
      title: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.title'),
      govActionLifetime: t(
        'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.govActionLifetime'
      ),
      govActionDeposit: t(
        'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.govActionDeposit'
      ),
      drepDeposit: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.drepDeposit'),
      drepActivity: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.drepActivity'),
      ccMinSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.ccMinSize'),
      ccMaxTermLength: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.ccMaxTermLength'),
      dRepVotingThresholds: {
        title: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.title'
        ),
        motionNoConfidence: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.motionNoConfidence'
        ),
        committeeNormal: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.committeeNormal'
        ),
        committeeNoConfidence: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.committeeNoConfidence'
        ),
        updateConstitution: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.updateConstitution'
        ),
        hardForkInitiation: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.hardForkInitiation'
        ),
        ppNetworkGroup: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppNetworkGroup'
        ),
        ppEconomicGroup: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppEconomicGroup'
        ),
        ppTechnicalGroup: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppTechnicalGroup'
        ),
        ppGovernanceGroup: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppGovernanceGroup'
        ),
        treasuryWithdrawal: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.treasuryWithdrawal'
        )
      },
      tooltip: {
        govActionLifetime: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.govActionLifetime'
        ),
        govActionDeposit: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.govActionDeposit'
        ),
        drepDeposit: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.drepDeposit'
        ),
        drepActivity: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.drepActivity'
        ),
        ccMinSize: t('core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.ccMinSize'),
        ccMaxTermLength: t(
          'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.ccMaxTermLength'
        ),
        dRepVotingThresholds: {
          title: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.title'
          ),
          motionNoConfidence: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.motionNoConfidence'
          ),
          committeeNormal: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.committeeNormal'
          ),
          committeeNoConfidence: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.committeeNoConfidence'
          ),
          updateConstitution: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.updateConstitution'
          ),
          hardForkInitiation: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.hardForkInitiation'
          ),
          ppNetworkGroup: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.ppNetworkGroup'
          ),
          ppEconomicGroup: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.ppEconomicGroup'
          ),
          ppTechnicalGroup: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.ppTechnicalGroup'
          ),
          ppGovernanceGroup: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.ppGovernanceGroup'
          ),
          treasuryWithdrawal: t(
            'core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.tooltip.dRepVotingThresholds.treasuryWithdrawal'
          )
        }
      }
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t('core.ProposalProcedure.governanceAction.protocolParamUpdate.title')}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      <>
        <Cell>
          <Metadata label={translations.anchor.hash} text={anchor.hash} />
        </Cell>
        <Cell>
          {anchor.txHashUrl ? (
            <MetadataLink label={translations.anchor.url} text={anchor.url} url={anchor.txHashUrl} />
          ) : (
            <Metadata label={translations.anchor.url} text={anchor.url} />
          )}
        </Cell>
      </>
      <Cell>
        <Box>
          <Card
            title={translations.networkGroup.maxTxExUnits}
            data={[
              { label: translations.memory, value: maxTxExUnits.memory },
              { label: translations.step, value: maxTxExUnits.step }
            ]}
          />
        </Box>
        <Box mb={'$18'}>
          <Card
            title={translations.networkGroup.maxBlockExUnits}
            data={[
              { label: translations.memory, value: maxBlockExUnits.memory },
              { label: translations.step, value: maxBlockExUnits.step }
            ]}
          />
        </Box>
      </Cell>
      <NetworkGroup networkGroup={networkGroup} translations={translations.networkGroup} />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      <EconomicGroup
        economicGroup={economicGroup}
        translations={{
          ...translations.economicGroup,
          memory: translations.memory,
          step: translations.step
        }}
      />
      <TechnicalGroup technicalGroup={technicalGroup} translations={translations.technicalGroup} />
      <GovernanceGroup governanceGroup={governanceGroup} translations={translations.governanceGroup} />
    </Grid>
  );
};
