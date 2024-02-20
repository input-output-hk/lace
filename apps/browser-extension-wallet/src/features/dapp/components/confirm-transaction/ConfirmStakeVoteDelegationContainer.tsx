import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeVoteDelegation } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';

const { CertificateType, RewardAddress } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmStakeVoteDelegationContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const { currentChain } = useWalletStore();
  const certificate = certificateInspectorFactory<Wallet.Cardano.StakeVoteDelegationCertificate>(
    CertificateType.StakeVoteDelegation
  )(signTxData.tx);
  const dRep = certificate.dRep;

  return (
    <ConfirmStakeVoteDelegation
      dappInfo={signTxData.dappInfo}
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
      errorMessage={errorMessage}
    />
  );
};
