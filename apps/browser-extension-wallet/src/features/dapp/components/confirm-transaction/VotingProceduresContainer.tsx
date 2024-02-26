import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VotingProcedures } from '@lace/core';
import { drepIDasBech32FromHash, votingProceduresInspector } from './utils';
import { useCexplorerBaseUrl } from './hooks';
import { VoterTypeEnum, getVote, getVoterType } from '@src/utils/tx-inspection';
import { Wallet } from '@lace/cardano';
import { useViewsFlowContext } from '@providers';

export const VotingProceduresContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [votingProcedures, setVotingProcedures] = useState<Wallet.Cardano.VotingProcedures>([]);

  useEffect(() => {
    const getVotingProcedures = async () => {
      const txVotingProcedures = await votingProceduresInspector(request.transaction.toCore());
      setVotingProcedures(txVotingProcedures);
    };

    getVotingProcedures();
  }, [request]);

  const explorerBaseUrl = useCexplorerBaseUrl();

  return (
    <VotingProcedures
      dappInfo={dappInfo}
      data={votingProcedures.map((votingProcedure) => {
        const voterType = getVoterType(votingProcedure.voter.__typename);

        const drepId =
          voterType === VoterTypeEnum.DREP
            ? drepIDasBech32FromHash(votingProcedure.voter.credential.hash)
            : votingProcedure.voter.credential.hash.toString();
        return {
          voter: {
            type: t(`core.VotingProcedures.voterTypes.${voterType}`),
            dRepId: drepId
          },
          votes: votingProcedure.votes.map((vote) => ({
            actionId: {
              index: vote.actionId.actionIndex,
              txHash: vote.actionId.id.toString(),
              ...(explorerBaseUrl && { txHashUrl: `${explorerBaseUrl}/${vote.actionId.id}` })
            },
            votingProcedure: {
              vote: t(`core.VotingProcedures.votes.${getVote(vote.votingProcedure.vote)}`),
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
    />
  );
};
