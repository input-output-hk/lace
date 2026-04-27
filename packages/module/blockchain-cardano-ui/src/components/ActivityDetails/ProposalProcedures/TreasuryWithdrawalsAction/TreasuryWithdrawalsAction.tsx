import { useTranslation } from '@lace-contract/i18n';
import { Divider } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';
import { ActionId } from '../components/ActionId';
import { Procedure } from '../components/Procedure';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';

import type * as Types from './types';

interface TreasuryWithdrawalsActionProps {
  data: Types.Data;
}

export const TreasuryWithdrawalsAction = ({
  data: { txDetails, procedure, withdrawals, actionId },
}: TreasuryWithdrawalsActionProps): React.JSX.Element => {
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
      withdrawals: {
        title: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.treasuryWithdrawals.title',
        ),
        rewardAccount: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.treasuryWithdrawals.withdrawals.rewardAccount',
        ),
        lovelace: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.treasuryWithdrawals.withdrawals.lovelace',
        ),
      },
    }),
    [t],
  );

  return (
    <React.Fragment key="treasuryWithdrawals">
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.treasuryWithdrawals.title',
        )}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />

      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      <ActivityDetailItem
        key="withdrawals"
        label={translations.withdrawals.title}
      />
      {withdrawals.map(withdrawal => (
        <React.Fragment
          key={`${withdrawal.rewardAccount}${withdrawal.lovelace}`}>
          <ActivityDetailItem
            label={translations.withdrawals.rewardAccount}
            value={withdrawal.rewardAccount}
          />
          <ActivityDetailItem
            label={translations.withdrawals.lovelace}
            value={withdrawal.lovelace}
          />
        </React.Fragment>
      ))}
      {actionId && translations.actionId && (
        <ActionId translations={translations.actionId} data={actionId} />
      )}
      <Divider />
    </React.Fragment>
  );
};
