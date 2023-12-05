import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepRetirement } from '@lace/core';
import { certificateInspectorFactory, drepIDasBech32FromHash } from './utils';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { SignTxData } from './types';
import { useGetOwnPubDRepKeyHash } from './hooks';
import { Skeleton } from 'antd';
import { exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { UserPromptService } from '@lib/scripts/background/services';
import { of } from 'rxjs';
import { ApiError, APIErrorCode } from '@cardano-sdk/dapp-connector';
import { DAPP_CHANNELS } from '@utils/constants';
import { runtime } from 'webextension-polyfill';
import { DappError } from '../DappError';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
  onError: () => void;
}

export const disallowSignTx = (): void => {
  exposeApi<Pick<UserPromptService, 'allowSignTx'>>(
    {
      api$: of({
        async allowSignTx(): Promise<boolean> {
          return Promise.reject(new ApiError(APIErrorCode.InvalidRequest, 'DRep ID mismatch'));
        }
      }),
      baseChannel: DAPP_CHANNELS.userPrompt,
      properties: { allowSignTx: RemoteApiPropertyType.MethodReturningPromise }
    },
    { logger: console, runtime }
  );
};

export const ConfirmDRepRetirementContainer = ({ signTxData, onError, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const certificate = certificateInspectorFactory<Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate>(
    Wallet.Cardano.CertificateType.UnregisterDelegateRepresentative
  )(signTxData.tx);
  const depositPaidWithCardanoSymbol = `${Wallet.util.lovelacesToAdaString(certificate.deposit.toString())} ${
    cardanoCoin.symbol
  }`;
  const { loading: loadingOwnPubDRepKeyHash, ownPubDRepKeyHash } = useGetOwnPubDRepKeyHash();
  const isNotOwnDRepKey = certificate.dRepCredential.hash !== ownPubDRepKeyHash;

  if (loadingOwnPubDRepKeyHash) {
    return <Skeleton />;
  }

  if (isNotOwnDRepKey) {
    return (
      <DappError
        title={t('core.DRepRetirement.drepIdMismatchScreen.title')}
        description={t('core.DRepRetirement.drepIdMismatchScreen.description')}
        onMount={() => {
          disallowSignTx();
          onError();
        }}
        containerTestId="drep-id-mismatch-container"
        imageTestId="drep-id-mismatch-image"
        titleTestId="drep-id-mismatch-heading"
        descriptionTestId="drep-id-mismatch-description"
        closeButtonTestId="drep-id-mismatch-close-button"
      />
    );
  }

  return (
    <ConfirmDRepRetirement
      dappInfo={signTxData.dappInfo}
      metadata={{
        depositReturned: depositPaidWithCardanoSymbol,
        drepId: drepIDasBech32FromHash(certificate.dRepCredential.hash)
      }}
      translations={{
        metadata: t('core.DRepRetirement.metadata'),
        labels: {
          depositReturned: t('core.DRepRetirement.depositReturned'),
          drepId: t('core.DRepRetirement.drepId')
        }
      }}
      errorMessage={errorMessage}
    />
  );
};
