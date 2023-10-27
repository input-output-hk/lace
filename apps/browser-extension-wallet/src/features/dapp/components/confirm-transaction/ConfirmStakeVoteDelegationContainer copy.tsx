import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmStakeVoteDelegation } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory } from './utils';
import { Wallet } from '@lace/cardano';

const { CertificateType } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmStakeVoteDelegationContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const certificate = certificateInspectorFactory<Wallet.Cardano.StakeVoteDelegationCertificate>(
    CertificateType.StakeVoteDelegation
  )(signTxData.tx);
  const dRep = certificate.dRep;

  return (
    <ConfirmStakeVoteDelegation
      dappInfo={signTxData.dappInfo}
      metadata={{
        poolId: certificate.poolId,
        stakeKeyHash: certificate.stakeKeyHash,
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) ? { drepId: dRep.hash } : {})
      }}
      translations={{
        metadata: t('core.stakeVoteDelegation.metadata'),
        option: t('core.stakeVoteDelegation.option'),
        labels: {
          poolId: t('core.stakeVoteDelegation.poolId'),
          stakeKeyHash: t('core.stakeVoteDelegation.stakeKeyHash'),
          drepId: t('core.stakeVoteDelegation.drepId'),
          alwaysAbstain: t('core.stakeVoteDelegation.alwaysAbstain'),
          alwaysNoConfidence: t('core.stakeVoteDelegation.alwaysNoConfidence')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
