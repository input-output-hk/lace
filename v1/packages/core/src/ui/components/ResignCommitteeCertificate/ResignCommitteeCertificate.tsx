import React from 'react';
import { Cell, Grid, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

interface Translations {
  labels: {
    url: string;
    hash: string;
    coldCredential: string;
  };
}
interface Props {
  metadata: {
    coldCredential: string;
    hash?: string;
    url?: string;
  };
}

export const ResignCommitteeCertificate = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();

  const translations: Translations = {
    labels: {
      coldCredential: t('core.activityDetails.certificateTitles.coldCredential'),
      hash: t('core.DRepRegistration.hash'),
      url: t('core.DRepRegistration.url')
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.ResignCommitteeColdCertificate')}
          testID="metadata-cetificateType"
        />
      </Cell>
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.coldCredential}
          address={metadata.coldCredential}
          testID="metadata-coldCredential"
        />
      </Cell>
      {metadata.url && (
        <Cell>
          <TransactionSummary.Address label={translations.labels.url} address={metadata.url} testID="metadata-url" />
        </Cell>
      )}
      {metadata.hash && (
        <Cell>
          <TransactionSummary.Address label={translations.labels.hash} address={metadata.hash} testID="metadata-hash" />
        </Cell>
      )}
    </Grid>
  );
};
