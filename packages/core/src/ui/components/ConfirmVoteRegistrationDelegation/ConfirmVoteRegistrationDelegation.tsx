import React from 'react';
import { Cell, Grid, TransactionSummary } from '@lace/ui';
import { useTranslation } from 'react-i18next';

interface Props {
  metadata: {
    drepId?: string;
    alwaysAbstain: boolean;
    alwaysNoConfidence: boolean;
    stakeKeyHash: string;
    depositPaid: string;
  };
}

export const ConfirmVoteRegistrationDelegation = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();
  const translations = {
    option: t('core.VoteRegistrationDelegation.option'),
    labels: {
      drepId: t('core.VoteRegistrationDelegation.drepId'),
      alwaysAbstain: t('core.VoteRegistrationDelegation.alwaysAbstain'),
      alwaysNoConfidence: t('core.VoteRegistrationDelegation.alwaysNoConfidence'),
      depositPaid: t('core.VoteRegistrationDelegation.depositPaid'),
      stakeKeyHash: t('core.VoteRegistrationDelegation.stakeKeyHash')
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.VoteRegistrationDelegateCertificate')}
          testID="metadata-cetificateType"
        />
      </Cell>
      {metadata.drepId && (
        <Cell>
          <TransactionSummary.Address label={translations.labels.drepId} address={metadata.drepId} />
        </Cell>
      )}
      {metadata.alwaysAbstain && (
        <Cell>
          <TransactionSummary.Address label={translations.labels.alwaysAbstain} address={translations.option} />
        </Cell>
      )}
      {metadata.alwaysNoConfidence && (
        <Cell>
          <TransactionSummary.Address label={translations.labels.alwaysNoConfidence} address={translations.option} />
        </Cell>
      )}
      <Cell>
        <TransactionSummary.Address label={translations.labels.stakeKeyHash} address={metadata.stakeKeyHash} />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={translations.labels.depositPaid} address={metadata.depositPaid} />
      </Cell>
    </Grid>
  );
};
