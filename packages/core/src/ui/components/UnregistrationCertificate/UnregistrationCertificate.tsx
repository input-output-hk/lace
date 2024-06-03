import React from 'react';
import { Cell, Grid, TransactionSummary } from '@lace/ui';
import { useTranslation } from 'react-i18next';

interface Props {
  address: string;
  depositReturned: string;
}

export const UnregistrationCertificate = ({ address, depositReturned }: Props): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.StakeDeRegistrationCertificate')}
          testID="metadata-cetificateType"
        />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={t('core.ProposalProcedure.txDetails.rewardAccount')} address={address} />
      </Cell>
      <Cell>
        {depositReturned && (
          <TransactionSummary.Address
            label={t('core.activityDetails.certificateTitles.depositReturned')}
            address={depositReturned}
          />
        )}
      </Cell>
    </Grid>
  );
};
