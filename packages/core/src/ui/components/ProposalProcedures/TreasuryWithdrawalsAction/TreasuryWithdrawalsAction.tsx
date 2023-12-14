import React from 'react';
import { Box, Grid, Flex, Divider, sx, Text, Metadata, Cell } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import * as Types from './TreasuryWithdrawalsActionTypes';
import { TransactionDetails } from '../components/TransactionDetails';
import { ActionId } from '../components/ActionId';
import { Procedure } from '../components/Procedure';

interface TreasuryWithdrawalsActionProps {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const TreasuryWithdrawalsAction = ({
  dappInfo,
  errorMessage,
  data: { txDetails, procedure, withdrawals, actionId },
  translations
}: TreasuryWithdrawalsActionProps): JSX.Element => {
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
        {/* tx details section */}
        <TransactionDetails translations={translations.txDetails} data={txDetails} />
        <Cell>
          <Divider my={'$16'} />
        </Cell>
        {/* procedure section */}
        <Procedure translations={translations.procedure} data={procedure} />
        <Cell>
          <Text.Body.Large className={textCss} weight="$bold">
            {translations.withdrawals.title}
          </Text.Body.Large>
        </Cell>
        {withdrawals.map((withdrawal) => (
          <React.Fragment key={`${withdrawal.rewardAccount}${withdrawal.lovelace}`}>
            <Cell>
              <Metadata label={translations.withdrawals.rewardAccount} text={withdrawal.rewardAccount} />
            </Cell>
            <Cell>
              <Metadata label={translations.withdrawals.lovelace} text={withdrawal.lovelace} />
            </Cell>
          </React.Fragment>
        ))}
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
};
