import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRegistration } from '@lace/core';
import { certificateInspectorFactory, depositPaidWithSymbol, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';

const { CertificateType } = Wallet.Cardano;

interface Props {
  errorMessage?: string;
}

export const ConfirmDRepRegistrationContainer = ({ errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();

  const [certificate, setCertificate] = useState<Wallet.Cardano.RegisterDelegateRepresentativeCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.RegisterDelegateRepresentativeCertificate>(
        CertificateType.RegisterDelegateRepresentative
      )(request?.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const depositPaidWithCardanoSymbol = depositPaidWithSymbol(certificate.deposit, cardanoCoin);

  return (
    <ConfirmDRepRegistration
      dappInfo={dappInfo}
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
