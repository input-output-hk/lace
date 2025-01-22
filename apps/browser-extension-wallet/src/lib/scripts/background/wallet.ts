/* eslint-disable unicorn/no-null */
import { runtime, storage as webStorage } from 'webextension-polyfill';
import { of, combineLatest, map, EMPTY, BehaviorSubject, Observable, from, firstValueFrom, defaultIfEmpty } from 'rxjs';
import { getProviders } from './config';
import { DEFAULT_POLLING_CONFIG, createPersonalWallet, storage, createSharedWallet } from '@cardano-sdk/wallet';
import { handleHttpProvider } from '@cardano-sdk/cardano-services-client';
import { Cardano, HandleProvider } from '@cardano-sdk/core';
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
  walletRepositoryProperties, RemoteApiPropertyType
} from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { cacheActivatedWalletAddressSubscription } from './cache-wallets-address';
import axiosFetchAdapter from '@shiroyasha9/axios-fetch-adapter';
import { SharedWalletScriptKind } from '@lace/core';
import { getBaseUrlForChain, getMagicForChain } from '@utils/chain';
import { cacheNamiMetadataSubscription } from './cache-nami-metadata';
import { logger } from '@lace/common';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { ExperimentName } from '@providers/ExperimentsProvider/types';
import { requestMessage$ } from './services/utilityServices';
import { BackgroundStorage, MessageTypes } from '../types';
import { ExtensionDocumentStore } from './storage/extension-document-store';
import { ExtensionBlobKeyValueStore } from './storage/extension-blob-key-value-store';
import { ExtensionBlobCollectionStore } from './storage/extension-blob-collection-store';
import { migrateCollectionStore, migrateWalletStores, shouldAttemptWalletStoresMigration } from './storage/migrations';
import { BitcoinWallet } from '@lace/bitcoin';
import { RemoteApiProperties } from '@cardano-sdk/web-extension';

if (typeof window !== 'undefined') {
  throw new TypeError('This module should only be imported in service worker');
}

const networkMagicToChainName = (networkMagic: Cardano.NetworkMagic): Wallet.ChainName => {
  switch (networkMagic) {
    case Wallet.Cardano.ChainIds.Mainnet.networkMagic:
      return 'Mainnet';
    case Wallet.Cardano.ChainIds.Preprod.networkMagic:
      return 'Preprod';
    case Wallet.Cardano.ChainIds.Preview.networkMagic:
      return 'Preview';
    case Wallet.Cardano.ChainIds.Sanchonet.networkMagic:
      return 'Sanchonet';
    default:
      throw new Error(`Unknown network magic: ${networkMagic}`);
  }
};

type FeatureFlags = BackgroundStorage['featureFlags'][0];
const isExperimentEnabled = (featureFlags: FeatureFlags, experimentName: ExperimentName) =>
  !!(featureFlags?.[experimentName] ?? false);

const getFeatureFlags = async (networkMagic: Cardano.NetworkMagic) => {
  const chainName = networkMagicToChainName(networkMagic);
  const backgroundStorage = await getBackgroundStorage();
  const magic = getMagicForChain(chainName);
  return backgroundStorage?.featureFlags?.[magic];
};

const createPouchdbWalletRepositoryStore = () =>
  new Wallet.storage.PouchDbCollectionStore<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>>(
    { dbName: 'walletRepository', computeDocId: (wallet) => wallet.walletId },
    logger
  );

type StoredWallet = AnyWallet<Wallet.WalletMetadata, Wallet.WalletMetadata>;
const createWalletRepositoryStore = (): Observable<storage.CollectionStore<StoredWallet>> =>
  from(
    (async () => {
      // wallet repository is always using feature flag of 'mainnet', because it has to be the same for all networks
      const featureFlags = await getFeatureFlags(Wallet.Cardano.ChainIds.Mainnet.networkMagic);
      if (isExperimentEnabled(featureFlags, ExperimentName.EXTENSION_STORAGE)) {
        const extensionStore = new ExtensionBlobCollectionStore<StoredWallet>('walletRepository', logger);
        const wallets = await firstValueFrom(extensionStore.getAll().pipe(defaultIfEmpty(null)));
        if (!wallets) {
          const pouchdbStore = createPouchdbWalletRepositoryStore();
          await migrateCollectionStore(pouchdbStore, extensionStore, logger);
        }
        return extensionStore;
      }

      return createPouchdbWalletRepositoryStore();
    })()
  );

