import React from 'react';
import { Box, Grid, Flex, Divider, sx, Text, Metadata, Cell } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../../DappInfo';
import { ErrorPane } from '@lace/common';
import * as Types from './UpdateCommitteeActionTypes';
import { Procedure } from '../components/Procedure';
import { TransactionDetails } from '../components/TransactionDetails';
import { ActionId } from '../components/ActionId';

interface UpdateCommitteeActionProps {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: Types.Data;
  translations: Types.Translations;
}

export const UpdateCommitteeAction = ({
  dappInfo,
  errorMessage,
  data: { procedure, txDetails, membersToBeAdded, membersToBeRemoved, actionId },
  translations
}: UpdateCommitteeActionProps): JSX.Element => {
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
          <Divider my={'$16'} />
        </Cell>
        {membersToBeAdded.length > 0 && (
          <>
            <Cell>
              <Text.Body.Large className={textCss} weight="$bold">
                {translations.membersToBeAdded.title}
              </Text.Body.Large>
            </Cell>
            {membersToBeAdded.map(({ coldCredential, epoch }) => (
              <React.Fragment key={`${coldCredential.hash}${epoch}`}>
                <Cell>
                  <Metadata label={translations.membersToBeAdded.coldCredential.hash} text={coldCredential.hash} />
                </Cell>
                <Cell>
                  <Metadata label={translations.membersToBeAdded.coldCredential.epoch} text={epoch} />
                </Cell>
              </React.Fragment>
            ))}
          </>
        )}
        {membersToBeRemoved.length > 0 && (
          <>
            <Cell>
              <Text.Body.Large className={textCss} weight="$bold">
                {translations.membersToBeRemoved.title}
              </Text.Body.Large>
            </Cell>
            {membersToBeRemoved.map(({ hash }) => (
              <React.Fragment key={hash}>
                <Cell>
                  <Metadata label={translations.membersToBeRemoved.hash} text={hash} />
                </Cell>
                <Cell>
                  <Metadata label={translations.membersToBeAdded.coldCredential.epoch} text={hash} />
                </Cell>
              </React.Fragment>
            ))}
          </>
        )}
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
