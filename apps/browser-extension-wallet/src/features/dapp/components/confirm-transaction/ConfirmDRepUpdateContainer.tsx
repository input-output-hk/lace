import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepUpdate } from '@lace/core';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';

const { CertificateType } = Wallet.Cardano;

export const ConfirmDRepUpdateContainer = ({
  tx
}: {
  tx: Wallet.Cardano.Tx<Wallet.Cardano.TxBody>;
}): React.ReactElement => {
  const { t } = useTranslation();
  const { dappInfo } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.UpdateDelegateRepresentativeCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.UpdateDelegateRepresentativeCertificate>(
        CertificateType.UpdateDelegateRepresentative
      )(tx);
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [tx]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  return (
    <ConfirmDRepUpdate
      dappInfo={dappInfo}
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
    />
  );
};
