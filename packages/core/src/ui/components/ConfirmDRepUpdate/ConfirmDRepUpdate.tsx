import React from 'react';
import { Cell, Grid, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

interface Props {
  metadata: {
    url?: string;
    hash?: string;
    drepId: string;
  };
}

export const ConfirmDRepUpdate = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();

  const translations = {
    metadata: t('core.DRepUpdate.metadata'),
    labels: {
      drepId: t('core.DRepUpdate.drepId'),
      hash: t('core.DRepUpdate.hash'),
      url: t('core.DRepUpdate.url')
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.UpdateDelegateRepresentativeCertificate')}
          testID="metadata-cetificateType"
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
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.drepId}
          address={metadata.drepId}
          testID="metadata-DRepID"
        />
      </Cell>
    </Grid>
  );
};
