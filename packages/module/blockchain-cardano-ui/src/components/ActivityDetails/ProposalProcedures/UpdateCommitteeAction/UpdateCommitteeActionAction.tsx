import { useTranslation } from '@lace-contract/i18n';
import { Divider } from '@lace-lib/ui-toolkit';
import React from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';
import { ActionId } from '../components/ActionId';
import { Procedure } from '../components/Procedure';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';

import type * as Types from './types';

interface UpdateCommitteeActionProps {
  data: Types.Data;
}

export const UpdateCommitteeAction = ({
  data: {
    procedure,
    txDetails,
    membersToBeAdded,
    membersToBeRemoved,
    actionId,
  },
}: UpdateCommitteeActionProps): React.JSX.Element => {
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
    membersToBeAdded: {
      title: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.title',
      ),
      coldCredential: {
        hash: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.coldCredential.hash',
        ),
        epoch: t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.coldCredential.epoch',
        ),
      },
    },
    membersToBeRemoved: {
      title: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeRemoved.title',
      ),
      hash: t(
        'v2.activity-details.sheet.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeRemoved.hash',
      ),
    },
  };

  return (
    <>
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t(
          'v2.activity-details.sheet.ProposalProcedure.governanceAction.updateCommitteeAction.title',
        )}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      {membersToBeAdded.length > 0 && (
        <>
          <ActivityDetailItem label={translations.membersToBeAdded.title} />
          {membersToBeAdded.map(({ coldCredential, epoch }) => (
            <React.Fragment key={`${coldCredential.hash}${epoch}`}>
              <ActivityDetailItem
                label={translations.membersToBeAdded.coldCredential.hash}
                value={coldCredential.hash}
              />
              <ActivityDetailItem
                label={translations.membersToBeAdded.coldCredential.epoch}
                value={epoch}
              />
            </React.Fragment>
          ))}
        </>
      )}
      {membersToBeRemoved.length > 0 && (
        <>
          <ActivityDetailItem label={translations.membersToBeRemoved.title} />
          {membersToBeRemoved.map(({ hash }) => (
            <ActivityDetailItem
              key={hash}
              label={translations.membersToBeRemoved.hash}
              value={hash}
            />
          ))}
        </>
      )}
      {actionId && translations.actionId && (
        <ActionId translations={translations.actionId} data={actionId} />
      )}
      <Divider />
    </>
  );
};
