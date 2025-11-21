import React from 'react';
import { Cell, Grid, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

interface Props {
  address: string;
  depositPaid?: string;
}

export const RegistrationCertificate = ({ address, depositPaid }: Props): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.StakeRegistrationCertificate')}
          testID="metadata-cetificateType"
        />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={t('core.ProposalProcedure.txDetails.rewardAccount')} address={address} />
      </Cell>
      <Cell>
        {depositPaid && (
          <TransactionSummary.Address
            label={t('core.activityDetails.certificateTitles.depositPaid')}
            address={depositPaid}
          />
        )}
      </Cell>
    </Grid>
  );
};
