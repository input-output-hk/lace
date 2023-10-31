import React from 'react';
import { Box, Cell, Grid, Flex, Divider, sx, Text, Metadata } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import * as Types from './UpdateCommitteeActionTypes';
import { Procedure } from '../components/Procedure';
import { ActionId } from '../components/ActionId';
import { Card } from '../components/Card';

interface Props {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const UpdateCommitteeAction = ({ dappInfo, errorMessage, data, translations }: Props): JSX.Element => {
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
            {translations.newQuorumThreshold.title}
          </Text.Body.Large>
        </Cell>
        <Cell>
          <Metadata label={translations.newQuorumThreshold.denominator} text={data.newQuorumThreshold.denominator} />
        </Cell>
        <Cell>
          <Metadata label={translations.newQuorumThreshold.numerator} text={data.newQuorumThreshold.numerator} />
        </Cell>
        <Cell>
          <Divider my={'$16'} />
        </Cell>
        {data.membersToBeAdded?.length > 0 && (
          <Cell>
            <Text.Body.Large className={textCss} weight="$bold">
              {translations.membersToBeAdded.title}
            </Text.Body.Large>
          </Cell>
        )}
        {data.membersToBeAdded.map(({ coldCredential, epoch }) => (
          <Card
            key={`${coldCredential.hash}${epoch}`}
            data={[
              {
                label: translations.membersToBeAdded.coldCredential.hash,
                value: coldCredential.hash
              },
              {
                label: translations.membersToBeAdded.coldCredential.epoch,
                value: epoch
              }
            ]}
          />
        ))}
        {data.membersToBeRemoved?.length > 0 && (
          <Cell>
            <Text.Body.Large className={textCss} weight="$bold">
              {translations.membersToBeRemoved.title}
            </Text.Body.Large>
          </Cell>
        )}
        {data.membersToBeRemoved.map(({ hash }) => (
          <Card
            key={`${hash}`}
            data={[
              {
                label: translations.membersToBeRemoved.hash,
                value: hash
              }
            ]}
          />
        ))}
        <Cell>
          <Divider my={'$16'} />
        </Cell>
      </Grid>
    </Flex>
  );
};
