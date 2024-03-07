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
    };
    metadata: string;
  };
  metadata: {
    url?: string;
    hash?: string;
    drepId: string;
  };
}

export const ConfirmDRepUpdate = ({ dappInfo, errorMessage, translations, metadata }: Props): JSX.Element => (
  <Flex h="$fill" flexDirection="column">
    <Box mb={'$24'} mt={'$24'}>
      <DappInfo {...dappInfo} />
    </Box>
    {errorMessage && (
      <Box>
        <ErrorPane error={errorMessage} />
      </Box>
    )}
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Metadata label={translations.metadata} text="" testID="metadata" />
      </Cell>
      {metadata.url && (
        <Cell>
          <TransactionSummary.Address label={translations.labels.url} address={metadata.url} testID="metadata-url" />
        </Cell>
      )}
      {metadata.hash && (
        <Cell>
          <TransactionSummary.Address label={translations.labels.hash} address={metadata.hash} testID="metadata-hash" />
        </Cell>
      )}
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.drepId}
          address={metadata.drepId}
          testID="metadata-DRepID"
        />
      </Cell>
    </Grid>
  </Flex>
);
