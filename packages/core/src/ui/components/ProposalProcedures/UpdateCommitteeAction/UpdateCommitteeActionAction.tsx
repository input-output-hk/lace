import React from 'react';
import { Grid, Divider, sx, Text, Metadata, Cell } from '@lace/ui';
import * as Types from './UpdateCommitteeActionTypes';
import { Procedure } from '../components/Procedure';
import { ProposalProcedureTransactionDetails } from '../components/ProposalProcedureTransactionDetails';
import { ActionId } from '../components/ActionId';
import { useTranslation } from 'react-i18next';

interface UpdateCommitteeActionProps {
  data: Types.Data;
}

export const UpdateCommitteeAction = ({
  data: { procedure, txDetails, membersToBeAdded, membersToBeRemoved, actionId }
}: UpdateCommitteeActionProps): JSX.Element => {
  const { t } = useTranslation();
  const textCss = sx({
    color: '$text_primary'
  });

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
    actionId: {
      title: t('core.ProposalProcedure.governanceAction.actionId.title'),
      index: t('core.ProposalProcedure.governanceAction.actionId.index'),
      txId: t('core.ProposalProcedure.governanceAction.actionId.txId')
    },
    membersToBeAdded: {
      title: t('core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.title'),
      coldCredential: {
        hash: t('core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.coldCredential.hash'),
        epoch: t('core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.coldCredential.epoch')
      }
    },
    membersToBeRemoved: {
      title: t('core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeRemoved.title'),
      hash: t('core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeRemoved.hash')
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      {/* tx details section */}
      <ProposalProcedureTransactionDetails
        translations={translations.txDetails}
        txTitle={t('core.ProposalProcedure.governanceAction.updateCommitteeAction.title')}
        deposit={txDetails.deposit}
        rewardAccount={txDetails.rewardAccount}
      />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {membersToBeAdded.length > 0 && (
        <>
          <Cell>
            <Text.Body.Large className={textCss} weight="$bold">
              {translations.membersToBeAdded.title}
            </Text.Body.Large>
          </Cell>
          {membersToBeAdded.map(({ coldCredential, epoch }) => (
            <React.Fragment key={`${coldCredential.hash}${epoch}`}>
              <Cell>
                <Metadata label={translations.membersToBeAdded.coldCredential.hash} text={coldCredential.hash} />
              </Cell>
              <Cell>
                <Metadata label={translations.membersToBeAdded.coldCredential.epoch} text={epoch} />
              </Cell>
            </React.Fragment>
          ))}
        </>
      )}
      {membersToBeRemoved.length > 0 && (
        <>
          <Cell>
            <Text.Body.Large className={textCss} weight="$bold">
              {translations.membersToBeRemoved.title}
            </Text.Body.Large>
          </Cell>
          {membersToBeRemoved.map(({ hash }) => (
            <React.Fragment key={hash}>
              <Cell>
                <Metadata label={translations.membersToBeRemoved.hash} text={hash} />
              </Cell>
              <Cell>
                <Metadata label={translations.membersToBeAdded.coldCredential.epoch} text={hash} />
              </Cell>
            </React.Fragment>
          ))}
        </>
      )}
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
