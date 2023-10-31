import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { HardForkInitiationAction } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { SignTxData } from '../types';
import { useCExpolorerBaseUrl } from '../hooks';

interface Props {
  dappInfo: SignTxData['dappInfo'];
  governanceAction: Wallet.Cardano.HardForkInitiationAction;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
  errorMessage?: string;
}

export const HardForkInitiationActionContainer = ({
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
        title: t('core.proposalProcedure.governanceAction.hardForkInitiation.title'),
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
      protocolVersion: {
        title: t('core.proposalProcedure.governanceAction.hardForkInitiation.protocolVersion.title'),
        label: t('core.proposalProcedure.governanceAction.hardForkInitiation.protocolVersion.label')
      }
    }),
    [t]
  );

  const { governanceActionId, protocolVersion } = governanceAction;

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
    protocolVersion,
    actionId: {
      index: governanceActionId?.actionIndex || 0,
      txHash: governanceActionId?.id || '',
      ...(explorerBaseUrl && governanceActionId?.id && { txHashUrl: `${explorerBaseUrl}/${governanceActionId?.id}` })
    }
  };

  return (
    <HardForkInitiationAction dappInfo={dappInfo} errorMessage={errorMessage} data={data} translations={translations} />
  );
};
