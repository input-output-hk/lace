import React from 'react';
import { Cell, Grid, TransactionSummary } from '@lace/ui';
import { useTranslation } from 'react-i18next';

interface Props {
  metadata: {
    drepId: string;
    depositReturned: string;
  };
}

export const ConfirmDRepRetirement = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();

  const translations = {
    labels: {
      depositReturned: t('core.DRepRetirement.depositReturned'),
      drepId: t('core.DRepRetirement.drepId')
    }
  };

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.UnregisterDelegateRepresentativeCertificate')}
          testID="metadata-cetificateType"
        />
      </Cell>
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.drepId}
          address={metadata.drepId}
          testID="metadata-DRepID"
        />
      </Cell>
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.depositReturned}
          address={metadata.depositReturned}
          testID="metadata-depositReturned"
        />
      </Cell>
    </Grid>
  );
};
