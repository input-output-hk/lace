import React from 'react';
import { Cell, Grid, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

interface Translations {
  labels: {
    url: string;
    hash: string;
    drepId: string;
    depositPaid: string;
  };
}
interface Props {
  metadata: {
    url: string;
    hash: string;
    drepId: string;
    depositPaid: string;
  };
}

export const ConfirmDRepRegistration = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();

  const translations: Translations = {
    labels: {
      depositPaid: t('core.DRepRegistration.depositPaid'),
      drepId: t('core.DRepRegistration.drepId'),
      hash: t('core.DRepRegistration.hash'),
      url: t('core.DRepRegistration.url')
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.RegisterDelegateRepresentativeCertificate')}
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
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.depositPaid}
          address={metadata.depositPaid}
          testID="metadata-depositPaid"
        />
      </Cell>
    </Grid>
  );
};
