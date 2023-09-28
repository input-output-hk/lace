import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRetirement } from '@lace/core';
import { SignTxData } from './types';
import { dRepRetirementInspector } from './utils';
import { Wallet } from '@lace/cardano';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmDRepRetirementContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const certificate = dRepRetirementInspector(signTxData.tx);

  return (
    <ConfirmDRepRetirement
      dappInfo={signTxData.dappInfo}
      metadata={{
        depositReturned: Wallet.util.lovelacesToAdaString(certificate.deposit.toString()),
        drepId: certificate.dRepCredential.hash
      }}
      translations={{
        metadata: t('core.drepRetirement.metadata'),
        labels: {
          depositReturned: t('core.drepRetirement.depositReturned'),
          drepId: t('core.drepRetirement.drepId')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
