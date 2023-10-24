import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRegistration } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';

const { CertificateType } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmDRepRegistrationContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const certificate = certificateInspectorFactory<Wallet.Cardano.RegisterDelegateRepresentativeCertificate>(
    CertificateType.RegisterDelegateRepresentative
  )(signTxData.tx);
  const depositPaidWithCardanoSymbol = `${Wallet.util.lovelacesToAdaString(certificate.deposit.toString())} ${
    cardanoCoin.symbol
  }`;

  return (
    <ConfirmDRepRegistration
      dappInfo={signTxData.dappInfo}
      metadata={{
        depositPaid: depositPaidWithCardanoSymbol,
        drepId: drepIDasBech32FromHash(certificate.dRepCredential.hash),
        hash: certificate.anchor?.dataHash,
        url: certificate.anchor?.url
      }}
      translations={{
        metadata: t('core.drepRegistration.metadata'),
        labels: {
          depositPaid: t('core.drepRegistration.depositPaid'),
          drepId: t('core.drepRegistration.drepId'),
          hash: t('core.drepRegistration.hash'),
          url: t('core.drepRegistration.url')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
