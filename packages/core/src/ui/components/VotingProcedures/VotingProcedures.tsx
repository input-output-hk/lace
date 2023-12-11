import React, { Fragment } from 'react';
import { Box, Cell, Grid, Flex, Metadata, MetadataLink, Text, Divider, sx } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../DappInfo';
import { ErrorPane } from '@lace/common';

type VotingProcedure = {
  voter: {
    type: string;
    dRepId?: string;
  };
  votes: {
    actionId: {
      index: number;
      txHash: string;
      txHashUrl?: string; // Dependent on having an explorer to link
    };
    votingProcedure: {
      vote: string;
      anchor: {
        url: string;
        hash: string;
      } | null;
    };
  }[];
};

interface Props {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  data: VotingProcedure[];
  translations: {
    actionIdTitle: string;
    actionId: {
      index: string;
      txHash: string;
    };
    anchor: {
      url: string;
      hash: string;
    } | null;
    dRepId: string;
    procedureTitle: string;
    vote: string;
    voterType: string;
  };
}

const indexCounter = (text: string, idx: number, length: number): string => (length > 1 ? `${text} ${idx + 1}` : text);

export const VotingProcedures = ({ dappInfo, errorMessage, data, translations }: Props): JSX.Element => {
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
      {data.map(({ voter, votes }, idx) => (
        <Box key={voter.dRepId} mt={idx > 0 ? '$40' : '$0'}>
          <Grid columns="$1" gutters="$16">
            <Cell>
              <Text.Body.Large className={textCss} weight="$bold">
                {indexCounter(translations.vote, idx, data.length)}
              </Text.Body.Large>
            </Cell>
            <Cell>
              <Metadata label={translations.voterType} text={voter.type} />
            </Cell>
            {voter.dRepId && (
              <Cell>
                <Metadata label={translations.dRepId} text={voter.dRepId} />
              </Cell>
            )}
            <Cell>
              <Divider my={'$16'} />
            </Cell>
            {votes.map(({ actionId, votingProcedure }) => (
              <Fragment key={`${actionId.txHash}${actionId.index}`}>
                <Cell>
                  <Text.Body.Normal className={textCss} weight="$bold">
                    {indexCounter(translations.procedureTitle, idx, votes.length)}
                  </Text.Body.Normal>
                </Cell>
                <Cell>
                  <Metadata label={translations.vote} text={votingProcedure.vote} />
                </Cell>
                {votingProcedure.anchor && (
                  <>
                    <Cell>
                      <MetadataLink
                        label={translations.anchor.url}
                        text={votingProcedure.anchor.url}
                        url={votingProcedure.anchor.url}
                      />
                    </Cell>
                    <Cell>
                      <Metadata label={translations.anchor.hash} text={votingProcedure.anchor.hash} />
                    </Cell>
                  </>
                )}
                <Cell>
                  <Divider my={'$16'} />
                </Cell>
                <Cell>
                  <Text.Body.Normal className={textCss} weight="$bold">
                    {indexCounter(translations.actionIdTitle, idx, votes.length)}
                  </Text.Body.Normal>
                </Cell>
                {actionId.txHashUrl && (
                  <Cell>
                    <MetadataLink
                      label={translations.actionId.txHash}
                      text={actionId.txHash}
                      url={actionId.txHashUrl}
                    />
                  </Cell>
                )}
                <Cell>
                  <Metadata label={translations.actionId.index} text={actionId.index.toString()} />
                </Cell>
              </Fragment>
            ))}
          </Grid>
        </Box>
      ))}
    </Flex>
  );
};
