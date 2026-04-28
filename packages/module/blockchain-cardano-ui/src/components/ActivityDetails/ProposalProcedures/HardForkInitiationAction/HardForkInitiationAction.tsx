import { useTranslation } from '@lace-contract/i18n';
import { Divider } from '@lace-lib/ui-toolkit';
import React from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';
import { ActionId } from '../components/ActionId';
import { Procedure } from '../components/Procedure';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';

import type * as Types from './types';
import type { TranslationsWithDepositAndRewardAccount } from '../components/ProposalProcedureTransactionDetailsTypes';

export interface HardForkInitiationActionProps {
  data: Types.Data;
}

export const HardForkInitiationAction = ({
  data: { procedure, txDetails, actionId, protocolVersion },
}: HardForkInitiationActionProps): React.JSX.Element => {
  const { t } = useTranslation();
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
    protocolVersion: {
      major: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.hardForkInitiation.protocolVersion.major',
      ),
      minor: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.hardForkInitiation.protocolVersion.minor',
      ),
      patch: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.hardForkInitiation.protocolVersion.patch',
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
  };

  return (
    <>
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={
          translations.txDetails as TranslationsWithDepositAndRewardAccount
        }
        txTitle={t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.hardForkInitiation.title',
        )}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      <ActivityDetailItem
        label={translations.protocolVersion.major}
        value={protocolVersion.major}
      />
      <ActivityDetailItem
        label={translations.protocolVersion.minor}
        value={protocolVersion.minor}
      />
      {protocolVersion.patch && (
        <ActivityDetailItem
          label={translations.protocolVersion.patch}
          value={protocolVersion.patch}
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