// It is important that this file is not exported from index,
// because creating wallet repository with store creates an actual pouchdb database
// which results in some trash files when running the tests (leveldb directory)
export const walletRepository = new WalletRepository({
  logger,
  store$: createWalletRepositoryStore()
});

// eslint-disable-next-line unicorn/no-null
const currentWalletProviders$ = new BehaviorSubject<Wallet.WalletProvidersDependencies | null>(null);

const walletFactory: WalletFactory<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
  // eslint-disable-next-line complexity, max-statements
  create: async ({ chainId, accountIndex }, wallet, { stores, witnesser }) => {
    const chainName: Wallet.ChainName = networkMagicToChainName(chainId.networkMagic);
    let providers = await getProviders(chainName);

    const baseUrl = getBaseUrlForChain(chainName);

    // Sanchonet does not have a handle provider
    const supportsHandleResolver = chainName !== 'Sanchonet';

    // This is used in place ofgetProviders the handle provider for environments where the handle provider is not available
    const noopHandleResolver: HandleProvider = {
      resolveHandles: async () => [],
      healthCheck: async () => ({ ok: true }),
      getPolicyIds: async () => []
    };

    if ('wsProvider' in providers) {
      providers.wsProvider.health$.subscribe((check) => {
        requestMessage$.next({ type: MessageTypes.WS_CONNECTION, data: { connected: check.ok } });
      });
    }

    const featureFlags = await getFeatureFlags(chainId.networkMagic);

    if (wallet.type === WalletType.Script) {
      const stakingScript = wallet.stakingScript as SharedWalletScriptKind;
      const paymentScript = wallet.paymentScript as SharedWalletScriptKind;

      const sharedWallet = createSharedWallet(
        { name: wallet.metadata.name },
        {
          ...providers,
          logger,
          paymentScript,
          stakingScript,
          handleProvider: supportsHandleResolver
            ? handleHttpProvider({
                adapter: axiosFetchAdapter,
                baseUrl,
                logger
              })
            : noopHandleResolver,
          stores,
          witnesser
        }
      );

      // Caches current wallet providers.
      providers = { ...providers, inputResolver: { resolveInput: sharedWallet.util.resolveInput } };
      currentWalletProviders$.next(providers);

      return sharedWallet;
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

    const useWebSocket = isExperimentEnabled(featureFlags, ExperimentName.WEBSOCKET_API);
    const localPollingIntervalConfig = !Number.isNaN(Number(process.env.WALLET_POLLING_INTERVAL_IN_SEC))
      ? // eslint-disable-next-line no-magic-numbers
        Number(process.env.WALLET_POLLING_INTERVAL_IN_SEC) * 1000
      : DEFAULT_POLLING_CONFIG.pollInterval;

    const personalWallet = createPersonalWallet(
      {
        name: walletAccount.metadata.name,
        polling: {
          ...DEFAULT_POLLING_CONFIG,
          interval: useWebSocket ? DEFAULT_POLLING_CONFIG.pollInterval : localPollingIntervalConfig
        }
      },
      {
        logger,
        ...providers,
        stores,
        handleProvider: supportsHandleResolver
          ? handleHttpProvider({
              adapter: axiosFetchAdapter,
              baseUrl,
              logger
            })
          : noopHandleResolver,
        witnesser,
        bip32Account
      }
    );

    // Caches current wallet providers.
    providers = { ...providers, inputResolver: { resolveInput: personalWallet.util.resolveInput } };
    currentWalletProviders$.next(providers);

    return personalWallet;
  }
};

export const getBaseDbName = (name: string): string => name.replace(/[^\da-z]/gi, '');

