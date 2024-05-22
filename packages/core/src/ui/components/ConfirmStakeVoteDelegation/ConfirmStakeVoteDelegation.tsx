import React from 'react';
import { Cell, Grid, TransactionSummary, Flex } from '@lace/ui';
import { useTranslation } from 'react-i18next';

interface Props {
  metadata: {
    poolId: string;
    stakeKeyHash: string;
    drepId?: string;
    alwaysAbstain: boolean;
    alwaysNoConfidence: boolean;
  };
}

export const ConfirmStakeVoteDelegation = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();

  const translations = {
    option: t('core.StakeVoteDelegation.option'),
    labels: {
      poolId: t('core.StakeVoteDelegation.poolId'),
      stakeKeyHash: t('core.StakeVoteDelegation.stakeKeyHash'),
      drepId: t('core.StakeVoteDelegation.drepId'),
      alwaysAbstain: t('core.StakeVoteDelegation.alwaysAbstain'),
      alwaysNoConfidence: t('core.StakeVoteDelegation.alwaysNoConfidence')
    }
  };

  return (
    <Flex h="$fill" flexDirection="column">
      <Grid columns="$1" gutters="$20">
        <Cell>
          <TransactionSummary.Address
            label={t('core.activityDetails.certificateTitles.certificateType')}
            address={t('core.assetActivityItem.entry.name.StakeVoteDelegationCertificate')}
            testID="metadata-cetificateType"
          />
        </Cell>
        {metadata.drepId && (
          <Cell>
            <TransactionSummary.Address label={translations.labels.drepId} address={metadata.drepId} />
          </Cell>
        )}
        {metadata.alwaysAbstain && (
          <Cell>
            <TransactionSummary.Address label={translations.labels.alwaysAbstain} address={translations.option} />
          </Cell>
        )}
        {metadata.alwaysNoConfidence && (
          <Cell>
            <TransactionSummary.Address label={translations.labels.alwaysNoConfidence} address={translations.option} />
          </Cell>
        )}
        <Cell>
          <TransactionSummary.Address label={translations.labels.poolId} address={metadata.poolId} />
        </Cell>
        <Cell>
          <TransactionSummary.Address label={translations.labels.stakeKeyHash} address={metadata.stakeKeyHash} />
        </Cell>
      </Grid>
    </Flex>
  );
};
