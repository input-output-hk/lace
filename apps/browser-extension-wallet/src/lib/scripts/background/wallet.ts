/* eslint-disable unicorn/no-null */
import { runtime, storage as webStorage } from 'webextension-polyfill';
import {
  of,
  combineLatest,
  map,
  EMPTY,
  BehaviorSubject,
  Observable,
  from,
  firstValueFrom,
  defaultIfEmpty,
  Subject,
  tap
} from 'rxjs';
import { getProviders, SESSION_TIMEOUT } from './config';
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
import { requestMessage$ } from './services/utilityServices';
import { MessageTypes } from '../types';
import { ExtensionDocumentStore } from './storage/extension-document-store';
import { ExtensionBlobKeyValueStore } from './storage/extension-blob-key-value-store';
import { ExtensionBlobCollectionStore } from './storage/extension-blob-collection-store';
import { migrateCollectionStore, migrateWalletStores, shouldAttemptWalletStoresMigration } from './storage/migrations';
import { isLacePopupOpen$, createUserSessionTracker, isLaceTabActive$ } from './session';
import { TrackerSubject } from '@cardano-sdk/util-rxjs';
import { ExperimentName, FeatureFlags } from '../types/feature-flags';
import { TX_HISTORY_LIMIT_SIZE } from '@utils/constants';

export const dAppConnectorActivity$ = new Subject<void>();
const pollController$ = new TrackerSubject(
  createUserSessionTracker(isLacePopupOpen$, isLaceTabActive$, dAppConnectorActivity$, SESSION_TIMEOUT).pipe(
    tap((isActive) => logger.debug('Session active:', isActive))
  )
);
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
      const extensionStore = new ExtensionBlobCollectionStore<StoredWallet>('walletRepository', logger);
      const wallets = await firstValueFrom(extensionStore.getAll().pipe(defaultIfEmpty(null)));
      if (!wallets) {
        const pouchdbStore = createPouchdbWalletRepositoryStore();
        await migrateCollectionStore(pouchdbStore, extensionStore, logger);
      }
      return extensionStore;
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
    webStorage.onChanged.addListener((changes) => {
      const oldLogLevelValue = changes.BACKGROUND_STORAGE?.oldValue?.logLevel;
      const newLogLevelValue = changes.BACKGROUND_STORAGE?.newValue?.logLevel;
      if (oldLogLevelValue !== newLogLevelValue) {
        logger.setLogLevel(newLogLevelValue);
      }
    });

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
        { name: 'Shared' },
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
          pollController$,
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
        name: 'Personal',
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
        pollController$,
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
      rewardsHistory: new storage.PouchDbRewardsHistoryStore(`${baseDbName}RewardsHistory`, logger),
      delegationPortfolio: new storage.PouchDbDelegationPortfolioStore(docsDbName, 'delegationPortfolio', logger),
      rewardAccountInfo: new storage.PouchDbRewardAccountInfoStore(`${baseDbName}RewardAccountsInfo`, logger),
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
    delegationPortfolio: new ExtensionDocumentStore(`${name}_delegationPortfolio`, logger),
    rewardAccountInfo: new ExtensionBlobKeyValueStore(`${name}_rewardAccountInfo`, logger),
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

const storesFactory: StoresFactory = {
  async create(props) {
    const extensionStores = await extensionStorageStoresFactory.create(props);
    if (await shouldAttemptWalletStoresMigration(extensionStores)) {
      const pouchdbStores = await pouchdbStoresFactory.create(props);
      if (await migrateWalletStores(pouchdbStores, extensionStores, logger)) {
        // TODO: safe to destroy pouchdb stores on successful migration
        // once EXTENSION_STORAGE experiment runs in production for some time
        // and we are sure that it's working well
      }
    }

    const transactions = await firstValueFrom(extensionStores.transactions.getAll().pipe(defaultIfEmpty([])));

    if (transactions.length > TX_HISTORY_LIMIT_SIZE) {
      await firstValueFrom(extensionStores.transactions.setAll(transactions.slice(-TX_HISTORY_LIMIT_SIZE)));
    }

    return extensionStores;
  }
};

