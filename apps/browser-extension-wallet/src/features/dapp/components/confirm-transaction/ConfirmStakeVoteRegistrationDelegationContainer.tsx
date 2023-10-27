import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeVoteRegistrationDelegation } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';

const { CertificateType } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmStakeVoteRegistrationDelegationContainer = ({
  signTxData,
  errorMessage
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const certificate = certificateInspectorFactory<Wallet.Cardano.StakeVoteRegistrationDelegationCertificate>(
    CertificateType.StakeVoteRegistrationDelegation
  )(signTxData.tx);
  const dRep = certificate.dRep;
  const depositPaidWithCardanoSymbol = `${Wallet.util.lovelacesToAdaString(certificate.deposit.toString())} ${
    cardanoCoin.symbol
  }`;

  return (
    <ConfirmStakeVoteRegistrationDelegation
      dappInfo={signTxData.dappInfo}
      metadata={{
        poolId: certificate.poolId,
        stakeKeyHash: certificate.stakeKeyHash,
        depositPaid: depositPaidWithCardanoSymbol,
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: dRep.hash } : {})
      }}
      translations={{
        metadata: t('core.stakeVoteDelegationRegistration.metadata'),
        option: t('core.stakeVoteDelegationRegistration.option'),
        labels: {
          poolId: t('core.stakeVoteDelegationRegistration.poolId'),
          stakeKeyHash: t('core.stakeVoteDelegationRegistration.stakeKeyHash'),
          drepId: t('core.stakeVoteDelegationRegistration.drepId'),
          alwaysAbstain: t('core.stakeVoteDelegationRegistration.alwaysAbstain'),
          alwaysNoConfidence: t('core.stakeVoteDelegationRegistration.alwaysNoConfidence'),
          depositPaid: t('core.stakeRegistrationDelegation.depositPaid')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
