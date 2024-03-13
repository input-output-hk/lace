import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmVoteRegistrationDelegation } from '@lace/core';
import { certificateInspectorFactory, depositPaidWithSymbol, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useViewsFlowContext } from '@providers';
import { Skeleton } from 'antd';

const { CertificateType, RewardAddress } = Wallet.Cardano;

export const ConfirmVoteRegistrationDelegationContainer = ({
  tx
}: {
  tx: Wallet.Cardano.Tx<Wallet.Cardano.TxBody>;
}): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin },
    currentChain: { networkId }
  } = useWalletStore();
  const { dappInfo } = useViewsFlowContext();
  const [certificate, setCertificate] = useState<Wallet.Cardano.VoteRegistrationDelegationCertificate>();

  useEffect(() => {
    if (!tx) return;
    const getCertificateData = async () => {
      const txCertificate = await certificateInspectorFactory<Wallet.Cardano.VoteRegistrationDelegationCertificate>(
        CertificateType.VoteRegistrationDelegation
      )(tx);
      setCertificate(txCertificate);
    };

    getCertificateData();
  }, [tx]);

  if (!certificate) {
    return <Skeleton loading />;
  }

  const { dRep, deposit, stakeCredential } = certificate;
  const depositPaidWithCardanoSymbol = depositPaidWithSymbol(deposit, cardanoCoin);

  return (
    <ConfirmVoteRegistrationDelegation
      dappInfo={dappInfo}
      metadata={{
        depositPaid: depositPaidWithCardanoSymbol,
        stakeKeyHash: RewardAddress.fromCredentials(networkId, stakeCredential).toAddress().toBech32(),
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: drepIDasBech32FromHash(dRep.hash) } : {})
      }}
      translations={{
        metadata: t('core.VoteRegistrationDelegation.metadata'),
        option: t('core.VoteRegistrationDelegation.option'),
        labels: {
          drepId: t('core.VoteRegistrationDelegation.drepId'),
          alwaysAbstain: t('core.VoteRegistrationDelegation.alwaysAbstain'),
          alwaysNoConfidence: t('core.VoteRegistrationDelegation.alwaysNoConfidence'),
          depositPaid: t('core.VoteRegistrationDelegation.depositPaid'),
          stakeKeyHash: t('core.VoteRegistrationDelegation.stakeKeyHash')
        }
      }}
    />
  );
};
