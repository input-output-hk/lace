import React from 'react';
import { Box, Cell, Grid, TransactionSummary, Flex } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../DappInfo';
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
    metadata: string;
  };
  metadata: {
    url: string;
    hash: string;
    drepId: string;
    depositPaid: string;
  };
}

export const ConfirmDRepRegistration = ({ dappInfo, errorMessage, translations, metadata }: Props): JSX.Element => (
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
      {metadata.url && (
        <Cell>
          <TransactionSummary.Address label={translations.labels.url} address={metadata.url} />
        </Cell>
      )}
      {metadata.hash && (
        <Cell>
          <TransactionSummary.Address label={translations.labels.hash} address={metadata.hash} />
        </Cell>
      )}
      <Cell>
        <TransactionSummary.Address label={translations.labels.drepId} address={metadata.drepId} />
      </Cell>
      <Cell>
        <TransactionSummary.Address label={translations.labels.depositPaid} address={metadata.depositPaid} />
      </Cell>
    </Grid>
  </Flex>
);
