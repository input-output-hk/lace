import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { VotingProcedures } from '@lace/core';
import { SignTxData } from './types';
import { votingProceduresInspector } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { config } from '@src/config';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

const getVoterType = (voterType: Wallet.Cardano.VoterType): string => {
  switch (voterType) {
    case Wallet.Cardano.VoterType.ccHotKeyHash:
    case Wallet.Cardano.VoterType.ccHotScriptHash:
      return 'Constitutional Committee';
    case Wallet.Cardano.VoterType.stakePoolKeyHash:
      return 'SPO';
    case Wallet.Cardano.VoterType.dRepKeyHash:
    case Wallet.Cardano.VoterType.dRepScriptHash:
    default:
      return 'DRep';
  }
};

const getVote = (vote: Wallet.Cardano.Vote): string => {
  switch (vote) {
    case Wallet.Cardano.Vote.yes:
      return 'Yes';
    case Wallet.Cardano.Vote.no:
      return 'No';
    case Wallet.Cardano.Vote.abstain:
    default:
      return 'Abstain';
  }
};

export const VotingProceduresContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const votingProcedures = votingProceduresInspector(signTxData.tx);
  const { environmentName } = useWalletStore();
  const { CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS } = config();

  const explorerBaseUrl = useMemo(
    () => `${CEXPLORER_BASE_URL[environmentName]}/${CEXPLORER_URL_PATHS.Tx}`,
    [CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS.Tx, environmentName]
  );

  return (
    <VotingProcedures
      dappInfo={signTxData.dappInfo}
      data={votingProcedures.map((votingProcedure) => ({
        voter: {
          type: getVoterType(votingProcedure.voter.__typename),
          dRepId: votingProcedure.voter.credential.hash.toString()
        },
        votes: votingProcedure.votes.map((vote) => ({
          actionId: {
            index: vote.actionId.actionIndex,
            txHash: vote.actionId.id.toString(),
            txHashUrl: `${explorerBaseUrl}/${vote.actionId.id}`
          },
          votingProcedure: {
            vote: getVote(vote.votingProcedure.vote),
            anchor: {
              url: vote.votingProcedure.anchor?.url,
              hash: vote.votingProcedure.anchor?.dataHash.toString()
            }
          }
        }))
      }))}
      translations={{
        voterType: t('core.votingProcedures.voterType'),
        procedureTitle: t('core.votingProcedures.procedureTitle'),
        actionIdTitle: t('core.votingProcedures.actionIdTitle'),
        vote: t('core.votingProcedures.vote'),
        actionId: {
          index: t('core.votingProcedures.actionId.index'),
          txHash: t('core.votingProcedures.actionId.txHash')
        },
        anchor: {
          hash: t('core.votingProcedures.anchor.hash'),
          url: t('core.votingProcedures.anchor.url')
        },
        dRepId: t('core.votingProcedures.dRepId')
      }}
      errorMessage={errorMessage}
    />
  );
};
