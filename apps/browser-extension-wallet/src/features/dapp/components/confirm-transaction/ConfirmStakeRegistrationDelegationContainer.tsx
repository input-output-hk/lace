import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeRegistrationDelegation } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory } from './utils';
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
        stakeKeyHash: certificate.stakeKeyHash,
        depositPaid: depositPaidWithCardanoSymbol
      }}
      translations={{
        metadata: t('core.stakeRegistrationDelegation.metadata'),
        labels: {
          poolId: t('core.stakeRegistrationDelegation.poolId'),
          stakeKeyHash: t('core.stakeRegistrationDelegation.stakeKeyHash'),
          depositPaid: t('core.stakeRegistrationDelegation.depositPaid')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
