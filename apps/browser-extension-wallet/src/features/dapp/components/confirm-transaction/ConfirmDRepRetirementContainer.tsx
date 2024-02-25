import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRetirement } from '@lace/core';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { SignTxData } from './types';
import { useDisallowSignTx, useGetOwnPubDRepKeyHash } from './hooks';
import { Skeleton } from 'antd';
import { DappError } from '../DappError';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
  onError: () => void;
}

export const ConfirmDRepRetirementContainer = ({ signTxData, onError, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const certificate = certificateInspectorFactory<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>(
    Wallet.Cardano.CertificateType.UnregisterDelegateRepresentative
  )(signTxData.tx);
  const depositPaidWithCardanoSymbol = Wallet.util.getFormattedAmount({
    amount: certificate.deposit.toString(),
    cardanoCoin
  });

  const { loading: loadingOwnPubDRepKeyHash, ownPubDRepKeyHash } = useGetOwnPubDRepKeyHash();
  const isNotOwnDRepKey = certificate.dRepCredential.hash !== ownPubDRepKeyHash;
  const disallow = useDisallowSignTx();

  useEffect(() => {
    if (isNotOwnDRepKey) {
      disallow({ error: 'DRep ID mismatch' });
      onError();
    }
  }, [disallow, isNotOwnDRepKey, onError]);

  const onCloseClick = useCallback(() => {
    window.close();
  }, []);

  if (loadingOwnPubDRepKeyHash) {
    return <Skeleton />;
  }

  if (isNotOwnDRepKey) {
    return (
      <DappError
        title={t('core.DRepRetirement.drepIdMismatchScreen.title')}
        description={t('core.DRepRetirement.drepIdMismatchScreen.description')}
        containerTestId="drep-id-mismatch-container"
        onCloseClick={onCloseClick}
        imageTestId="drep-id-mismatch-image"
        titleTestId="drep-id-mismatch-heading"
        descriptionTestId="drep-id-mismatch-description"
        closeButtonTestId="drep-id-mismatch-close-button"
      />
    );
  }

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
