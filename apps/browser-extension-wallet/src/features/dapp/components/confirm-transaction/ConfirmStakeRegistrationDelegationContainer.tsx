import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeRegistrationDelegation } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';

const { CertificateType, RewardAddress } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmStakeRegistrationDelegationContainer = ({
  signTxData,
  errorMessage
}: Props): React.ReactElement => {
  const {
    walletUI: { cardanoCoin },
    currentChain
  } = useWalletStore();
  const { t } = useTranslation();
  const certificate = certificateInspectorFactory<Wallet.Cardano.StakeRegistrationDelegationCertificate>(
    CertificateType.StakeRegistrationDelegation
  )(signTxData.tx);
  const depositPaidWithCardanoSymbol = Wallet.util.getFormattedAmount({
    amount: certificate.deposit.toString(),
    cardanoCoin
  });
  return (
    <ConfirmStakeRegistrationDelegation
      dappInfo={signTxData.dappInfo}
      metadata={{
        poolId: certificate.poolId,
        stakeKeyHash: RewardAddress.fromCredentials(currentChain.networkId, certificate.stakeCredential)
          .toAddress()
          .toBech32(),
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
