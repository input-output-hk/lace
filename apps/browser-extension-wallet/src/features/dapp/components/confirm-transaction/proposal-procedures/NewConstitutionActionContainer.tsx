import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { NewConstitutionAction } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { SignTxData } from '../types';
import { useCExpolorerBaseUrl } from '../hooks';

interface Props {
  dappInfo: SignTxData['dappInfo'];
  governanceAction: Wallet.Cardano.NewConstitution;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
  errorMessage?: string;
}

export const NewConstitutionActionContainer = ({
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
        title: t('core.proposalProcedure.governanceAction.newConstitutionAction.title'),
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
      constitution: {
        title: t('core.proposalProcedure.governanceAction.newConstitutionAction.constitution.title'),
        anchor: {
          dataHash: t('core.proposalProcedure.governanceAction.newConstitutionAction.constitution.anchor.dataHash'),
          url: t('core.proposalProcedure.governanceAction.newConstitutionAction.constitution.url')
        },
        scriptHash: t('core.proposalProcedure.governanceAction.newConstitutionAction.constitution.scriptHash')
      }
    }),
    [t]
  );

  const { governanceActionId, constitution } = governanceAction;

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
    constitution
  };

  return (
    <NewConstitutionAction dappInfo={dappInfo} errorMessage={errorMessage} data={data} translations={translations} />
  );
};
