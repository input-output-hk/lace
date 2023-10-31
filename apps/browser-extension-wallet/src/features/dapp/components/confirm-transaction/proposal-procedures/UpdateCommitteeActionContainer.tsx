import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { UpdateCommitteeAction } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { SignTxData } from '../types';
import { useCExpolorerBaseUrl } from '../hooks';

interface Props {
  dappInfo: SignTxData['dappInfo'];
  governanceAction: Wallet.Cardano.UpdateCommittee;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
  errorMessage?: string;
}

export const UpdateCommitteeActionContainer = ({
  dappInfo,
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  errorMessage
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();

  const explorerBaseUrl = useCExpolorerBaseUrl();

  const translations = useMemo(
    () => ({
      procedure: {
        title: t('core.proposalProcedure.governanceAction.updateCommitteeAction.title'),
        deposit: t('core.proposalProcedure.procedure.deposit'),
        rewardAccount: t('core.proposalProcedure.procedure.rewardAccount'),
        anchor: {
          url: t('core.proposalProcedure.procedure.anchor.url'),
          hash: t('core.proposalProcedure.procedure.anchor.hash')
        }
      },
      actionId: {
        title: t('core.proposalProcedure.governanceAction.actionId.title'),
        index: t('core.proposalProcedure.governanceAction.actionId.index'),
        txHash: t('core.proposalProcedure.governanceAction.actionId.txHash')
      },
      membersToBeAdded: {
        title: t('core.proposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.title'),
        coldCredential: {
          hash: t('core.proposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.coldCredential.hash'),
          epoch: t(
            'core.proposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.coldCredential.epoch'
          )
        }
      },
      membersToBeRemoved: {
        title: t('core.proposalProcedure.governanceAction.updateCommitteeAction.membersToBeRemoved.title'),
        hash: t('core.proposalProcedure.governanceAction.updateCommitteeAction.membersToBeRemoved.hash')
      },
      newQuorumThreshold: {
        title: t('core.proposalProcedure.governanceAction.updateCommitteeAction.newQuorumThreshold.title'),
        denominator: t('core.proposalProcedure.governanceAction.updateCommitteeAction.newQuorumThreshold.denominator'),
        numerator: t('core.proposalProcedure.governanceAction.updateCommitteeAction.newQuorumThreshold.numerator')
      }
    }),
    [t]
  );

  const { membersToBeAdded, membersToBeRemoved, newQuorumThreshold, governanceActionId } = governanceAction;

  const data = {
    procedure: {
      deposit: `${Wallet.util.lovelacesToAdaString(deposit.toString())} ${cardanoCoin.symbol}`,
      rewardAccount,
      ...(anchor.url && {
        anchor: {
          url: anchor.url,
          hash: anchor.dataHash,
          ...(explorerBaseUrl && { txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}` })
        }
      })
    },
    actionId: {
      index: governanceActionId?.actionIndex || 0,
      txHash: governanceActionId?.id || '',
      ...(explorerBaseUrl && governanceActionId?.id && { txHashUrl: `${explorerBaseUrl}/${governanceActionId?.id}` })
    },
    membersToBeAdded: [...membersToBeAdded].map(({ coldCredential: { hash }, epoch }) => ({
      coldCredential: {
        hash: hash.toString()
      },
      epoch: epoch.toString()
    })),
    membersToBeRemoved: [...membersToBeRemoved].map(({ hash }) => ({ hash: hash.toString() })),
    newQuorumThreshold: {
      denominator: newQuorumThreshold.denominator.toString(),
      numerator: newQuorumThreshold.numerator.toString()
    }
  };

  return (
    <UpdateCommitteeAction dappInfo={dappInfo} errorMessage={errorMessage} data={data} translations={translations} />
  );
};
