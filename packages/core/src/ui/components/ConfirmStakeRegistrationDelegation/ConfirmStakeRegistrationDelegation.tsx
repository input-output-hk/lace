import React from 'react';
import { Cell, Grid, TransactionSummary, Flex } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

interface Props {
  metadata: {
    poolId: string;
    stakeKeyHash: string;
    depositPaid: string;
  };
}

export const ConfirmStakeRegistrationDelegation = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();
  const translations = {
    labels: {
      poolId: t('core.StakeRegistrationDelegation.poolId'),
      stakeKeyHash: t('core.StakeRegistrationDelegation.stakeKeyHash'),
      depositPaid: t('core.StakeRegistrationDelegation.depositPaid')
    }
  };

  return (
    <Flex h="$fill" flexDirection="column">
      <Grid columns="$1" gutters="$20">
        <Cell>
          <TransactionSummary.Address
            label={t('core.activityDetails.certificateTitles.certificateType')}
            address={t('core.assetActivityItem.entry.name.StakeRegistrationDelegateCertificate')}
            testID="metadata-cetificateType"
          />
        </Cell>
        <Cell>
          <TransactionSummary.Address label={translations.labels.poolId} address={metadata.poolId} />
        </Cell>
        <Cell>
          <TransactionSummary.Address label={translations.labels.stakeKeyHash} address={metadata.stakeKeyHash} />
        </Cell>
        <Cell>
          <TransactionSummary.Address label={translations.labels.depositPaid} address={metadata.depositPaid} />
        </Cell>
      </Grid>
    </Flex>
  );
};
