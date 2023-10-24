import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRetirement } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory, drepIDasBech32FromHash, getOwnRetirementMessageKey } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useIsOwnPubDRepKey } from './hooks';

const { CertificateType } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmDRepRetirementContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin },
    inMemoryWallet
  } = useWalletStore();
  const certificate = certificateInspectorFactory<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>(
    CertificateType.UnregisterDelegateRepresentative
  )(signTxData.tx);
  const depositPaidWithCardanoSymbol = `${Wallet.util.lovelacesToAdaString(certificate.deposit.toString())} ${
    cardanoCoin.symbol
  }`;

  const isOwnRetirement = useIsOwnPubDRepKey(inMemoryWallet.getPubDRepKey, certificate.dRepCredential.hash);
  const ownRetirementMessageKey = getOwnRetirementMessageKey(isOwnRetirement);

  return (
    <ConfirmDRepRetirement
      dappInfo={signTxData.dappInfo}
      metadata={{
        depositReturned: depositPaidWithCardanoSymbol,
        drepId: drepIDasBech32FromHash(certificate.dRepCredential.hash)
      }}
      translations={{
        metadata: t('core.drepRetirement.metadata'),
        labels: {
          depositReturned: t('core.drepRetirement.depositReturned'),
          drepId: t('core.drepRetirement.drepId')
        }
      }}
      errorMessage={errorMessage || t(ownRetirementMessageKey)}
    />
  );
};
