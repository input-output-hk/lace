import React from 'react';
import { Box, Cell, Grid, Flex, Divider, sx, Metadata, Text } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import * as Types from './HardForkInitiationActionTypes';
import { Procedure } from '../components/Procedure';
import { ActionId } from '../components/ActionId';

interface Props {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const HardForkInitiationAction = ({ dappInfo, errorMessage, data, translations }: Props): JSX.Element => {
  const textCss = sx({
    color: '$text_primary'
  });

  return (
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
        <Procedure data={data.procedure} translations={translations.procedure} />
        <Cell>
          <Divider my={'$16'} />
        </Cell>
        <ActionId data={data.actionId} translations={translations.actionId} />
        <Cell>
          <Divider my={'$16'} />
        </Cell>
        <Cell>
          <Text.Body.Large className={textCss} weight="$bold">
            {translations.protocolVersion.title}
          </Text.Body.Large>
        </Cell>
        <Cell>
          <Metadata
            label={translations.protocolVersion.label}
            text={`${data.protocolVersion.major}.${data.protocolVersion.minor}.${data.protocolVersion.patch}`}
          />
        </Cell>
      </Grid>
    </Flex>
  );
};
