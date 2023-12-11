import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmVoteRegistrationDelegation } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';

const { CertificateType } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmVoteRegistrationDelegationContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const certificate = certificateInspectorFactory<Wallet.Cardano.VoteRegistrationDelegationCertificate>(
    CertificateType.VoteRegistrationDelegation
  )(signTxData.tx);
  const dRep = certificate.dRep;
  const depositPaidWithCardanoSymbol = `${Wallet.util.lovelacesToAdaString(certificate.deposit.toString())} ${
    cardanoCoin.symbol
  }`;

  return (
    <ConfirmVoteRegistrationDelegation
      dappInfo={signTxData.dappInfo}
      metadata={{
        depositPaid: depositPaidWithCardanoSymbol,
        stakeKeyHash: certificate.stakeCredential.hash,
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: dRep.hash } : {})
      }}
      translations={{
        metadata: t('core.VoteRegistrationDelegation.metadata'),
        option: t('core.VoteRegistrationDelegation.option'),
        labels: {
          drepId: t('core.VoteRegistrationDelegation.drepId'),
          alwaysAbstain: t('core.VoteRegistrationDelegation.alwaysAbstain'),
          alwaysNoConfidence: t('core.VoteRegistrationDelegation.alwaysNoConfidence'),
          depositPaid: t('core.VoteRegistrationDelegation.depositPaid'),
          stakeKeyHash: t('core.VoteRegistrationDelegation.stakeKeyHash')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
