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

  const depositPaidWithCardanoSymbol = Wallet.util.getFormattedAmount({
    amount: certificate.deposit.toString(),
    cardanoCoin
  });

  // TODO: might be changed in scope of https://input-output.atlassian.net/browse/LW-9034
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
        metadata: t('core.DRepRegistration.metadata'),
        labels: {
          depositPaid: t('core.DRepRegistration.depositPaid'),
          drepId: t('core.DRepRegistration.drepId'),
          hash: t('core.DRepRegistration.hash'),
          url: t('core.DRepRegistration.url')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
