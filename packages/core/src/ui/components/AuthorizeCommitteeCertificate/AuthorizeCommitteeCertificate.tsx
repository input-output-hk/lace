import React from 'react';
import { Cell, Grid, TransactionSummary } from '@lace/ui';
import { useTranslation } from 'react-i18next';

interface Translations {
  labels: {
    hotCredential: string;
    coldCredential: string;
  };
}
interface Props {
  metadata: {
    hotCredential: string;
    coldCredential: string;
  };
}

export const AuthorizeCommitteeCertificate = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();

  const translations: Translations = {
    labels: {
      hotCredential: t('core.activityDetails.certificateTitles.hotCredential'),
      coldCredential: t('core.activityDetails.certificateTitles.coldCredential')
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.AuthorizeCommitteeHotCertificate')}
          testID="metadata-cetificateType"
        />
      </Cell>
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.hotCredential}
          address={metadata.hotCredential}
          testID="metadata-hotCredential"
        />
      </Cell>
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.coldCredential}
          address={metadata.coldCredential}
          testID="metadata-coldCredential"
        />
      </Cell>
    </Grid>
  );
};
