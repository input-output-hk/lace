import { useTranslation } from '@lace-contract/i18n';
import { Divider } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';
import { ActionId } from '../components/ActionId';
import { Procedure } from '../components/Procedure';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';

import type * as Types from './types';

export interface NewConstitutionActionProps {
  data: Types.Data;
}

export const NewConstitutionAction = ({
  data: { txDetails, procedure, constitution, actionId },
}: NewConstitutionActionProps): React.JSX.Element => {
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
      },
      constitution: {
        title: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.newConstitutionAction.constitution.title',
        ),
        anchor: {
          dataHash: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.newConstitutionAction.constitution.anchor.dataHash',
          ),
          url: t(
            'v2.activity-details.sheet.ProposalProcedure.governanceAction.newConstitutionAction.constitution.anchor.url',
          ),
        },
        scriptHash: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.newConstitutionAction.constitution.scriptHash',
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
      {/* txDetails section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.newConstitutionAction.title',
        )}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      <ActivityDetailItem
        label={translations.constitution.anchor.url}
        value={constitution.anchor.url}
      />
      {constitution.scriptHash && (
        <ActivityDetailItem
          label={translations.constitution.scriptHash}
          value={constitution.scriptHash}
        />
      )}
      {/* action id section*/}
      {actionId && translations.actionId && (
        <ActionId translations={translations.actionId} data={actionId} />
      )}
      <Divider />
    </>
  );
};
