import React from 'react';
import { Box, Grid, Flex, Divider, Metadata, MetadataLink, Cell } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import { TransactionDetails } from '../components/TransactionDetails';
import * as Types from './ParameterChangeActionTypes';
import { EconomicGroup } from './EconomicGroup';
import { NetworkGroup } from './NetworkGroup';
import { TechnicalGroup } from './TechnicalGroup';
import { GovernanceGroup } from './GovernanceGroup';
import { Card } from '../components/Card';

interface ParameterChangeActionProps {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const ParameterChangeAction = ({
  dappInfo,
  errorMessage,
  data: { txDetails, protocolParamUpdate, anchor },
  translations
}: ParameterChangeActionProps): JSX.Element => {
  const { economicGroup, governanceGroup, networkGroup, technicalGroup, maxTxExUnits, maxBlockExUnits } =
    protocolParamUpdate;

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
        {/* tx details section */}
        <TransactionDetails translations={translations.txDetails} data={txDetails} />
        <>
          <Cell>
            <Metadata label={translations.anchor.hash} text={anchor.hash} />
          </Cell>
          <Cell>
            {anchor.txHashUrl ? (
              <MetadataLink label={translations.anchor.url} text={anchor.url} url={anchor.txHashUrl} />
            ) : (
              <Metadata label={translations.anchor.url} text={anchor.url} />
            )}
          </Cell>
        </>
        <Cell>
          <Box>
            <Card
              title={translations.networkGroup.maxTxExUnits}
              data={[
                { label: translations.memory, value: maxTxExUnits.memory },
                { label: translations.step, value: maxTxExUnits.step }
              ]}
            />
          </Box>
          <Box mb={'$18'}>
            <Card
              title={translations.networkGroup.maxBlockExUnits}
              data={[
                { label: translations.memory, value: maxBlockExUnits.memory },
                { label: translations.step, value: maxBlockExUnits.step }
              ]}
            />
          </Box>
        </Cell>
        <NetworkGroup networkGroup={networkGroup} translations={translations.networkGroup} />
        <Cell>
          <Divider my={'$16'} />
        </Cell>
        <EconomicGroup
          economicGroup={economicGroup}
          translations={{
            ...translations.economicGroup,
            memory: translations.memory,
            step: translations.step
          }}
        />
        <TechnicalGroup technicalGroup={technicalGroup} translations={translations.technicalGroup} />
        <GovernanceGroup governanceGroup={governanceGroup} translations={translations.governanceGroup} />
      </Grid>
    </Flex>
  );
};
