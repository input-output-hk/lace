/* eslint-disable unicorn/no-null, no-magic-numbers, promise/catch-or-return, promise/no-nesting */
import { runtime, storage as webStorage } from 'webextension-polyfill';
import {
  BehaviorSubject,
  combineLatest,
  defaultIfEmpty,
  EMPTY,
  firstValueFrom,
  from,
  map,
  Observable,
  of,
  Subject,
  tap
} from 'rxjs';
import { getProviders, SESSION_TIMEOUT } from './config';
import { createPersonalWallet, createSharedWallet, DEFAULT_POLLING_CONFIG, storage } from '@cardano-sdk/wallet';
import { handleHttpProvider } from '@cardano-sdk/cardano-services-client';
import { Cardano, HandleProvider } from '@cardano-sdk/core';
import {
  AnyWallet,
  consumeSigningCoordinatorApi,
  exposeApi,
  observableWalletProperties,
  repositoryChannel,
  StoresFactory,
  walletChannel,
  WalletFactory,
  WalletManager,
  walletManagerChannel,
  walletManagerProperties,
  WalletRepository,
  walletRepositoryProperties,
  WalletType
} from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { cacheActivatedWalletAddressSubscription } from './cache-wallets-address';
import axiosFetchAdapter from '@shiroyasha9/axios-fetch-adapter';
import { isBackgroundProcess } from '@cardano-sdk/util';
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
import { createUserSessionTracker, isLacePopupOpen$, isLaceTabActive$ } from './session';
import { TrackerSubject } from '@cardano-sdk/util-rxjs';
import { ExperimentName, FeatureFlags } from '../types/feature-flags';
import { TX_HISTORY_LIMIT_SIZE } from '@utils/constants';
import { Bitcoin } from '@lace/bitcoin';
import {
  bitcoinProviderProperties,
  BitcoinWalletFactory,
  BitcoinWalletManager,
  bitcoinWalletManagerProperties,
  bitcoinWalletProperties
} from './bitcoinWalletManager';
import { isBitcoinNetworkSwitchingDisabled } from '@utils/get-network-name';

if (!isBackgroundProcess()) {
  throw new TypeError('This module should only be imported in service worker');
}

export const dAppConnectorActivity$ = new Subject<void>();
const pollController$ = new TrackerSubject(
  createUserSessionTracker(isLacePopupOpen$, isLaceTabActive$, dAppConnectorActivity$, SESSION_TIMEOUT).pipe(
    tap((isActive) => logger.debug('Session active:', isActive))
  )
);

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
const currentBitcoinWalletProvider$ = new BehaviorSubject<Bitcoin.BlockchainDataProvider | null>(null);

const walletFactory: WalletFactory<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
  // eslint-disable-next-line complexity, max-statements
  create: async ({ chainId, accountIndex }, wallet, { stores, witnesser }) => {
    const chainName: Wallet.ChainName = networkMagicToChainName(chainId.networkMagic);
    const baseUrl = getBaseUrlForChain(chainName);
    let providers = await getProviders(chainName);

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

const bitcoinWalletFactory: BitcoinWalletFactory<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
  create: async ({ network, accountIndex }, wallet) => {
    // Override network for testnet if flag is off
    if (isBitcoinNetworkSwitchingDisabled()) {
      network = Bitcoin.Network.Testnet;
    }

    if (wallet.type !== WalletType.InMemory) {
      throw new Error('Unsupported wallet type for Bitcoin');
    }

    if (wallet.blockchainName !== 'Bitcoin') {
      throw new Error('Trying to activate a Cardano wallet as a Bitcoin wallet.');
    }

    const walletAccount = wallet.accounts.find((acc) => acc.accountIndex === accountIndex);
    if (!walletAccount) {
      throw new Error('Wallet account not found');
    }

    const provider =
      network === Bitcoin.Network.Testnet
        ? new Bitcoin.MaestroBitcoinDataProvider(process.env.MAESTRO_PROJECT_ID_TESTNET, Bitcoin.Network.Testnet)
        : new Bitcoin.MaestroBitcoinDataProvider(process.env.MAESTRO_PROJECT_ID_MAINNET, Bitcoin.Network.Mainnet);

    if (!walletAccount.metadata.bitcoin) {
      throw new Error('Bitcoin metadata not found');
    }

    const { extendedAccountPublicKeys } = walletAccount.metadata.bitcoin;

    const walletInfo = {
      walletName: wallet.metadata.name,
      accountIndex,
      encryptedSecrets: {
        mnemonics: wallet.encryptedSecrets.keyMaterial,
        seed: wallet.encryptedSecrets.rootPrivateKeyBytes
      },
      extendedAccountPublicKeys
    };

    const localPollingIntervalConfig = !Number.isNaN(Number(process.env.WALLET_POLLING_INTERVAL_IN_SEC))
      ? // eslint-disable-next-line no-magic-numbers
        Number(process.env.WALLET_POLLING_INTERVAL_IN_SEC) * 1000
      : 10_000;

    currentBitcoinWalletProvider$.next(provider);
    return new Bitcoin.BitcoinWallet(provider, localPollingIntervalConfig, 20, walletInfo, network);
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

export const bitcoinWalletManager = new BitcoinWalletManager(
  { name: `${process.env.WALLET_NAME}-bitcoin` },
  {
    walletRepository,
    logger,
    runtime,
    storesFactory,
    walletFactory: bitcoinWalletFactory,
    managerStorage: webStorage.local
  }
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

    bitcoinWalletManager.initialize().then(() => {
      exposeApi(
        {
          api$: of(bitcoinWalletManager),
          baseChannel: 'bitcoin-wallet-manager',
          properties: bitcoinWalletManagerProperties
        },
        { logger, runtime }
      );

      exposeApi(
        {
          api$: bitcoinWalletManager.activeWallet$.pipe(map((activeWallet) => activeWallet?.wallet || undefined)),
          baseChannel: 'bitcoin-wallet',
          properties: bitcoinWalletProperties
        },
        { logger, runtime }
      );

      exposeApi(
        {
          api$: currentBitcoinWalletProvider$,
          baseChannel: 'bitcoin-wallet-providers',
          properties: bitcoinProviderProperties
        },
        { logger, runtime }
      );
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize wallet manager', error);
  });

cacheActivatedWalletAddressSubscription(walletManager, walletRepository);

cacheNamiMetadataSubscription({ walletManager, walletRepository });

export const wallet$ = walletManager.activeWallet$;
export const bitcoinWallet$ = bitcoinWalletManager.activeWallet$;
