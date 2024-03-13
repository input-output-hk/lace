import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmVoteDelegation } from '@lace/core';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';

const { CertificateType } = Wallet.Cardano;

export const ConfirmVoteDelegationContainer = ({
  tx
}: {
  tx: Wallet.Cardano.Tx<Wallet.Cardano.TxBody>;
}): React.ReactElement => {
  const { t } = useTranslation();
  const { dappInfo } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.VoteDelegationCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.VoteDelegationCertificate>(
        CertificateType.VoteDelegation
      )(tx);
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [tx]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const { dRep } = certificate;

  return (
    <ConfirmVoteDelegation
      dappInfo={dappInfo}
      metadata={{
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) && {
          drepId: drepIDasBech32FromHash(dRep.hash)
        })
      }}
      translations={{
        metadata: t('core.VoteDelegation.metadata'),
        option: t('core.VoteDelegation.option'),
        labels: {
          drepId: t('core.VoteDelegation.drepId'),
          alwaysAbstain: t('core.VoteDelegation.alwaysAbstain'),
          alwaysNoConfidence: t('core.VoteDelegation.alwaysNoConfidence')
        }
      }}
    />
  );
};
