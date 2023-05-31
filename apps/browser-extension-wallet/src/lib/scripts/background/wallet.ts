import { runtime, storage as webStorage } from 'webextension-polyfill';
import { of } from 'rxjs';
import { getProviders } from './config';
import { SingleAddressWallet, storage } from '@cardano-sdk/wallet';

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

    return new SingleAddressWallet(
      { name: props.observableWalletName },
      {
        keyAgent: dependencies.keyAgent,
        logger,
        ...providers,
        stores: dependencies.stores
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
