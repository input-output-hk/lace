import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeVoteRegistrationDelegation } from '@lace/core';
import { certificateInspectorFactory, depositPaidWithSymbol, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';

const { CertificateType, RewardAddress } = Wallet.Cardano;

export const ConfirmStakeVoteRegistrationDelegationContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin },
    currentChain
  } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.StakeVoteRegistrationDelegationCertificate>();

  useEffect(() => {
    const getCertificateData = async () => {
      const txCertificate =
        await certificateInspectorFactory<Wallet.Cardano.StakeVoteRegistrationDelegationCertificate>(
          CertificateType.StakeVoteRegistrationDelegation
        )(request.transaction.toCore());
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [request]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const dRep = certificate.dRep;
  const depositPaidWithCardanoSymbol = depositPaidWithSymbol(certificate.deposit, cardanoCoin);

  return (
    <ConfirmStakeVoteRegistrationDelegation
      dappInfo={dappInfo}
      metadata={{
        poolId: certificate.poolId,
        stakeKeyHash: RewardAddress.fromCredentials(currentChain.networkId, certificate.stakeCredential)
          .toAddress()
          .toBech32(),
        depositPaid: depositPaidWithCardanoSymbol,
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: drepIDasBech32FromHash(dRep.hash) } : {})
      }}
      translations={{
        metadata: t('core.StakeVoteDelegationRegistration.metadata'),
        option: t('core.StakeVoteDelegationRegistration.option'),
        labels: {
          poolId: t('core.StakeVoteDelegationRegistration.poolId'),
          stakeKeyHash: t('core.StakeVoteDelegationRegistration.stakeKeyHash'),
          drepId: t('core.StakeVoteDelegationRegistration.drepId'),
          alwaysAbstain: t('core.StakeVoteDelegationRegistration.alwaysAbstain'),
          alwaysNoConfidence: t('core.StakeVoteDelegationRegistration.alwaysNoConfidence'),
          depositPaid: t('core.StakeVoteDelegationRegistration.depositPaid')
        }
      }}
    />
  );
};
