import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeRegistrationDelegation } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';

const { CertificateType } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmStakeRegistrationDelegationContainer = ({
  signTxData,
  errorMessage
}: Props): React.ReactElement => {
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const { t } = useTranslation();
  const certificate = certificateInspectorFactory<Wallet.Cardano.StakeRegistrationDelegationCertificate>(
    CertificateType.StakeRegistrationDelegation
  )(signTxData.tx);
  const depositPaidWithCardanoSymbol = `${Wallet.util.lovelacesToAdaString(certificate.deposit.toString())} ${
    cardanoCoin.symbol
  }`;
  return (
    <ConfirmStakeRegistrationDelegation
      dappInfo={signTxData.dappInfo}
      metadata={{
        poolId: certificate.poolId,
        stakeKeyHash: drepIDasBech32FromHash(certificate.stakeCredential.hash),
        depositPaid: depositPaidWithCardanoSymbol
      }}
      translations={{
        metadata: t('core.StakeRegistrationDelegation.metadata'),
        labels: {
          poolId: t('core.StakeRegistrationDelegation.poolId'),
          stakeKeyHash: t('core.StakeRegistrationDelegation.stakeKeyHash'),
          depositPaid: t('core.StakeRegistrationDelegation.depositPaid')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
