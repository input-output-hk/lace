import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { NoConfidenceAction } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { SignTxData } from '../types';
import { useCexplorerBaseUrl } from '../hooks';

interface Props {
  dappInfo: SignTxData['dappInfo'];
  governanceAction: Wallet.Cardano.NoConfidence;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
  errorMessage?: string;
}

export const NoConfidenceActionContainer = ({
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

  const explorerBaseUrl = useCexplorerBaseUrl();

  const translations = useMemo<Parameters<typeof NoConfidenceAction>[0]['translations']>(
    () => ({
      txDetails: {
        title: t('core.ProposalProcedure.txDetails.title'),
        txType: t('core.ProposalProcedure.txDetails.txType'),
        deposit: t('core.ProposalProcedure.txDetails.deposit'),
        rewardAccount: t('core.ProposalProcedure.txDetails.rewardAccount')
      },
      procedure: {
        title: t('core.ProposalProcedure.procedure.title'),
        anchor: {
          url: t('core.ProposalProcedure.procedure.anchor.url'),
          hash: t('core.ProposalProcedure.procedure.anchor.hash')
        }
      },
      actionId: {
        title: t('core.ProposalProcedure.governanceAction.actionId.title'),
        index: t('core.ProposalProcedure.governanceAction.actionId.index'),
        txId: t('core.ProposalProcedure.governanceAction.actionId.txId')
      }
    }),
    [t]
  );

  const { governanceActionId } = governanceAction;

  const data: Parameters<typeof NoConfidenceAction>[0]['data'] = {
    txDetails: {
      txType: t('core.ProposalProcedure.governanceAction.noConfidenceAction.title'),
      deposit: Wallet.util.getFormattedAmount({
        amount: deposit.toString(),
        cardanoCoin
      }),
      rewardAccount
    },
    procedure: {
      anchor: {
        url: anchor.url,
        hash: anchor.dataHash,
        txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`
      }
    },
    ...(governanceActionId && {
      actionId: {
        index: governanceActionId.actionIndex.toString(),
        id: governanceActionId.id || ''
      }
    })
  };

  return <NoConfidenceAction dappInfo={dappInfo} errorMessage={errorMessage} data={data} translations={translations} />;
};
