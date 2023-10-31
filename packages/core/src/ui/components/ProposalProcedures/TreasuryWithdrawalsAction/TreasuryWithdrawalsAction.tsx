import React from 'react';
import { Box, Cell, Grid, Flex, Divider, sx, Text } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import * as Types from './TreasuryWithdrawalsActionTypes';
import { Procedure } from '../components/Procedure';
import { Card } from '../components/Card';

interface Props {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const TreasuryWithdrawalsAction = ({ dappInfo, errorMessage, data, translations }: Props): JSX.Element => {
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
        <Cell>
          <Text.Body.Large className={textCss} weight="$bold">
            {translations.withdrawals.title}
          </Text.Body.Large>
        </Cell>
        {data.withdrawals.map((withdrawal) => (
          <Card
            key={`${withdrawal.rewardAccount}${withdrawal.lovelace}`}
            data={[
              {
                label: translations.withdrawals.rewardAccount,
                value: withdrawal.rewardAccount
              },
              {
                label: translations.withdrawals.lovelace,
                value: withdrawal.lovelace
              }
            ]}
          />
        ))}
      </Grid>
    </Flex>
  );
};
