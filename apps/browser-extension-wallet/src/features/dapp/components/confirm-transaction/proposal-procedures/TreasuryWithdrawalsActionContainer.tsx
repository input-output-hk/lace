import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { TreasuryWithdrawalsAction } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { SignTxData } from '../types';
import { useCExpolorerBaseUrl } from '../hooks';

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

  const explorerBaseUrl = useCExpolorerBaseUrl();

  const translations = useMemo(
    () => ({
      procedure: {
        title: t('core.proposalProcedure.governanceAction.treasuryWithdrawals.title'),
        deposit: t('core.proposalProcedure.procedure.deposit'),
        rewardAccount: t('core.proposalProcedure.procedure.rewardAccount'),
        anchor: {
          url: t('core.proposalProcedure.procedure.anchor.url'),
          hash: t('core.proposalProcedure.procedure.anchor.hash')
        }
      },
      withdrawals: {
        title: t('core.proposalProcedure.governanceAction.treasuryWithdrawals.withdrawals.title'),
        rewardAccount: t('core.proposalProcedure.governanceAction.treasuryWithdrawals.withdrawals.rewardAccount'),
        lovelace: t('core.proposalProcedure.governanceAction.treasuryWithdrawals.withdrawals.lovelace')
      }
    }),
    [t]
  );

  const { withdrawals } = governanceAction;

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
    withdrawals: [...withdrawals].map((withdrawal) => ({
      rewardAccount: withdrawal.rewardAccount.toString(),
      lovelace: Wallet.util.lovelacesToAdaString(withdrawal.coin.toString())
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
