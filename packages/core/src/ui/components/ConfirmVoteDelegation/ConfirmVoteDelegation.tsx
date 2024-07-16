import React from 'react';
import { Cell, Grid, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

interface Props {
  metadata: {
    drepId?: string;
    alwaysAbstain: boolean;
    alwaysNoConfidence: boolean;
  };
}

export const ConfirmVoteDelegation = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();
  const translations = {
    metadata: t('core.VoteDelegation.metadata'),
    option: t('core.VoteDelegation.option'),
    labels: {
      drepId: t('core.VoteDelegation.drepId'),
      alwaysAbstain: t('core.VoteDelegation.alwaysAbstain'),
      alwaysNoConfidence: t('core.VoteDelegation.alwaysNoConfidence')
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.VoteDelegationCertificate')}
          testID="metadata-cetificateType"
        />
      </Cell>
      {metadata.drepId && (
        <Cell>
          <TransactionSummary.Address
            label={translations.labels.drepId}
            address={metadata.drepId}
            testID="metadata-DRepID"
          />
        </Cell>
      )}
      {metadata.alwaysAbstain && (
        <Cell>
          <TransactionSummary.Address
            label={translations.labels.alwaysAbstain}
            address={translations.option}
            testID="metadata-alwaysAbstain"
          />
        </Cell>
      )}
      {metadata.alwaysNoConfidence && (
        <Cell>
          <TransactionSummary.Address
            label={translations.labels.alwaysNoConfidence}
            address={translations.option}
            testID="metadata-alwaysNoCOnfidence"
          />
        </Cell>
      )}
    </Grid>
  );
};
