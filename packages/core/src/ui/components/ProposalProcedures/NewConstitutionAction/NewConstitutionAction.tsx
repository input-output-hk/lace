import React, { useMemo } from 'react';
import { Grid, Divider, Metadata, MetadataLink, Cell } from '@input-output-hk/lace-ui-toolkit';
import * as Types from './NewConstitutionActionTypes';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';
import { Procedure } from '../components/Procedure';
import { ActionId } from '../components/ActionId';
import { useTranslation } from 'react-i18next';
export interface NewConstitutionActionProps {
  data: Types.Data;
}

export const NewConstitutionAction = ({
  data: { txDetails, procedure, constitution, actionId }
}: NewConstitutionActionProps): JSX.Element => {
  const { t } = useTranslation();
  const translations = useMemo<Types.Translations>(
    () => ({
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
      constitution: {
        title: t('core.ProposalProcedure.governanceAction.newConstitutionAction.constitution.title'),
        anchor: {
          dataHash: t('core.ProposalProcedure.governanceAction.newConstitutionAction.constitution.anchor.dataHash'),
          url: t('core.ProposalProcedure.governanceAction.newConstitutionAction.constitution.anchor.url')
        },
        scriptHash: t('core.ProposalProcedure.governanceAction.newConstitutionAction.constitution.scriptHash')
      },
      actionId: {
        title: t('core.ProposalProcedure.governanceAction.actionId.title'),
        index: t('core.ProposalProcedure.governanceAction.actionId.index'),
        txId: t('core.ProposalProcedure.governanceAction.actionId.txId')
      }
    }),
    [t]
  );

  return (
    <Grid columns="$1" gutters="$20">
      {/* txDetails section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t('core.ProposalProcedure.governanceAction.newConstitutionAction.title')}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      <Cell>
        <MetadataLink
          label={translations.constitution.anchor.url}
          text={constitution.anchor.url}
          url={constitution.anchor.url}
        />
      </Cell>
      {constitution.scriptHash && (
        <Cell>
          <Metadata label={translations.constitution.scriptHash} text={constitution.scriptHash} />
        </Cell>
      )}
      {/* action id section*/}
      {actionId && (
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
