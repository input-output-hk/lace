import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRetirement } from '@lace/core';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { SignTxData } from './types';

const { CertificateType } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmDRepRetirementContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const certificate = certificateInspectorFactory<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>(
    CertificateType.UnregisterDelegateRepresentative
  )(signTxData.tx);
  const depositPaidWithCardanoSymbol = `${Wallet.util.lovelacesToAdaString(certificate.deposit.toString())} ${
    cardanoCoin.symbol
  }`;

  return (
    <ConfirmDRepRetirement
      dappInfo={signTxData.dappInfo}
      metadata={{
        depositReturned: depositPaidWithCardanoSymbol,
        drepId: drepIDasBech32FromHash(certificate.dRepCredential.hash)
      }}
      translations={{
        metadata: t('core.DRepRetirement.metadata'),
        labels: {
          depositReturned: t('core.DRepRetirement.depositReturned'),
          drepId: t('core.DRepRetirement.drepId')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
