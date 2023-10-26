import React from 'react';
import { Box, Cell, Grid, Flex, Divider } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import { Procedure } from '../components/Procedure';
import * as Types from './ParameterChangeActionTypes';
import { EconomicGroup } from './EconomicGroup';
import { NetworkGroup } from './NetworkGroup';
import { TechnicalGroup } from './TechnicalGroup';
import { GovernanceGroup } from './GovernanceGroup';

interface Props {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const ParameterChangeAction = ({ dappInfo, errorMessage, data, translations }: Props): JSX.Element => {
  const { economicGroup, governanceGroup, networkGroup, technicalGroup } = data.protocolParamUpdate;

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
        <NetworkGroup networkGroup={networkGroup} translations={translations.networkGroup} />
        <Cell>
          <Box my={'$16'} />
        </Cell>
        <EconomicGroup economicGroup={economicGroup} translations={translations.economicGroup} />
        <Cell>
          <Box my={'$16'} />
        </Cell>
        <TechnicalGroup technicalGroup={technicalGroup} translations={translations.technicalGroup} />
        <Cell>
          <Box my={'$16'} />
        </Cell>
        <GovernanceGroup governanceGroup={governanceGroup} translations={translations.governanceGroup} />
      </Grid>
    </Flex>
  );
};
