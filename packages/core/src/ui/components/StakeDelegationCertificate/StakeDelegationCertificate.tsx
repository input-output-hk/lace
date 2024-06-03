import React from 'react';
import { Cell, Grid, TransactionSummary } from '@lace/ui';
import { useTranslation } from 'react-i18next';

interface Props {
  address: string;
  poolId: string;
}

export const StakeDelegationCertificate = ({ address, poolId }: Props): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Address
          label={t('core.activityDetails.certificateTitles.certificateType')}
          address={t('core.assetActivityItem.entry.name.StakeDelegationCertificate')}
          testID="metadata-cetificateType"
        />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={t('core.ProposalProcedure.txDetails.rewardAccount')} address={address} />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={t('core.activityDetails.certificateTitles.poolId')} address={poolId} />
      </Cell>
    </Grid>
  );
};
