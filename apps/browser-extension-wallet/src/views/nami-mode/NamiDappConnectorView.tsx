/* eslint-disable max-statements */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DappConnector, DApp, DappOutsideHandlesProvider, CommonOutsideHandlesProvider } from '@lace/nami';
import { useWalletStore } from '@src/stores';
import { useBackgroundServiceAPIContext, useTheme } from '@providers';
import { useHandleResolver, useWalletManager } from '@hooks';
import { signingCoordinator, walletManager, withSignTxConfirmation } from '@lib/wallet-api-ui';
import { withDappContext } from '@src/features/dapp/context';
import { CARDANO_COIN_SYMBOL } from './constants';
import { DappDataService, BackgroundStorage } from '@lib/scripts/types';
import { consumeRemoteApi, exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import * as cip30 from '@cardano-sdk/dapp-connector';
import { UserPromptService } from '@lib/scripts/background/services';
import { finalize, firstValueFrom, map, of } from 'rxjs';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';
import { useAnalytics } from './hooks';
import { Milliseconds } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { createWalletAssetProvider } from '@cardano-sdk/wallet';
import { tryGetAssetInfos } from './utils';
import { useNetworkError } from '@hooks/useNetworkError';
import { useSecrets } from '@lace/core';
import { getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/storage';
import { useTxWitnessRequest } from '@providers/TxWitnessRequestProvider';
import type { TransactionWitnessRequest } from '@cardano-sdk/web-extension';
import { useOnUnload } from '@src/features/dapp/components/confirm-transaction/hooks';
import { logger } from '@lace/common';

const DAPP_TOAST_DURATION = 100;
const dappConnector: Omit<DappConnector, 'getAssetInfos' | 'txWitnessRequest'> = {
  getDappInfo: () => {
    const dappDataService = consumeRemoteApi<Pick<DappDataService, 'getDappInfo'>>(
      {
        baseChannel: DAPP_CHANNELS.dappData,
        properties: {
          getDappInfo: RemoteApiPropertyType.MethodReturningPromise
        }
      },
      { logger, runtime }
    );
    return dappDataService.getDappInfo();
  },
  authorizeDapp: (authorization: 'deny' | 'allow', url: string, onCleanup: () => void) => {
    const api$ = of({
      allowOrigin(origin: cip30.Origin): Promise<'deny' | 'allow'> {
        if (!url.startsWith(origin)) {
          return Promise.reject();
        }
        return Promise.resolve(authorization);
      }
    });

    const userPromptService = exposeApi<Pick<UserPromptService, 'allowOrigin'>>(
      {
        api$,
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { allowOrigin: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger, runtime }
    );

    setTimeout(() => {
      userPromptService.shutdown();
      onCleanup();
    }, DAPP_TOAST_DURATION);
  },
  getSignTxRequest: async (r: TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>) => ({
    dappInfo: await senderToDappInfo(r.signContext.sender),
    request: {
      data: { tx: r.transaction.toCbor(), addresses: r.signContext.knownAddresses },
      reject: async (onCleanup: () => void) => {
        await r.reject('User declined to sign');
        setTimeout(() => {
          onCleanup();
        }, DAPP_TOAST_DURATION);
      },
      sign: async (password: string) => {
        const passphrase = Buffer.from(password, 'utf8');
        await r.sign(passphrase, { willRetryOnFailure: true }).finally(() => passphrase.fill(0));
      }
    }
  }),
  getSignDataRequest: async () => {
    const userPromptService = exposeApi<Pick<UserPromptService, 'readyToSignData'>>(
      {
        api$: of({
          async readyToSignData(): Promise<boolean> {
            return Promise.resolve(true);
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { readyToSignData: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger, runtime }
    );

    return firstValueFrom(
      signingCoordinator.signDataRequest$.pipe(
        map(async (r) => ({
          dappInfo: await senderToDappInfo(r.signContext.sender),
          request: {
            data: { payload: r.signContext.payload, address: r.signContext.signWith },
            reject: async (onCleanup: () => void) => {
              await r.reject('User rejected to sign');
              setTimeout(() => {
                onCleanup();
              }, DAPP_TOAST_DURATION);
            },
            sign: async (password: string) => {
              const passphrase = Buffer.from(password, 'utf8');
              return r.sign(passphrase, { willRetryOnFailure: true }).finally(() => passphrase.fill(0));
            }
          }
        })),
        finalize(() => userPromptService.shutdown())
      )
    );
  }
};

export const NamiDappConnectorView = withDappContext((): React.ReactElement => {
  const { sendEventToPostHog } = useAnalytics();
  const [namiMigration, setNamiMigration] = useState<BackgroundStorage['namiMigration']>();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { walletRepository } = useWalletManager();
  const {
    walletUI,
    inMemoryWallet,
    walletType,
    currentChain,
    environmentName,
    blockchainProvider: { assetProvider }
  } = useWalletStore();
  const secretsUtil = useSecrets();

  const { theme } = useTheme();
  const cardanoCoin = useMemo(
    () => ({
      ...walletUI.cardanoCoin,
      symbol: CARDANO_COIN_SYMBOL[currentChain.networkId]
    }),
    [currentChain.networkId, walletUI.cardanoCoin]
  );

  /** A simplified version of intoAssetInfoWithAmount from SDK packages/core/src/util/transactionSummaryInspector.ts */
  const getAssetInfos = async ({
    assetIds,
    tx
  }: {
    assetIds: Wallet.Cardano.AssetId[];
    tx: Wallet.Cardano.Tx;
  }): Promise<Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>> => {
    const assetInfos = new Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>();

    if (assetIds.length > 0) {
      const assets = await tryGetAssetInfos({
        assetIds,
        assetProvider: createWalletAssetProvider({
          assetProvider,
          assetInfo$: inMemoryWallet.assetInfo$,
          tx,
          logger
        }),
        // eslint-disable-next-line no-magic-numbers, new-cap
        timeout: Milliseconds(6000)
      });

      for (const asset of assets) {
        assetInfos.set(asset.assetId, asset);
      }
    }

    return assetInfos;
  };

  const openHWFlow = useCallback(
    (path: string) => {
      backgroundServices.handleOpenNamiBrowser({ path });
    },
    [backgroundServices]
  );

  const handleResolver = useHandleResolver();

  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => setNamiMigration(storage.namiMigration))
      .catch(logger.error);
  }, []);

  const switchWalletMode = useCallback(async () => {
    const mode = 'lace';
    const migration: BackgroundStorage['namiMigration'] = {
      ...namiMigration,
      mode
    };

    setNamiMigration(migration);
    backgroundServices.handleChangeMode({ mode });
    await setBackgroundStorage({
      namiMigration: migration
    });
  }, [backgroundServices, namiMigration]);

  const txWitnessRequest = useTxWitnessRequest();

  return (
    <DappOutsideHandlesProvider
      {...{
        theme: theme.name,
        walletManager,
        walletRepository,
        environmentName,
        dappConnector: { ...dappConnector, txWitnessRequest, getAssetInfos },
        switchWalletMode,
        secretsUtil,
        useOnUnload
      }}
    >
      <CommonOutsideHandlesProvider
        {...{
          cardanoCoin,
          walletType,
          openHWFlow,
          inMemoryWallet,
          withSignTxConfirmation,
          sendEventToPostHog,
          handleResolver,
          useNetworkError,
          networkConnection: walletUI.networkConnection
        }}
      >
        <DApp />
      </CommonOutsideHandlesProvider>
    </DappOutsideHandlesProvider>
  );
});
