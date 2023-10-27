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
        stakeKeyHash: certificate.stakeKeyHash,
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: dRep.hash } : {})
      }}
      translations={{
        metadata: t('core.voteRegistrationDelegation.metadata'),
        option: t('core.voteRegistrationDelegation.option'),
        labels: {
          drepId: t('core.voteRegistrationDelegation.drepId'),
          alwaysAbstain: t('core.voteRegistrationDelegation.alwaysAbstain'),
          alwaysNoConfidence: t('core.voteRegistrationDelegation.alwaysNoConfidence'),
          depositPaid: t('core.voteRegistrationDelegation.depositPaid'),
          stakeKeyHash: t('core.voteRegistrationDelegation.stakeKeyHash')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
