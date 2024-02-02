import { runtime, storage as webStorage } from 'webextension-polyfill';
import { of } from 'rxjs';
import { getProviders } from './config';
import { DEFAULT_LOOK_AHEAD_SEARCH, HDSequentialDiscovery, PersonalWallet, storage } from '@cardano-sdk/wallet';
import { KoraLabsHandleProvider } from '@cardano-sdk/cardano-services-client';
import axiosFetchAdapter from '@vespaiach/axios-fetch-adapter';
import {
  AnyWallet,
  StoresFactory,
  WalletFactory,
  WalletManager,
  WalletRepository,
  WalletType,
  consumeSigningCoordinatorApi,
  exposeApi,
  observableWalletProperties,
  repositoryChannel,
  walletChannel,
  walletManagerChannel,
  walletManagerProperties,
  walletRepositoryProperties
} from '@cardano-sdk/web-extension';
import { config } from '@src/config';
import { Wallet } from '@lace/cardano';
import { ADA_HANDLE_POLICY_ID, HANDLE_SERVER_URLS } from '@src/features/ada-handle/config';
import { Cardano, NotImplementedError } from '@cardano-sdk/core';

const logger = console;

// It is important that this file is not exported from index,
// because creating wallet repository with store creates an actual pouchdb database
// which results in some trash files when running the tests (leveldb directory)
export const walletRepository = new WalletRepository({
  logger,
  store: new Wallet.storage.PouchDbCollectionStore<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>>(
    { dbName: 'walletRepository' },
    logger
  )
});

const chainIdToChainName = (chainId: Cardano.ChainId): Wallet.ChainName => {
  switch (chainId.networkMagic) {
    case Wallet.Cardano.ChainIds.Mainnet.networkMagic:
      return 'Mainnet';
    case Wallet.Cardano.ChainIds.Preprod.networkMagic:
      return 'Preprod';
    case Wallet.Cardano.ChainIds.Preview.networkMagic:
      return 'Preview';
    case Wallet.Cardano.ChainIds.Sanchonet.networkMagic:
      throw new Error('TODO: add sanchonet option');
    default:
      throw new Error(`Unknown network magic: ${chainId.networkMagic}`);
  }
};

const walletFactory: WalletFactory<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
  create: async ({ chainId, accountIndex, provider }, wallet, { stores, witnesser }) => {
    const chainName: Wallet.ChainName =
      // provider.options are useless now, because they are bound to wallet (not to wallet per network).
      // When we need to support custom provider URLs, add argument to WalletManager.switchNetwork
      // and store it in wallet manager's storage for loading custom URL providers
      provider?.type === (Wallet.WalletManagerProviderTypes.CARDANO_SERVICES_PROVIDER as unknown as string)
        ? chainIdToChainName(chainId)
        : config().CHAIN;
    const providers = getProviders(chainName);
    if (wallet.type === WalletType.Script || typeof accountIndex !== 'number') {
      throw new NotImplementedError('Script wallet support is not implemented');
    }
    const walletAccount = wallet.accounts.find((acc) => acc.accountIndex === accountIndex);
    if (!walletAccount) {
      throw new Error('Wallet account not found');
    }
    const bip32Account = new Wallet.KeyManagement.Bip32Account({
      accountIndex,
      chainId,
      extendedAccountPublicKey: walletAccount.extendedAccountPublicKey
    });

    return new PersonalWallet(
      { name: walletAccount.metadata.name },
      {
        logger,
        ...providers,
        stores,
        handleProvider: new KoraLabsHandleProvider({
          serverUrl:
            HANDLE_SERVER_URLS[
              // TODO: remove exclude to support sanchonet
              Cardano.ChainIds[chainName].networkMagic as Exclude<
                Cardano.NetworkMagics,
                Cardano.NetworkMagics.Sanchonet
              >
            ],
          adapter: axiosFetchAdapter,
          policyId: ADA_HANDLE_POLICY_ID
        }),
        addressDiscovery: new HDSequentialDiscovery(providers.chainHistoryProvider, DEFAULT_LOOK_AHEAD_SEARCH),
        witnesser,
        bip32Account
      }
    );
  }
};

const storesFactory: StoresFactory = {
  create: ({ name }) => storage.createPouchDbWalletStores(name, { logger })
};

const signingCoordinatorApi = consumeSigningCoordinatorApi({ logger, runtime });
export const walletManager = new WalletManager(
  { name: process.env.WALLET_NAME },
  {
    signingCoordinatorApi,
    walletRepository,
    logger,
    runtime,
    storesFactory,
    walletFactory,
    managerStorage: webStorage.local
  }
);
walletManager
  .initialize()
  .then(() => {
    exposeApi(
      {
        api$: of(walletRepository),
        baseChannel: repositoryChannel(process.env.WALLET_NAME),
        properties: walletRepositoryProperties
      },
      { logger, runtime }
    );

    exposeApi(
      {
        api$: of(walletManager),
        baseChannel: walletManagerChannel(process.env.WALLET_NAME),
        properties: walletManagerProperties
      },
      { logger, runtime }
    );

    exposeApi(
      {
        api$: walletManager.activeWallet$.asObservable(),
        baseChannel: walletChannel(process.env.WALLET_NAME),
        properties: observableWalletProperties
      },
      { logger, runtime }
    );
  })
  .catch((error) => {
    logger.error('Failed to initialize wallet manager', error);
  });

export const wallet$ = walletManager.activeWallet$;
