import React, { Fragment } from 'react';
import { Box, Cell, Grid, Metadata, MetadataLink, Text, Divider, sx } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { CoreTranslationKey } from '@lace/translation';
import type { Wallet } from '@lace/cardano';

type VotingProcedure = {
  voter: {
    type: Wallet.util.VoterTypeEnum;
    dRepId?: string;
  };
  votes: {
    actionId: {
      index: number;
      txHash: string;
      txHashUrl?: string; // Dependent on having an explorer to link
    };
    votingProcedure: {
      vote: Wallet.util.VotesEnum;
      anchor: {
        url: string;
        hash: string;
      } | null;
    };
  }[];
};

interface Props {
  data: VotingProcedure[];
}

const indexCounter = (text: string, idx: number, length: number): string => (length > 1 ? `${text} ${idx + 1}` : text);

export const VotingProcedures = ({ data }: Props): JSX.Element => {
  const { t } = useTranslation();
  const textCss = sx({
    color: '$text_primary'
  });

  const translations = {
    voterType: t('core.VotingProcedures.voterType'),
    procedureTitle: t('core.VotingProcedures.procedureTitle'),
    actionIdTitle: t('core.VotingProcedures.actionIdTitle'),
    vote: t('core.VotingProcedures.vote'),
    actionId: {
      index: t('core.VotingProcedures.actionId.index'),
      txHash: t('core.VotingProcedures.actionId.txHash')
    },
    anchor: {
      hash: t('core.VotingProcedures.anchor.hash'),
      url: t('core.VotingProcedures.anchor.url')
    },
    dRepId: t('core.VotingProcedures.dRepId')
  };

  return (
    <>
      {data.map(({ voter, votes }, idx) => (
        <Box mb="$16" key={voter.dRepId} mt={idx > 0 ? '$40' : '$0'}>
          <Grid columns="$1" gutters="$16">
            {data.length > 1 && (
              <Cell>
                <Text.Body.Large className={textCss} weight="$bold">
                  {indexCounter(translations.vote, idx, data.length)}
                </Text.Body.Large>
              </Cell>
            )}
            <Cell>
              <Metadata
                label={translations.voterType}
                text={t(`core.VotingProcedures.voterTypes.${voter.type}` as unknown as CoreTranslationKey)}
              />
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
                  <Metadata
                    label={translations.vote}
                    text={t(`core.VotingProcedures.votes.${votingProcedure.vote}` as unknown as CoreTranslationKey)}
                  />
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
    </>
  );
};
