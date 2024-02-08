import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { TreasuryWithdrawalsAction } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { SignTxData } from '../types';
import { useCexplorerBaseUrl } from '../hooks';

interface Props {
  dappInfo: SignTxData['dappInfo'];
  governanceAction: Wallet.Cardano.TreasuryWithdrawalsAction;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
  errorMessage?: string;
}

export const TreasuryWithdrawalsActionContainer = ({
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

  const translations = useMemo<Parameters<typeof TreasuryWithdrawalsAction>[0]['translations']>(
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
      },
      withdrawals: {
        title: t('core.ProposalProcedure.governanceAction.treasuryWithdrawals.title'),
        rewardAccount: t('core.ProposalProcedure.governanceAction.treasuryWithdrawals.withdrawals.rewardAccount'),
        lovelace: t('core.ProposalProcedure.governanceAction.treasuryWithdrawals.withdrawals.lovelace')
      }
    }),
    [t]
  );

  const { withdrawals } = governanceAction;

  const data: Parameters<typeof TreasuryWithdrawalsAction>[0]['data'] = {
    txDetails: {
      txType: t('core.ProposalProcedure.governanceAction.treasuryWithdrawals.title'),
      deposit: `${Wallet.util.lovelacesToAdaString(deposit.toString())} ${cardanoCoin.symbol}`,
      rewardAccount
    },
    procedure: {
      anchor: {
        url: anchor.url,
        hash: anchor.dataHash,
        ...(explorerBaseUrl && { txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}` })
      }
    },
    withdrawals: [...withdrawals].map((withdrawal) => ({
      rewardAccount: withdrawal.rewardAccount.toString(),
      lovelace: `${Wallet.util.lovelacesToAdaString(withdrawal.coin.toString())} ${cardanoCoin.symbol}`
    }))
  };

  return (
    <TreasuryWithdrawalsAction
      dappInfo={dappInfo}
      errorMessage={errorMessage}
      data={data}
      translations={translations}
    />
  );
};
