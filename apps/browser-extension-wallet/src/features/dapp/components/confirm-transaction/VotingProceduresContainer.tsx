import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VotingProcedures } from '@lace/core';
import { getDRepId, hasValidDrepRegistration, votingProceduresInspector } from './utils';
import { useCexplorerBaseUrl, useDisallowSignTx } from './hooks';
import { getVote, getVoterType } from '@src/utils/tx-inspection';
import { Wallet } from '@lace/cardano';
import { NonRegisteredUserModal } from './NonRegisteredUserModal/NonRegisteredUserModal';
import { useViewsFlowContext } from '@providers';
import { useWalletStore } from '@src/stores';

export const VotingProceduresContainer = ({
  tx
}: {
  tx: Wallet.Cardano.Tx<Wallet.Cardano.TxBody>;
}): React.ReactElement => {
  const { t } = useTranslation();
  const { dappInfo } = useViewsFlowContext();
  const { walletState } = useWalletStore();
  const [votingProcedures, setVotingProcedures] = useState<Wallet.Cardano.VotingProcedures>([]);
  const [isNonRegisteredUserModalVisible, setIsNonRegisteredUserModalVisible] = useState<boolean>(false);
  const [userAckNonRegisteredState, setUserAckNonRegisteredState] = useState<boolean>(false);
  const disallowSignTx = useDisallowSignTx();

  useEffect(() => {
    const getVotingProcedures = async () => {
      const txVotingProcedures = await votingProceduresInspector(tx);
      setVotingProcedures(txVotingProcedures);
    };

    getVotingProcedures();
  }, [tx]);

  useEffect(() => {
    if (!walletState?.transactions.history || userAckNonRegisteredState) return;
    setIsNonRegisteredUserModalVisible(!hasValidDrepRegistration(walletState.transactions.history));
  }, [walletState?.transactions.history, userAckNonRegisteredState]);

  const explorerBaseUrl = useCexplorerBaseUrl();

  return (
    <>
      <NonRegisteredUserModal
        visible={isNonRegisteredUserModalVisible}
        onConfirm={() => {
          setUserAckNonRegisteredState(true);
          setIsNonRegisteredUserModalVisible(false);
        }}
        onClose={() => disallowSignTx(true)}
      />
      <VotingProcedures
        dappInfo={dappInfo}
        data={votingProcedures.map((votingProcedure) => {
          const voterType = getVoterType(votingProcedure.voter.__typename);

          return {
            voter: {
              type: t(`core.VotingProcedures.voterTypes.${voterType}`),
              dRepId: getDRepId(votingProcedure.voter)
            },
            votes: votingProcedure.votes.map((vote) => ({
              actionId: {
                index: vote.actionId.actionIndex,
                txHash: vote.actionId.id.toString(),
                txHashUrl: `${explorerBaseUrl}/${vote.actionId.id}`
              },
              votingProcedure: {
                vote: t(`core.VotingProcedures.votes.${getVote(vote.votingProcedure.vote)}`),
                anchor: !!vote.votingProcedure.anchor && {
                  url: vote.votingProcedure.anchor.url,
                  hash: vote.votingProcedure.anchor.dataHash.toString()
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
    </>
  );
};
