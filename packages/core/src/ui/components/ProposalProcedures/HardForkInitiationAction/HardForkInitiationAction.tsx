import React from 'react';
import { Box, Grid, Flex, Divider, Metadata, Cell } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import * as Types from './HardForkInitiationActionTypes';
import { TransactionDetails } from '../components/TransactionDetails';
import { Procedure } from '../components/Procedure';
import { ActionId } from '../components/ActionId';

export interface HardForkInitiationActionProps {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const HardForkInitiationAction = ({
  dappInfo,
  errorMessage,
  data: { procedure, txDetails, actionId, protocolVersion },
  translations
}: HardForkInitiationActionProps): JSX.Element => (
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
      {/* tx details section */}
      <TransactionDetails translations={translations.txDetails} data={txDetails} />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      <Cell>
        <Metadata label={translations.protocolVersion.major} text={protocolVersion.major} />
      </Cell>
      <Cell>
        <Metadata label={translations.protocolVersion.minor} text={protocolVersion.minor} />
      </Cell>
      {protocolVersion.patch && (
        <Cell>
          <Metadata label={translations.protocolVersion.patch} text={protocolVersion.patch} />
        </Cell>
      )}
      {/* action id section*/}
      {actionId && (
        <>
          <Cell>
            <Divider my={'$16'} />
          </Cell>
          <ActionId translations={translations.actionId} data={actionId} />
        </>
      )}
    </Grid>
  </Flex>
);
