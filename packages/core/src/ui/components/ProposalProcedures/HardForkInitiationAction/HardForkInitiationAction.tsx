import React from 'react';
import { Grid, Divider, Metadata, Cell } from '@input-output-hk/lace-ui-toolkit';
import * as Types from './HardForkInitiationActionTypes';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';
import { Procedure } from '../components/Procedure';
import { ActionId } from '../components/ActionId';
import { useTranslation } from 'react-i18next';
import { TranslationsWithDepositAndRewardAccount } from '../components/ProposalProcedureTransactionDetailsTypes';

export interface HardForkInitiationActionProps {
  data: Types.Data;
}

export const HardForkInitiationAction = ({
  data: { procedure, txDetails, actionId, protocolVersion }
}: HardForkInitiationActionProps): JSX.Element => {
  const { t } = useTranslation();
  const translations: Types.Translations = {
    txDetails: {
      title: t('core.ProposalProcedure.txDetails.title'),
      txType: t('core.ProposalProcedure.txDetails.txType'),
      deposit: t('core.ProposalProcedure.txDetails.deposit'),
      rewardAccount: t('core.ProposalProcedure.txDetails.rewardAccount')
    },
    procedure: {
      title: t('core.ProposalProcedure.procedure.title'),
      anchor: {
        url: t('core.ProposalProcedure.procedure.anchor.url'),
        hash: t('core.ProposalProcedure.procedure.anchor.hash')
      }
    },
    protocolVersion: {
      major: t('core.ProposalProcedure.governanceAction.hardForkInitiation.protocolVersion.major'),
      minor: t('core.ProposalProcedure.governanceAction.hardForkInitiation.protocolVersion.minor'),
      patch: t('core.ProposalProcedure.governanceAction.hardForkInitiation.protocolVersion.patch')
    },
    actionId: {
      title: t('core.ProposalProcedure.governanceAction.actionId.title'),
      index: t('core.ProposalProcedure.governanceAction.actionId.index'),
      txId: t('core.ProposalProcedure.governanceAction.actionId.txId')
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails as TranslationsWithDepositAndRewardAccount}
        txTitle={t('core.ProposalProcedure.governanceAction.hardForkInitiation.title')}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      <Cell>
        <Metadata label={translations.protocolVersion.major} text={protocolVersion.major} />
      </Cell>
      <Cell>
        <Metadata label={translations.protocolVersion.minor} text={protocolVersion.minor} />
      </Cell>
      {protocolVersion.patch && (
        <Cell>
          <Metadata label={translations.protocolVersion.patch} text={protocolVersion.patch} />
        </Cell>
      )}
      {/* action id section*/}
      {actionId && translations.actionId && (
        <>
          <Cell>
            <Divider my={'$16'} />
          </Cell>
          <ActionId translations={translations.actionId} data={actionId} />
        </>
      )}
    </Grid>
  );
};
