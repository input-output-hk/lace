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

  const translations = useMemo<Parameters<typeof HardForkInitiationAction>[0]['translations']>(
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
      governanceAction: {
        id: t('core.ProposalProcedure.governanceAction.hardForkInitiation.actionId.id'),
        index: t('core.ProposalProcedure.governanceAction.hardForkInitiation.actionId.index')
      },
      protocolVersion: {
        major: t('core.ProposalProcedure.governanceAction.hardForkInitiation.protocolVersion.major'),
        minor: t('core.ProposalProcedure.governanceAction.hardForkInitiation.protocolVersion.minor'),
        patch: t('core.ProposalProcedure.governanceAction.hardForkInitiation.protocolVersion.patch')
      },
      actionId: {
        title: t('core.ProposalProcedure.governanceAction.actionId.title'),
        index: t('core.ProposalProcedure.governanceAction.actionId.index'),
        txHash: t('core.ProposalProcedure.governanceAction.actionId.txHash')
      }
    }),
    [t]
  );

  const { governanceActionId, protocolVersion } = governanceAction;

  const data: Parameters<typeof HardForkInitiationAction>[0]['data'] = {
    txDetails: {
      txType: t('core.ProposalProcedure.governanceAction.hardForkInitiation.title'),
      deposit: `${Wallet.util.lovelacesToAdaString(deposit.toString())} ${cardanoCoin.symbol}`,
      rewardAccount
    },
    procedure: {
      ...(anchor && {
        anchor: {
          url: anchor.url,
          hash: anchor.dataHash,
          ...(explorerBaseUrl && { txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}` })
        }
      })
    },
    protocolVersion: {
      major: protocolVersion.major.toString(),
      minor: protocolVersion.minor.toString(),
      patch: protocolVersion.patch?.toString()
    },
    ...(governanceActionId && {
      governanceAction: {
        index: governanceActionId.actionIndex.toString(),
        id: governanceActionId.id || ''
      }
    })
  };

  return (
    <HardForkInitiationAction dappInfo={dappInfo} errorMessage={errorMessage} data={data} translations={translations} />
  );
};
