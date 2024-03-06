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
      alwaysAbstain: string;
      alwaysNoConfidence: string;
    };
    option: string;
    metadata: string;
  };
  metadata: {
    drepId?: string;
    alwaysAbstain: boolean;
    alwaysNoConfidence: boolean;
  };
}

export const ConfirmVoteDelegation = ({ dappInfo, errorMessage, translations, metadata }: Props): JSX.Element => (
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
      {metadata.drepId && (
        <Cell>
          <TransactionSummary.Address
            label={translations.labels.drepId}
            address={metadata.drepId}
            testID="metadata-DRepID"
          />
        </Cell>
      )}
      {metadata.alwaysAbstain && (
        <Cell>
          <TransactionSummary.Address
            label={translations.labels.alwaysAbstain}
            address={translations.option}
            testID="metadata-alwaysAbstain"
          />
        </Cell>
      )}
      {metadata.alwaysNoConfidence && (
        <Cell>
          <TransactionSummary.Address
            label={translations.labels.alwaysNoConfidence}
            address={translations.option}
            testID="metadata-alwaysNoCOnfidence"
          />
        </Cell>
      )}
    </Grid>
  </Flex>
);
