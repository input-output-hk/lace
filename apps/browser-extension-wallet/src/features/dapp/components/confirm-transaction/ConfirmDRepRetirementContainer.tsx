import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRetirement } from '@lace/core';
import { SignTxData } from './types';
import { dRepRetirementInspector, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ConfirmDRepRetirementContainer = ({ signTxData, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const certificate = dRepRetirementInspector(signTxData.tx);
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();

  const depositPaidWithCardanoSymbol = `${Wallet.util.lovelacesToAdaString(certificate.deposit.toString())} ${
    cardanoCoin.symbol
  }`;

  return (
    <ConfirmDRepRetirement
      dappInfo={signTxData.dappInfo}
      metadata={{
        depositReturned: depositPaidWithCardanoSymbol,
        drepId: drepIDasBech32FromHash(certificate.dRepCredential.hash)
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
