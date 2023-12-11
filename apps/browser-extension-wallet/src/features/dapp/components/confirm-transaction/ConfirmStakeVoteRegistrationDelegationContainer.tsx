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
        stakeKeyHash: certificate.stakeCredential.hash,
        depositPaid: depositPaidWithCardanoSymbol,
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: dRep.hash } : {})
      }}
      translations={{
        metadata: t('core.StakeVoteDelegationRegistration.metadata'),
        option: t('core.StakeVoteDelegationRegistration.option'),
        labels: {
          poolId: t('core.StakeVoteDelegationRegistration.poolId'),
          stakeKeyHash: t('core.StakeVoteDelegationRegistration.stakeKeyHash'),
          drepId: t('core.StakeVoteDelegationRegistration.drepId'),
          alwaysAbstain: t('core.StakeVoteDelegationRegistration.alwaysAbstain'),
          alwaysNoConfidence: t('core.StakeVoteDelegationRegistration.alwaysNoConfidence'),
          depositPaid: t('core.StakeVoteDelegationRegistration.depositPaid')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
