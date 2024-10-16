/* eslint-disable max-statements */
import React, { useCallback, useMemo } from 'react';
import { DappConnector, DApp, DappOutsideHandlesProvider, CommonOutsideHandlesProvider } from '@lace/nami';
import { useWalletStore } from '@src/stores';
import { useAppSettingsContext, useBackgroundServiceAPIContext, useTheme } from '@providers';
import { useChainHistoryProvider, useHandleResolver, useWalletManager } from '@hooks';
import { signingCoordinator, walletManager, withSignTxConfirmation } from '@lib/wallet-api-ui';
import { withDappContext } from '@src/features/dapp/context';
import { CARDANO_COIN_SYMBOL } from './constants';
import { DappDataService } from '@lib/scripts/types';
import { consumeRemoteApi, exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import * as cip30 from '@cardano-sdk/dapp-connector';
import { UserPromptService } from '@lib/scripts/background/services';
import { finalize, firstValueFrom, map, of } from 'rxjs';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';
import { useAnalytics } from './hooks';
import { createTxInspector, Milliseconds, transactionSummaryInspector } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { createWalletAssetProvider } from '@cardano-sdk/wallet';
import { useObservable } from '@lace/common';
import { utxoAndBackendChainHistoryResolver } from '@src/utils/utxo-chain-history-resolver';

const DAPP_TOAST_DURATION = 100;
const dappConnector: Omit<DappConnector, 'getTxSummaryInspector'> = {
  getDappInfo: () => {
    const dappDataService = consumeRemoteApi<Pick<DappDataService, 'getDappInfo'>>(
      {
        baseChannel: DAPP_CHANNELS.dappData,
        properties: {
          getDappInfo: RemoteApiPropertyType.MethodReturningPromise
        }
      },
      { logger: console, runtime }
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
      { logger: console, runtime }
    );

    setTimeout(() => {
      userPromptService.shutdown();
      onCleanup();
    }, DAPP_TOAST_DURATION);
  },
  getSignTxRequest: async () => {
    const userPromptService = exposeApi<Pick<UserPromptService, 'readyToSignTx'>>(
      {
        api$: of({
          async readyToSignTx(): Promise<boolean> {
            return Promise.resolve(true);
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { readyToSignTx: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger: console, runtime }
    );

    return firstValueFrom(
      signingCoordinator.transactionWitnessRequest$.pipe(
        map(async (r) => ({
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
              await r.sign(passphrase, { willRetryOnFailure: true });
            }
          }
        })),
        finalize(() => userPromptService.shutdown())
      )
    );
  },
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
      { logger: console, runtime }
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
              return r.sign(passphrase, { willRetryOnFailure: true });
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
  const backgroundServices = useBackgroundServiceAPIContext();
  const { walletRepository } = useWalletManager();
  const {
    walletUI,
    inMemoryWallet,
    walletType,
    currentChain,
    environmentName,
    walletInfo,
    blockchainProvider: { assetProvider }
  } = useWalletStore();

  const { theme } = useTheme();
  const cardanoCoin = useMemo(
    () => ({
      ...walletUI.cardanoCoin,
      symbol: CARDANO_COIN_SYMBOL[currentChain.networkId]
    }),
    [currentChain.networkId, walletUI.cardanoCoin]
  );

  const [{ chainName }] = useAppSettingsContext();
  const chainHistoryProvider = useChainHistoryProvider({ chainName });

  const txInputResolver = useMemo(
    () =>
      utxoAndBackendChainHistoryResolver({
        utxo: inMemoryWallet.utxo,
        transactions: inMemoryWallet.transactions,
        chainHistoryProvider
      }),
    [inMemoryWallet, chainHistoryProvider]
  );

  const userAddresses = useMemo(() => walletInfo.addresses.map((v) => v.address), [walletInfo.addresses]);
  const userRewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const rewardAccountsAddresses = useMemo(() => userRewardAccounts?.map((key) => key.address), [userRewardAccounts]);
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);

  const getTxSummaryInspector = async (tx: Wallet.Cardano.Tx) =>
    createTxInspector({
      summary: transactionSummaryInspector({
        addresses: userAddresses,
        rewardAccounts: rewardAccountsAddresses,
        inputResolver: txInputResolver,
        protocolParameters,
        assetProvider: createWalletAssetProvider({
          assetProvider,
          assetInfo$: inMemoryWallet.assetInfo$,
          tx,
          logger: console
        }),
        // eslint-disable-next-line no-magic-numbers, new-cap
        timeout: Milliseconds(6000),
        logger: console
      })
    });

  const openHWFlow = useCallback(
    (path: string) => {
      backgroundServices.handleOpenNamiBrowser({ path });
    },
    [backgroundServices]
  );

  const handleResolver = useHandleResolver();

  return (
    <DappOutsideHandlesProvider
      {...{
        theme: theme.name,
        walletManager,
        walletRepository,
        environmentName,
        dappConnector: { ...dappConnector, getTxSummaryInspector }
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
          handleResolver
        }}
      >
        <DApp />
      </CommonOutsideHandlesProvider>
    </DappOutsideHandlesProvider>
  );
});
