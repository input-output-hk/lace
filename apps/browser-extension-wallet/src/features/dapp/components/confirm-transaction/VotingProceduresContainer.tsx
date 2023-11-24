import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { VotingProcedures } from '@lace/core';
import { SignTxData } from './types';
import { drepIDasBech32FromHash, votingProceduresInspector } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { config } from '@src/config';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const getVoterType = (voterType: Wallet.Cardano.VoterType): 'Constitutional Committee' | 'SPO' | 'DRep' => {
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

export const getVote = (vote: Wallet.Cardano.Vote): string => {
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
    () => (environmentName === 'Sanchonet' ? '' : `${CEXPLORER_BASE_URL[environmentName]}/${CEXPLORER_URL_PATHS.Tx}`),
    [CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS.Tx, environmentName]
  );

  return (
    <VotingProcedures
      dappInfo={signTxData.dappInfo}
      data={votingProcedures.map((votingProcedure) => {
        const voterType = getVoterType(votingProcedure.voter.__typename);

        const drepId =
          voterType === 'DRep'
            ? drepIDasBech32FromHash(votingProcedure.voter.credential.hash)
            : votingProcedure.voter.credential.hash.toString();
        return {
          voter: {
            type: voterType,
            dRepId: drepId
          },
          votes: votingProcedure.votes.map((vote) => ({
            actionId: {
              index: vote.actionId.actionIndex,
              txHash: vote.actionId.id.toString(),
              ...(explorerBaseUrl && { txHashUrl: `${explorerBaseUrl}/${vote.actionId.id}` })
            },
            votingProcedure: {
              vote: getVote(vote.votingProcedure.vote),
              anchor: !!vote.votingProcedure.anchor?.url && {
                url: vote.votingProcedure.anchor?.url,
                hash: vote.votingProcedure.anchor?.dataHash.toString()
              }
            }
          }))
        };
      })}
      translations={{
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
      }}
      errorMessage={errorMessage}
    />
  );
};