const walletInfo = {
  walletName: "Bitcoin Wallet 1",
  accountIndex: 0,
  encryptedSecrets: {
    mnemonics: "6300f91cde4e7048badf22c2ee76a47103f932e3d4c26a72e67593bafce415ca4dfbda026f86bf063a1b950e0f9938c7051b5a7cfbc80a616794b49c9e1b358839375a0b751486a118c659b73eae61fcd34944981a500503c25522510bf51cab5ef31a7929bc2d78e8f81a35ad7597dcf20ac0c3b6affa25dc48ca6f86fcba9d5f2c656ceb53e7f0d0bfa91932fbbfb48971f53076b37afddd8dc7afe81abfcfeb40b1c760cafef03b246f8e23fd218b6639691605771c64d4a1a76619756732d207cbb35fe539837dcffe0a382261082b71155ca95e5f3659c25b5b",
    seed: "17c59e55ea15fb107a922cd20e11a98ebf36a247544686793d4dbcf8c2ee8e155e2fba6b388533ed519a918011dd99947819e1f1350e3d0475dd9d16cb7b816e75a38dc3db20b8e269a1031152fea8dd65a433d18578e44314137a655828aca699fade2b13bbe35add766db4870c78d6cc6fa12a00bd37f921c94b39"
  },
  extendedAccountPublicKeys: {
    mainnet: {
      legacy: "xpub6CXqm3qd33LhU2AMmUnKjsgZuBZQfNPZ6ww3tbVpBNYZjbcPLTU43beBUvmMpMGsLQ2SKisS38FgQdKS5WtVy8fa46GokjgBVeUkwVzApTR",
      segWit: "xpub6DWj4HZsHB273iZThWdcBwvCxvDRWQkwSi3SjPQje5RvVbrKc61GoqVaHtkN2ha3sJCHEaFXSjsFNFgTfDMrFmHD848QRUtL9ZcRYtymKN6",
      nativeSegWit: "xpub6DQVZkr4QyJR5RiBtTqSZg2WTHxo9D1jcexG4WjFCwQfwy9XUQ7vM8QFeXeBcGUuCXeBsPCZ525WGuhm6dE6tcyU9aUiGm9EotXYvfTwBqt",
      taproot: "xpub6DSS1V32GwHMqZihBK9JaZgd6xnVugkEkPaSkbZgAYbzZC41nbUqcuH2N3tgeFMWudvJuYfX8kqWsKUd4oj3H3cUR6mPySGPL3PV6yzu7ko",
      electrumNativeSegWit: "xpub6D3Tc2KGUuhyTv5EdgR5eUmgG4Ai7DzYrsRCimRC9vYZLXcuKsFVkWySGPrsdqUsvpLDyiXeRJ9kKzTZVrtTWm8BUc539mQ2VGEnQwkiKox"
    },
    testnet: {
      legacy: "xpub6CLkFqDprtawP8VB21Hzgy5jhwgg7FhDDfJeeNn8Afv5supgd2V38x3E3R5om1ZN7avQiL6gcpYAQX71391WvmfymybGeyxEnHzEWBFQMrY",
      segWit: "xpub6C99JbTvGxYtBXEHUG7HMe8hJq9GFFRaAw5JsHprckQGmQCbqzDbRiznL3Shc8fsAxAa1GVhKdFYL4pFsgKh5hhS9Ddg5Ni6NSUgMzFprqF",
      nativeSegWit: "xpub6CrzGDoCVV56RUEdoKWVVXCA5JUJr9PQMQvXaUiGKjfBzZgwkJtKtHfvz3rCDnVL4qriaeZixHARX5MifcSDzZMnwBGVng5AqLZrsE1sUg1",
      taproot: "xpub6CZnCLkMMgC8aDH1yMeQeZnLGk7qeRxSG8pwHQvb2dkbXAuRopV57RoZLBUqBWMmiqxCaDDwpVWFCfLLAAJkWW4NCy4CKB4U2UUx95hnTYN",
      electrumNativeSegWit: "xpub6Bju9NoEG4m4x95tv1uX5fu7cCKf3ormkGbV3qtsvnwRqUmqcmCrej8RGQGmxWJRN23gfpZstUZ1uMnxUgkHju5udzPXqrJqDsq719UwXHj"
    }
  }
}

const maestroProvider = new BitcoinWallet.MaestroBitcoinDataProvider(process.env.MAESTRO_PROJECT_ID_TESTNET, BitcoinWallet.Network.Testnet);
export let bitcoinWallet: BitcoinWallet.BitcoinWallet | undefined = new BitcoinWallet.BitcoinWallet(maestroProvider, 10000, 20, walletInfo, BitcoinWallet.Network.Testnet);

export const deactivateBitcoinWallet = async () => {
  // top polling
  bitcoinWallet = undefined;
};

export const activateBitcoinWallet = async () => {
};

export const switchBitcoinNetwork = async () => {
};

const bitcoinWalletProperties: RemoteApiProperties<BitcoinWallet.BitcoinWallet> = {
  getInfo: RemoteApiPropertyType.MethodReturningPromise,
  getNetwork: RemoteApiPropertyType.MethodReturningPromise,
  getAddress: RemoteApiPropertyType.MethodReturningPromise,
  getCurrentFeeMarket: RemoteApiPropertyType.MethodReturningPromise,
  submitTransaction: RemoteApiPropertyType.MethodReturningPromise,
  utxos$: RemoteApiPropertyType.HotObservable,
  balance$: RemoteApiPropertyType.HotObservable,
  transactionHistory$: RemoteApiPropertyType.HotObservable,
  pendingTransactions$: RemoteApiPropertyType.HotObservable,
  addresses$: RemoteApiPropertyType.HotObservable,
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