const pouchdbStoresFactory: StoresFactory = {
  create: async ({ name }) => {
    const baseDbName = getBaseDbName(name);
    const docsDbName = `${baseDbName}Docs`;
    return {
      addresses: new storage.PouchDbAddressesStore(docsDbName, 'addresses', logger),
      assets: new storage.PouchDbAssetsStore(docsDbName, 'assets', logger),
      destroy() {
        if (!this.destroyed) {
          // since the database of document stores is shared, destroying any document store destroys all of them
          this.destroyed = true;
          logger.debug('Destroying PouchDb WalletStores...');
          const destroyDocumentsDb = this.tip.destroy();
          return combineLatest([
            destroyDocumentsDb,
            this.transactions.destroy(),
            this.utxo.destroy(),
            this.unspendableUtxo.destroy(),
            this.rewardsHistory.destroy(),
            this.stakePools.destroy(),
            this.rewardsBalances.destroy()
          ]).pipe(map(() => void 0));
        }
        return EMPTY;
      },
      destroyed: false,
      eraSummaries: new storage.PouchDbEraSummariesStore(docsDbName, 'EraSummaries', logger),
      genesisParameters: new storage.PouchDbGenesisParametersStore(docsDbName, 'genesisParameters', logger),
      inFlightTransactions: new storage.PouchDbInFlightTransactionsStore(docsDbName, 'transactionsInFlight_v3', logger),
      policyIds: new storage.PouchDbPolicyIdsStore(docsDbName, 'policyIds', logger),
      protocolParameters: new storage.PouchDbProtocolParametersStore(docsDbName, 'protocolParameters', logger),
      rewardsBalances: new storage.PouchDbRewardsBalancesStore(`${baseDbName}RewardsBalances`, logger),
      rewardsHistory: new storage.PouchDbRewardsHistoryStore(`${baseDbName}RewardsHistory`, logger),
      stakePools: new storage.PouchDbStakePoolsStore(`${baseDbName}StakePools`, logger),
      signedTransactions: new storage.PouchDbSignedTransactionsStore(baseDbName, 'signedTransactions', logger),
      tip: new storage.PouchDbTipStore(docsDbName, 'tip', logger),
      transactions: new storage.PouchDbTransactionsStore(
        {
          computeDocId: ({ blockHeader: { blockNo }, index }) =>
            /**
             * Multiplied by 100k to distinguish between blockNo=1,index=0 and blockNo=0,index=1
             * Assuming there can never be more >=100k transactions in a block
             */
            // eslint-disable-next-line no-magic-numbers
            (blockNo * 100_000 + index).toString(),
          dbName: `${baseDbName}Transactions_v3`
        },
        logger
      ),
      unspendableUtxo: new storage.PouchDbUtxoStore({ dbName: `${baseDbName}UnspendableUtxo` }, logger),
      utxo: new storage.PouchDbUtxoStore({ dbName: `${baseDbName}Utxo_v2` }, logger),
      volatileTransactions: new storage.PouchDbVolatileTransactionsStore(docsDbName, 'volatileTransactions_v4', logger)
    };
  }
};

export const extensionStorageStoresFactory: StoresFactory = {
  create: async ({ name }) => ({
    addresses: new ExtensionDocumentStore(`${name}_addresses`, logger),
    assets: new ExtensionDocumentStore(`${name}_assets`, logger),
    destroy() {
      if (!this.destroyed) {
        // since the database of document stores is shared, destroying any document store destroys all of them
        this.destroyed = true;
        logger.warn('Destroying wallet stores...');
        const destroyDocumentsDb = this.tip.destroy();
        return combineLatest([
          destroyDocumentsDb,
          this.transactions.destroy(),
          this.utxo.destroy(),
          this.unspendableUtxo.destroy(),
          this.rewardsHistory.destroy(),
          this.stakePools.destroy(),
          this.rewardsBalances.destroy()
        ]).pipe(map(() => void 0));
      }
      return EMPTY;
    },
    destroyed: false,
    eraSummaries: new ExtensionDocumentStore(`${name}_eraSummaries`, logger),
    genesisParameters: new ExtensionDocumentStore(`${name}_genesisParameters`, logger),
    inFlightTransactions: new ExtensionDocumentStore(`${name}_transactionsInFlight`, logger),
    policyIds: new ExtensionDocumentStore(`${name}_handlePolicyIds`, logger),
    protocolParameters: new ExtensionDocumentStore(`${name}_protocolParameters`, logger),
    rewardsBalances: new ExtensionBlobKeyValueStore(`${name}_rewardsBalances`, logger),
    rewardsHistory: new ExtensionBlobKeyValueStore(`${name}_rewardsHistory`, logger),
    stakePools: new ExtensionBlobKeyValueStore(`${name}_stakePools`, logger),
    signedTransactions: new ExtensionDocumentStore(`${name}_signedTransactions`, logger),
    tip: new ExtensionDocumentStore(`${name}_tip`, logger),
    transactions: new ExtensionBlobCollectionStore(`${name}_transactions`, logger),
    unspendableUtxo: new ExtensionBlobCollectionStore(`${name}_unspendableUtxo`, logger),
    utxo: new ExtensionBlobCollectionStore(`${name}_utxo`, logger),
    volatileTransactions: new ExtensionDocumentStore(`${name}_volatileTransactions`, logger)
  })
};

