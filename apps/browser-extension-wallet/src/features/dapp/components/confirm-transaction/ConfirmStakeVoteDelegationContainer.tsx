import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeVoteDelegation } from '@lace/core';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';

const { CertificateType, RewardAddress } = Wallet.Cardano;

export const ConfirmStakeVoteDelegationContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { currentChain } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.StakeVoteDelegationCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.StakeVoteDelegationCertificate>(
        CertificateType.StakeVoteDelegation
      )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const dRep = certificate.dRep;

  return (
    <ConfirmStakeVoteDelegation
      dappInfo={dappInfo}
      metadata={{
        poolId: certificate.poolId,
        stakeKeyHash: RewardAddress.fromCredentials(currentChain.networkId, certificate.stakeCredential)
          .toAddress()
          .toBech32(),
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: drepIDasBech32FromHash(dRep.hash) } : {})
      }}
      translations={{
        metadata: t('core.StakeVoteDelegation.metadata'),
        option: t('core.StakeVoteDelegation.option'),
        labels: {
          poolId: t('core.StakeVoteDelegation.poolId'),
          stakeKeyHash: t('core.StakeVoteDelegation.stakeKeyHash'),
          drepId: t('core.StakeVoteDelegation.drepId'),
          alwaysAbstain: t('core.StakeVoteDelegation.alwaysAbstain'),
          alwaysNoConfidence: t('core.StakeVoteDelegation.alwaysNoConfidence')
        }
      }}
    />
  );
};
