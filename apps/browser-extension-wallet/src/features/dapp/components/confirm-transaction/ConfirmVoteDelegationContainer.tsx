import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmVoteDelegation } from '@lace/core';
import { SignTxData } from './types';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';

const { CertificateType } = Wallet.Cardano;

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmVoteDelegationContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const { dRep } = certificateInspectorFactory<Wallet.Cardano.VoteDelegationCertificate>(
    CertificateType.VoteDelegation
  )(signTxData.tx);

  return (
    <ConfirmVoteDelegation
      dappInfo={signTxData.dappInfo}
      metadata={{
        alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(dRep),
        alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(dRep),
        ...(Wallet.Cardano.isDRepCredential(dRep) && { drepId: drepIDasBech32FromHash(dRep.hash) })
      }}
      translations={{
        metadata: t('core.voteDelegation.metadata'),
        option: t('core.voteDelegation.option'),
        labels: {
          drepId: t('core.voteDelegation.drepId'),
          alwaysAbstain: t('core.voteDelegation.alwaysAbstain'),
          alwaysNoConfidence: t('core.voteDelegation.alwaysNoConfidence')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
