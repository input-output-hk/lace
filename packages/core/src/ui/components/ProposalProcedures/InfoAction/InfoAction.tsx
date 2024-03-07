import React from 'react';
import { Box, Grid, Flex, Divider, Cell } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import * as Types from './InfoActionTypes';
import { TransactionDetails } from '../components/TransactionDetails';
import { Procedure } from '../components/Procedure';

export interface InfoActionProps {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const InfoAction = ({
  dappInfo,
  errorMessage,
  data: { procedure, txDetails },
  translations
}: InfoActionProps): JSX.Element => (
  <Flex h="$fill" flexDirection="column">
    <Box mb={'$28'} mt={'$16'}>
      <DappInfo {...dappInfo} />
    </Box>
    {errorMessage && (
      <Box my={'$16'}>
        <ErrorPane error={errorMessage} />
      </Box>
    )}
    <Grid columns="$1" gutters="$20">
      <TransactionDetails translations={translations.txDetails} data={txDetails} />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
    </Grid>
  </Flex>
);
