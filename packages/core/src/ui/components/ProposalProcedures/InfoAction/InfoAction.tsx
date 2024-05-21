import React, { useMemo } from 'react';
import { Grid, Divider, Cell } from '@lace/ui';
import * as Types from './InfoActionTypes';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';
import { Procedure } from '../components/Procedure';
import { useTranslation } from 'react-i18next';

export interface InfoActionProps {
  data: Types.Data;
}

export const InfoAction = ({ data: { procedure, txDetails } }: InfoActionProps): JSX.Element => {
  const { t } = useTranslation();
  const translations = useMemo<Types.Translations>(
    () => ({
      txDetails: {
        title: t('core.ProposalProcedure.txDetails.title'),
        txType: t('core.ProposalProcedure.txDetails.txType')
      },
      procedure: {
        title: t('core.ProposalProcedure.procedure.title'),
        anchor: {
          url: t('core.ProposalProcedure.procedure.anchor.url'),
          hash: t('core.ProposalProcedure.procedure.anchor.hash')
        }
      }
    }),
    [t]
  );
  return (
    <Grid columns="$1" gutters="$20">
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t('core.ProposalProcedure.governanceAction.infoAction.title')}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
    </Grid>
  );
};
