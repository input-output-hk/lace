import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRegistration } from '@lace/core';
import { SignTxData } from './types';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmDRepRegistrationContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const tx = signTxData?.tx;

  return (
    <ConfirmDRepRegistration
      dappInfo={signTxData.dappInfo}
      metadata={{
        depositPaid: 'depositPaid',
        drepId: 'drepId',
        hash: 'hash',
        url: 'url'
      }}
      translations={{
        metadata: t('core.drepRegistration.metadata'),
        labels: {
          depositPaid: t('core.drepRegistration.depositPaid'),
          drepId: t('core.drepRegistration.drepId'),
          hash: t('core.drepRegistration.hash'),
          url: t('core.drepRegistration.url')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
