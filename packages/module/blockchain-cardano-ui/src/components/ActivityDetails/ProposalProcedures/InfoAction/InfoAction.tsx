import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';

import { Procedure } from '../components/Procedure';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';

import type * as Types from './types';
import type { TranslationsWithDepositAndRewardAccount } from '../components/ProposalProcedureTransactionDetailsTypes';

export interface InfoActionProps {
  data: Types.Data;
}

export const InfoAction = ({
  data: { procedure, txDetails },
}: InfoActionProps): React.JSX.Element => {
  const { t } = useTranslation();
  const translations = useMemo<Types.Translations>(
    () => ({
      txDetails: {
        title: t('v2.activity-details.sheet.ProposalProcedure.txDetails.title'),
        txType: t(
          'v2.activity-details.sheet.ProposalProcedure.txDetails.txType',
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
    }),
    [t],
  );
  return (
    <>
      <ProposalProcedureTransactionDetails
        translations={
          translations.txDetails as TranslationsWithDepositAndRewardAccount
        }
        txTitle={t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.infoAction.title',
        )}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
    </>
  );
};
