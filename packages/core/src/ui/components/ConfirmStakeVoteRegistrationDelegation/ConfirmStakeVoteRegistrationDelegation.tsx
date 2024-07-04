import React from 'react';
import { Cell, Grid, TransactionSummary, Flex } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

interface Props {
  metadata: {
    poolId: string;
    stakeKeyHash: string;
    drepId?: string;
    alwaysAbstain: boolean;
    alwaysNoConfidence: boolean;
    depositPaid: string;
  };
}

export const ConfirmStakeVoteRegistrationDelegation = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();

  const translations = {
    option: t('core.StakeVoteDelegationRegistration.option'),
    labels: {
      poolId: t('core.StakeVoteDelegationRegistration.poolId'),
      stakeKeyHash: t('core.StakeVoteDelegationRegistration.stakeKeyHash'),
      drepId: t('core.StakeVoteDelegationRegistration.drepId'),
      alwaysAbstain: t('core.StakeVoteDelegationRegistration.alwaysAbstain'),
      alwaysNoConfidence: t('core.StakeVoteDelegationRegistration.alwaysNoConfidence'),
      depositPaid: t('core.StakeVoteDelegationRegistration.depositPaid')
    }
  };

  return (
    <Flex h="$fill" flexDirection="column">
      <Grid columns="$1" gutters="$20">
        <Cell>
          <TransactionSummary.Address
            label={t('core.activityDetails.certificateTitles.certificateType')}
            address={t('core.assetActivityItem.entry.name.StakeVoteRegistrationDelegateCertificate')}
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
        <Cell>
          <TransactionSummary.Address label={translations.labels.depositPaid} address={metadata.depositPaid} />
        </Cell>
      </Grid>
    </Flex>
  );
};
