import React from 'react';
import { Box, Cell, Grid, TransactionSummary, Flex } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../DappInfo';
import { ErrorPane } from '@lace/common';

interface Props {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  translations: {
    labels: {
      poolId: string;
      stakeKeyHash: string;
      drepId: string;
      alwaysAbstain: string;
      alwaysNoConfidence: string;
    };
    option: string;
    metadata: string;
  };
  metadata: {
    poolId: string;
    stakeKeyHash: string;
    drepId?: string;
    alwaysAbstain: boolean;
    alwaysNoConfidence: boolean;
  };
}

export const ConfirmStakeVoteDelegation = ({ dappInfo, errorMessage, translations, metadata }: Props): JSX.Element => (
  <Flex h="$fill" flexDirection="column">
    <Box mb={'$28'} mt={'$32'}>
      <DappInfo {...dappInfo} />
    </Box>
    {errorMessage && (
      <Box my={'$16'}>
        <ErrorPane error={errorMessage} />
      </Box>
    )}
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Metadata label={translations.metadata} text="" />
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
