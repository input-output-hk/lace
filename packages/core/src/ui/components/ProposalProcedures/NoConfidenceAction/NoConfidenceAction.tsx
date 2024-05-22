import React, { useMemo } from 'react';
import { Grid, Divider, Cell } from '@lace/ui';
import * as Types from './NoConfidenceActionTypes';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';
import { Procedure } from '../components/Procedure';
import { ActionId } from '../components/ActionId';
import { useTranslation } from 'react-i18next';

export interface NoConfidenceActionProps {
  data: Types.Data;
}

export const NoConfidenceAction = ({
  data: { procedure, txDetails, actionId }
}: NoConfidenceActionProps): JSX.Element => {
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
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t('core.ProposalProcedure.governanceAction.noConfidenceAction.title')}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
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
