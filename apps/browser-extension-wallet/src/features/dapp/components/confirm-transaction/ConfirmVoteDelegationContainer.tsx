import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmVoteDelegation } from '@lace/core';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';

const { CertificateType } = Wallet.Cardano;

export const ConfirmVoteDelegationContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.VoteDelegationCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.VoteDelegationCertificate>(
        CertificateType.VoteDelegation
      )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

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
