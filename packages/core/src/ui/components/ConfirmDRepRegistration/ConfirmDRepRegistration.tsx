import React from 'react';
import { Box, Cell, Grid, TransactionSummary, Flex } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../DappInfo';
import { InsufficientFundsWarning } from '../InsufficientFundsWarning';
import { ErrorPane } from '@lace/common';
interface Props {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  translations: {
    labels: {
      url: string;
      hash: string;
      drepId: string;
      depositPaid: string;
    };
    insufficientFundsWarning: string;
    metadata: string;
  };
  hasInsufficientFunds: boolean;
  metadata: {
    url: string;
    hash: string;
    drepId: string;
    depositPaid: string;
  };
}

export const ConfirmDRepRegistration = ({
  dappInfo,
  hasInsufficientFunds,
  errorMessage,
  translations,
  metadata
}: Props): JSX.Element => (
  <Flex h="$fill" flexDirection="column">
    <Box mb={'$28'} mt={'$32'}>
      <DappInfo {...dappInfo} />
    </Box>
    {hasInsufficientFunds && (
      <Box mb={'$24'}>
        <InsufficientFundsWarning translations={translations.insufficientFundsWarning} />
      </Box>
    )}
    {errorMessage && (
      <Box my={'$16'}>
        <ErrorPane error={errorMessage} />
      </Box>
    )}
    <Grid columns="$1" gutters="$0">
      <Cell>
        <TransactionSummary.Metadata label={translations.metadata} text="" />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={translations.labels.url} address={metadata.url} />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={translations.labels.hash} address={metadata.hash} />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={translations.labels.drepId} address={metadata.drepId} />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={translations.labels.depositPaid} address={metadata.depositPaid} />
      </Cell>
    </Grid>
  </Flex>
);
