import React from 'react';
import { Box, Cell, Grid, TransactionSummary, Flex } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../DappInfo';
import { ErrorPane } from '@lace/common';

interface Props {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  translations: {
    labels: {
      drepId: string;
      depositReturned: string;
    };
    metadata: string;
  };
  metadata: {
    drepId: string;
    depositReturned: string;
  };
}

export const ConfirmDRepRetirement = ({ dappInfo, errorMessage, translations, metadata }: Props): JSX.Element => (
  <Flex h="$fill" flexDirection="column">
    <Box mb={'$24'} mt={'$16'}>
      <DappInfo {...dappInfo} />
    </Box>
    {errorMessage && (
      <Box mb={'$16'}>
        <ErrorPane error={errorMessage} />
      </Box>
    )}
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TransactionSummary.Metadata label={translations.metadata} text="" testID="metadata" />
      </Cell>
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.drepId}
          address={metadata.drepId}
          testID="metadata-DRepID"
        />
      </Cell>
      <Cell>
        <TransactionSummary.Address
          label={translations.labels.depositReturned}
          address={metadata.depositReturned}
          testID="metadata-depositReturned"
        />
      </Cell>
    </Grid>
  </Flex>
);
