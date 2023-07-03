import { runtime, storage as webStorage } from 'webextension-polyfill';
import { of } from 'rxjs';
import { getProviders } from './config';
import { PersonalWallet, storage } from '@cardano-sdk/wallet';
import { KoraLabsHandleProvider } from '@cardano-sdk/cardano-services-client';
import axiosFetchAdapter from '@vespaiach/axios-fetch-adapter';
import {
  StoresFactory,
  WalletFactory,
  WalletManagerActivateProps,
  WalletManagerWorker,
  exposeApi,
  walletManagerChannel,
  walletManagerProperties
} from '@cardano-sdk/web-extension';
import { config } from '@src/config';
import { Wallet } from '@lace/cardano';
import { ADA_HANDLE_POLICY_ID, HANDLE_SERVER_URLS } from '@src/features/ada-handle/config';
import { Cardano } from '@cardano-sdk/core';

const logger = console;

const walletFactory: WalletFactory = {
  create: async (
    props: WalletManagerActivateProps,
    dependencies: { keyAgent: Wallet.KeyManagement.AsyncKeyAgent; stores: storage.WalletStores }
  ) => {
    const chainName: Wallet.ChainName =
      props.provider?.type === (Wallet.WalletManagerProviderTypes.CARDANO_SERVICES_PROVIDER as unknown as string)
        ? (props.provider.options as { chainName: Wallet.ChainName }).chainName
        : config().CHAIN;
    const providers = getProviders(chainName);

    return new PersonalWallet(
      { name: props.observableWalletName, handlePolicyIds: [ADA_HANDLE_POLICY_ID] },
      {
        keyAgent: dependencies.keyAgent,
        logger,
        ...providers,
        stores: dependencies.stores,
        handleProvider: new KoraLabsHandleProvider({
          serverUrl: HANDLE_SERVER_URLS[Cardano.ChainIds[chainName].networkMagic],
          adapter: axiosFetchAdapter,
          policyId: ADA_HANDLE_POLICY_ID
        })
      }
    );
  }
};

const storesFactory: StoresFactory = {
  create: ({ walletId: observableWalletName }) => storage.createPouchDbWalletStores(observableWalletName, { logger })
};

const walletManager = new WalletManagerWorker(
  { walletName: process.env.WALLET_NAME },
  { logger, runtime, storesFactory, walletFactory, managerStorage: webStorage.local }
);

exposeApi(
  {
    api$: of(walletManager),
    baseChannel: walletManagerChannel(process.env.WALLET_NAME),
    properties: walletManagerProperties
  },
  { logger, runtime }
);

export const wallet$ = (() => walletManager.activeWallet$)();
