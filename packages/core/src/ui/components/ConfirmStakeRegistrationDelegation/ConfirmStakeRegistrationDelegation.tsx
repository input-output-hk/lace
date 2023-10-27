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
      depositPaid: string;
    };
    metadata: string;
  };
  metadata: {
    poolId: string;
    stakeKeyHash: string;
    depositPaid: string;
  };
}

export const ConfirmStakeRegistrationDelegation = ({
  dappInfo,
  errorMessage,
  translations,
  metadata
}: Props): JSX.Element => (
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
