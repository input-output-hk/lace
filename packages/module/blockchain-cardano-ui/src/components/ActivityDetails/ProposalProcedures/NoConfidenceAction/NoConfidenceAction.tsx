import { useTranslation } from '@lace-contract/i18n';
import { Divider } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { ActionId } from '../components/ActionId';
import { Procedure } from '../components/Procedure';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';

import type * as Types from './types';

export interface NoConfidenceActionProps {
  data: Types.Data;
}

export const NoConfidenceAction = ({
  data: { procedure, txDetails, actionId },
}: NoConfidenceActionProps): React.JSX.Element => {
  const { t } = useTranslation();

  const translations = useMemo<Types.Translations>(
    () => ({
      txDetails: {
        title: t('v2.activity-details.sheet.ProposalProcedure.txDetails.title'),
        txType: t(
          'v2.activity-details.sheet.ProposalProcedure.txDetails.txType',
        ),
        deposit: t(
          'v2.activity-details.sheet.ProposalProcedure.txDetails.deposit',
        ),
        rewardAccount: t(
          'v2.activity-details.sheet.ProposalProcedure.txDetails.rewardAccount',
        ),
        anchor: {
          url: t(
            'v2.activity-details.sheet.ProposalProcedure.procedure.anchor.url',
          ),
          hash: t(
            'v2.activity-details.sheet.ProposalProcedure.procedure.anchor.hash',
          ),
        },
      },
      procedure: {
        title: t('v2.activity-details.sheet.ProposalProcedure.procedure.title'),
        anchor: {
          url: t(
            'v2.activity-details.sheet.ProposalProcedure.procedure.anchor.url',
          ),
          hash: t(
            'v2.activity-details.sheet.ProposalProcedure.procedure.anchor.hash',
          ),
        },
        txType: t(
          'v2.activity-details.sheet.ProposalProcedure.txDetails.txType',
        ),
      },
      actionId: {
        title: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.actionId.title',
        ),
        index: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.actionId.index',
        ),
        txId: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.actionId.txId',
        ),
      },
    }),
    [t],
  );

  return (
    <>
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.noConfidenceAction.title',
        )}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      {/* action id section*/}
      {actionId && translations.actionId && (
        <ActionId translations={translations.actionId} data={actionId} />
      )}
      <Divider />
    </>
  );
};
