import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRetirement } from '@lace/core';
import { certificateInspectorFactory, depositPaidWithSymbol, disallowSignTx, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useGetOwnPubDRepKeyHash } from './hooks';
import { Skeleton } from 'antd';
import { DappError } from '../DappError';
import { useViewsFlowContext } from '@providers';

const { CertificateType } = Wallet.Cardano;

interface Props {
  errorMessage?: string;
  onError: () => void;
}

export const ConfirmDRepRetirementContainer = ({ onError, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>();
  const { loading: loadingOwnPubDRepKeyHash, ownPubDRepKeyHash } = useGetOwnPubDRepKeyHash();

  useEffect(() => {
    if (!request) return;
    const getCertificateData = async () => {
      const txCertificate =
        await certificateInspectorFactory<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>(
          CertificateType.UnregisterDelegateRepresentative
        )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate || loadingOwnPubDRepKeyHash) {
    return <Skeleton loading />;
  }

  const depositPaidWithCardanoSymbol = depositPaidWithSymbol(certificate.deposit, cardanoCoin);
  const isNotOwnDRepKey = certificate.dRepCredential.hash !== ownPubDRepKeyHash;

  if (isNotOwnDRepKey) {
    return (
      <DappError
        title={t('core.DRepRetirement.drepIdMismatchScreen.title')}
        description={t('core.DRepRetirement.drepIdMismatchScreen.description')}
        onMount={() => {
          disallowSignTx(request, false);
          onError();
        }}
        containerTestId="drep-id-mismatch-container"
        imageTestId="drep-id-mismatch-image"
        titleTestId="drep-id-mismatch-heading"
        descriptionTestId="drep-id-mismatch-description"
        closeButtonTestId="drep-id-mismatch-close-button"
      />
    );
  }

  return (
    <ConfirmDRepRetirement
      dappInfo={dappInfo}
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
