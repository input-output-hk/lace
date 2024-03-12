import React from 'react';
import { Box, Grid, Flex, Divider, Metadata, MetadataLink, Cell } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import * as Types from './NewConstitutionActionTypes';
import { TransactionDetails } from '../components/TransactionDetails';
import { Procedure } from '../components/Procedure';
import { ActionId } from '../components/ActionId';

export interface NewConstitutionActionProps {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const NewConstitutionAction = ({
  dappInfo,
  errorMessage,
  data: { txDetails, procedure, constitution, actionId },
  translations
}: NewConstitutionActionProps): JSX.Element => (
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
      {/* txDetails section */}
      <TransactionDetails translations={translations.txDetails} data={txDetails} />
      <Cell>
        <Divider my={'$16'} />
      </Cell>
      {/* procedure section */}
      <Procedure translations={translations.procedure} data={procedure} />
      <Cell>
        <MetadataLink
          label={translations.constitution.anchor.url}
          text={constitution.anchor.url}
          url={constitution.anchor.url}
        />
      </Cell>
      {constitution.scriptHash && (
        <Cell>
          <Metadata label={translations.constitution.scriptHash} text={constitution.scriptHash} />
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
