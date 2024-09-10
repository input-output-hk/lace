import { runtime, storage as webStorage } from 'webextension-polyfill';
import { of, combineLatest, map, EMPTY } from 'rxjs';
import { getProviders } from './config';
import {
  DEFAULT_LOOK_AHEAD_SEARCH,
  HDSequentialDiscovery,
  createPersonalWallet,
  storage,
  createSharedWallet
} from '@cardano-sdk/wallet';
import { handleHttpProvider } from '@cardano-sdk/cardano-services-client';
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
import { Wallet } from '@lace/cardano';
import { Cardano, HandleProvider } from '@cardano-sdk/core';
import { cacheActivatedWalletAddressSubscription } from './cache-wallets-address';
import axiosFetchAdapter from '@shiroyasha9/axios-fetch-adapter';
import { SharedWalletScriptKind } from '@lace/core';
import { getBaseUrlForChain } from '@utils/chain';
import { cacheNamiMetadataSubscription } from './cache-nami-metadata';

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
      return 'Sanchonet';
    default:
      throw new Error(`Unknown network magic: ${chainId.networkMagic}`);
  }
};

const walletFactory: WalletFactory<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
  create: async ({ chainId, accountIndex }, wallet, { stores, witnesser }) => {
    const chainName: Wallet.ChainName = chainIdToChainName(chainId);
    const providers = await getProviders(chainName);

    const baseUrl = getBaseUrlForChain(chainName);

    // Sanchonet does not have a handle provider
    const supportsHandleResolver = chainName !== 'Sanchonet';

    // This is used in place of the handle provider for environments where the handle provider is not available
    const noopHandleResolver: HandleProvider = {
      resolveHandles: async () => [],
      healthCheck: async () => ({ ok: true }),
      getPolicyIds: async () => []
    };

    if (wallet.type === WalletType.Script) {
      const stakingScript = wallet.stakingScript as SharedWalletScriptKind;
      const paymentScript = wallet.paymentScript as SharedWalletScriptKind;

      return createSharedWallet(
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

    return createPersonalWallet(
      { name: walletAccount.metadata.name },
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
        addressDiscovery: new HDSequentialDiscovery(providers.chainHistoryProvider, DEFAULT_LOOK_AHEAD_SEARCH),
        witnesser,
        bip32Account
      }
    );
  }
};

export const getBaseDbName = (name: string): string => name.replace(/[^\da-z]/gi, '');

const storesFactory: StoresFactory = {
  create: ({ name }) => {
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

cacheActivatedWalletAddressSubscription(walletManager, walletRepository);

cacheNamiMetadataSubscription({ walletManager, walletRepository });

export const wallet$ = walletManager.activeWallet$;