// Used for migrations to get feature flags, which are enabled per chainId
// This is coupled with WalletManager implementation (getWalletStoreId function)
const getNetworkMagic = (storeName: string) => Number.parseInt(storeName.split('-')[1]) as Cardano.NetworkMagic;

const storesFactory: StoresFactory = {
  async create(props) {
    const featureFlags = await getFeatureFlags(getNetworkMagic(props.name));
    if (isExperimentEnabled(featureFlags, ExperimentName.EXTENSION_STORAGE)) {
      const extensionStores = await extensionStorageStoresFactory.create(props);
      if (await shouldAttemptWalletStoresMigration(extensionStores)) {
        const pouchdbStores = await pouchdbStoresFactory.create(props);
        if (await migrateWalletStores(pouchdbStores, extensionStores, logger)) {
          // TODO: safe to destroy pouchdb stores on successful migration
          // once EXTENSION_STORAGE experiment runs in production for some time
          // and we are sure that it's working well
        }
      }
      return extensionStores;
    }
    return pouchdbStoresFactory.create(props);
  }
};

const walletInfo = {
  walletName: 'Bitcoin Wallet 1',
  publicKeyHex: '029bb34ca00cb77ec4ee55d08096ef3e615915841c1f2add83f4444ecea848c9f9',
  encryptedPrivateKeyHex: 'b2be18c1d5ab2e4c247e4e9047f6a27f40e5944d6ce03dfbffa6883b759ca1ef9269088b685afa050f12feb2100daaa2f2964b1d129cd9eb0fbd9e42c37a954b81cf692f8799ececeba035915a3802ed80a70a6a38c93c4a6c9a6f91',
  encryptedMnemonicsHex: 'd30980b9e9a0d2df3be5a060d5c153ad653125035df329c59044a642c30db4f28191e2d55d015cf28439c41e66cc2684464a8ed2cdfc953850d0b39bb4e356d501b9faea753af0dcbc0e626cbaa23bce1b3b7c662c373e785780c05584f245f9838c4ac6de49d02859f3e39592bd75612770242aead6c46a5a691c3d02dde5150c8364440b938706f486fcf396caa5a5ae3a7eb396f7892801c03a70b2337ae8d93f881bfecef3212352c9c64cd0bcb37a38e49aebb8775ecbb7cb020d458c83381f7d2116a6218e44995e1672655939785120ddc82bf9912af531b4',
  derivationPath: 'm/84\'/1\'/0\'/0/0'
};

const maestroProvider = new BitcoinWallet.MaestroBitcoinDataProvider(process.env.MAESTRO_PROJECT_ID_TESTNET, BitcoinWallet.Network.Testnet);
export const bitcoinWallet: BitcoinWallet.BitcoinWallet | undefined = new BitcoinWallet.BitcoinWallet(maestroProvider, 30000, 20, walletInfo, BitcoinWallet.Network.Testnet);

const bitcoinWalletProperties: RemoteApiProperties<BitcoinWallet.BitcoinWallet> = {
  getInfo: RemoteApiPropertyType.MethodReturningPromise,
  getNetwork: RemoteApiPropertyType.MethodReturningPromise,
  getAddress: RemoteApiPropertyType.MethodReturningPromise,
  getCurrentFeeMarket: RemoteApiPropertyType.MethodReturningPromise,
  submitTransaction: RemoteApiPropertyType.MethodReturningPromise,
  utxos$: RemoteApiPropertyType.HotObservable,
  balance$: RemoteApiPropertyType.HotObservable,
  transactionHistory$: RemoteApiPropertyType.HotObservable,
};

exposeApi(
  {
    api$: of(bitcoinWallet),
    baseChannel: repositoryChannel('bitcoin-wallet'),
    properties: bitcoinWalletProperties
  },
  { logger, runtime }
);

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
        api$: walletManager.activeWallet$.pipe(map((activeWallet) => activeWallet?.observableWallet || undefined)),
        baseChannel: walletChannel(process.env.WALLET_NAME),
        properties: observableWalletProperties
      },
      { logger, runtime }
    );

    exposeApi(
      {
        api$: currentWalletProviders$,
        baseChannel: Wallet.walletProvidersChannel(process.env.WALLET_NAME),
        properties: Wallet.walletProvidersProperties
      },
      { logger, runtime }
    );
  })
  .catch((error) => {
    logger.error('Failed to initialize wallet manager', error);
  });

cacheActivatedWalletAddressSubscription(walletManager, walletRepository);

cacheNamiMetadataSubscription({ walletManager, walletRepository });

export const wallet$ = walletManager.activeWallet$;
