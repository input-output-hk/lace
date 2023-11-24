import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepUpdate } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';

const { CertificateType } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmDRepUpdateContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const certificate = certificateInspectorFactory<Wallet.Cardano.UpdateDelegateRepresentativeCertificate>(
    CertificateType.UpdateDelegateRepresentative
  )(signTxData.tx);

  return (
    <ConfirmDRepUpdate
      dappInfo={signTxData.dappInfo}
      metadata={{
        drepId: drepIDasBech32FromHash(certificate.dRepCredential.hash),
        hash: certificate.anchor?.dataHash,
        url: certificate.anchor?.url
      }}
      translations={{
        metadata: t('core.DRepUpdate.metadata'),
        labels: {
          drepId: t('core.DRepUpdate.drepId'),
          hash: t('core.DRepUpdate.hash'),
          url: t('core.DRepUpdate.url')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
