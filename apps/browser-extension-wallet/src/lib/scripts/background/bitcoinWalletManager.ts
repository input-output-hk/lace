/* eslint-disable prettier/prettier, unicorn/no-null, consistent-return, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-non-null-assertion */
import {
  AnyWallet,
  WalletRepository,
  WalletType,
  WalletId,
  AnyBip32Wallet,
  MessengerDependencies,
  RemoteApiProperties,
  RemoteApiPropertyType
} from '@cardano-sdk/web-extension';
import { Logger } from 'ts-log';
import { storage } from '@cardano-sdk/wallet';
import { Bitcoin } from '@lace/bitcoin';
import { BehaviorSubject, firstValueFrom, lastValueFrom, Observable, ReplaySubject } from 'rxjs';
import { Storage } from 'webextension-polyfill';
import { InvalidArgumentError } from '@cardano-sdk/util';

export interface BitcoinWalletManagerProps {
  name: string;
}

export interface BitcoinWalletManagerActivateProps {
  walletId: WalletId;
  accountIndex?: number;
  network: Bitcoin.Network;
}

export interface BitcoinWalletManagerApi {
  activeWalletId$: Observable<BitcoinWalletManagerActivateProps | null>;

  /**
   * Create and activate a new BitcoinWallet.
   * Reuses the store if the wallet was previously deactivated but not destroyed.
   */
  activate(props: BitcoinWalletManagerActivateProps, force?: boolean): Promise<void>;

  /**
   * Switches the network of the active wallet.
   *
   * @param network The network to switch to.
   */
  switchNetwork(network: Bitcoin.Network): Promise<void>;

  /**
   * Deactivate wallet. Wallet observable properties will emit only after a new wallet is activated.
   * The wallet store will be reused if the wallet is reactivated.
   */
  deactivate(): Promise<void>;

  /**
   * Destroy the specified store so that a future activation of the same wallet creates a new store.
   *
   * This method will destroy all stores for all accounts for the given ChainId.
   *
   * @param walletId The walletId of the wallet to destroy.
   * @param network The chainId of the network to destroy the wallet in.
   */
  destroyData(walletId: WalletId, network: Bitcoin.Network): Promise<void>;
}

export interface BitcoinWalletFactory<
  WalletMetadata extends { name: string },
  AccountMetadata extends {
    name: string;
  }
> {
  create: (
    props: BitcoinWalletManagerActivateProps,
    wallet: AnyWallet<WalletMetadata, AccountMetadata>,
    dependencies: { stores: storage.WalletStores }
  ) => Promise<Bitcoin.BitcoinWallet>;
}

export interface StoresFactory {
  create: (props: { name: string }) => Promise<storage.WalletStores>;
}

/**
 * Checks if the wallet is a bip32 wallet.
 *
 * @param wallet The wallet to check.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAnyBip32Wallet = (wallet: AnyWallet<any, any>): wallet is AnyBip32Wallet<any, any> =>
  wallet.type === WalletType.InMemory || wallet.type === WalletType.Ledger || wallet.type === WalletType.Trezor;

export const getWalletStoreId = (walletId: WalletId, network: Bitcoin.Network, accountIndex?: number): string =>
  `${network}-${walletId}-${accountIndex}`;

export interface BitcoinWalletManagerDependencies<
  WalletMetadata extends { name: string },
  AccountMetadata extends { name: string }
> {
  walletFactory: BitcoinWalletFactory<WalletMetadata, AccountMetadata>;
  storesFactory: StoresFactory;
  managerStorage: Storage.StorageArea;
  walletRepository: WalletRepository<WalletMetadata, AccountMetadata>;
}

export interface BitcoinActiveWallet {
  wallet: Bitcoin.BitcoinWallet;
  props: BitcoinWalletManagerActivateProps;
}

/**
 * Helper class for background scripts using wallet manager.
 * Uses wallet and store factories to create wallets.
 * Keeps track of created stores and reuses them when a wallet is reactivated.
 */
export class BitcoinWalletManager<WalletMetadata extends { name: string }, AccountMetadata extends { name: string }>
  implements BitcoinWalletManagerApi
{
  activeWalletId$ = new ReplaySubject<BitcoinWalletManagerActivateProps | null>(1);
  activeWallet$ = new BehaviorSubject<BitcoinActiveWallet | null>(null);
  #activeWalletProps: BitcoinWalletManagerActivateProps | null = null;
  #walletStores = new Map<string, storage.WalletStores>();
  #walletFactory: BitcoinWalletFactory<WalletMetadata, AccountMetadata>;
  #storesFactory: StoresFactory;
  #walletRepository: WalletRepository<WalletMetadata, AccountMetadata>;
  #logger: Logger;
  #managerStorageKey: string;
  #managerStorage: Storage.StorageArea;

  constructor(
    { name }: BitcoinWalletManagerProps,
    {
      walletFactory,
      storesFactory,
      logger,
      managerStorage,
      walletRepository
    }: MessengerDependencies & BitcoinWalletManagerDependencies<WalletMetadata, AccountMetadata>
  ) {
    this.#walletRepository = walletRepository;

    this.#walletFactory = walletFactory;
    this.#managerStorageKey = `${name}-active-wallet`;
    this.#managerStorage = managerStorage;
    this.#storesFactory = storesFactory;
    this.#logger = logger;
  }

  /**
   * Switches the network of the active wallet.
   *
   * @param network The network id to switch to.
   */
  switchNetwork(network: Bitcoin.Network): Promise<void> {
    if (!this.#hasBitcoinActiveWallet()) return Promise.resolve();

    const props = { ...this.#activeWalletProps!, network };
    return this.activate(props);
  }

  /** `activate` the wallet with props of last activated wallet (load from `managerStorage`) */
  async initialize() {
    const { [this.#managerStorageKey]: lastActivateProps } = await this.#managerStorage.get(this.#managerStorageKey);

    if (!lastActivateProps) {
      this.activeWalletId$.next(null);
      return;
    }

    return this.activate(lastActivateProps);
  }

  /**
   * Create and activate a new ObservableWallet.
   *
   * @param props - An object containing the necessary properties and configurations to activate the wallet.
   * @param force - Optional. A boolean flag that determines the activation behavior. If set to `true`,
   *                the wallet will be activated regardless of whether its properties have changed since
   *                the last activation. This is useful for scenarios where reinitialization is needed
   *                without changes to the properties. Defaults to `false`, meaning the wallet will only
   *                be activated if there have been changes in the `props`.
   * @returns A Promise that resolves once the wallet has been successfully activated.
   */
  async activate(props: BitcoinWalletManagerActivateProps, force?: boolean): Promise<void> {
    if (!force && this.#isActive(props)) {
      return;
    }

    const { walletId, network, accountIndex } = props;

    const wallets = await firstValueFrom(this.#walletRepository.wallets$);
    const activeWallet = wallets.find((wallet) => wallet.walletId === walletId);

    if (!activeWallet) {
      throw new InvalidArgumentError('walletId', `Wallet ${walletId} not found`);
    }

    this.#deactivateWallet();
    this.#activeWalletProps = props;

    const walletStoreId = getWalletStoreId(walletId, network, accountIndex);
    const stores = await this.#getStores(walletStoreId);

    const [wallet] = await Promise.all([
      this.#walletFactory.create(props, activeWallet, { stores }),
      this.#managerStorage.set({
        [this.#managerStorageKey]: props
      })
    ]);

    this.activeWallet$.next({ wallet, props });

    this.activeWalletId$.next(props);
  }

  /** Deactivate wallet. Wallet observable properties will emit only after a new wallet is {@link activate}ed. */
  async deactivate(): Promise<void> {
    this.#deactivateWallet();
    await this.#managerStorage.remove(this.#managerStorageKey);
    this.activeWalletId$.next(null);
  }

  /** Deactivates the active. */
  shutdown(): void {
    this.#deactivateWallet();
  }

  /**
   * Deactivates the active wallet and destroy its existing store.
   *
   * @param walletId The walletId of the wallet to destroy.
   * @param network The network of the wallet to destroy.
   */
  async destroyData(walletId: WalletId, network: Bitcoin.Network): Promise<void> {
    await this.#destroyWalletStores(walletId, network);
  }

  /**
   * Checks if the wallet is active.
   *
   * @param walletProps The wallet properties to check.
   * @private
   */
  #isActive(walletProps: BitcoinWalletManagerActivateProps): boolean {
    if (!this.#activeWalletProps) return false;

    return (
      this.#activeWalletProps?.walletId === walletProps.walletId &&
      this.#activeWalletProps?.accountIndex === walletProps.accountIndex &&
      this.#activeWalletProps?.network === walletProps.network
    );
  }

  /** Gets store if wallet was activated previously or creates one when wallet is activated for the first time. */
  async #getStores(walletStoreName: string): Promise<storage.WalletStores> {
    let stores = this.#walletStores.get(walletStoreName);
    if (!stores) {
      stores = await this.#storesFactory.create({ name: walletStoreName });
      this.#walletStores.set(walletStoreName, stores);
    }
    return stores;
  }

  /**
   * Destroys all stores for the given wallet id.
   *
   * @param walletId The wallet id to destroy.
   * @param network The chain id to destroy.
   * @private
   */
  async #destroyWalletStores(walletId: WalletId, network: Bitcoin.Network): Promise<void> {
    if (this.#activeWalletProps?.walletId === walletId)
      throw new InvalidArgumentError('walletId', 'Cannot destroy active wallet');

    const knownWallets = await firstValueFrom(this.#walletRepository.wallets$);

    const storeIds = knownWallets
      .flatMap((wallet) => {
        if (isAnyBip32Wallet(wallet)) {
          return wallet.accounts.map((account) => getWalletStoreId(wallet.walletId, network, account.accountIndex));
        }

        return getWalletStoreId(wallet.walletId, network);
      })
      .filter((id) => id.includes(walletId));

    if (!storeIds || storeIds.length === 0) return;

    for (const walletStoreId of storeIds) {
      const walletStores = await this.#getStores(walletStoreId);

      this.#logger.debug(`Destroying wallet store ${walletStoreId}`);

      // Added a defaultValue to avoid throw due to observable complete without emitting any values.
      await lastValueFrom(walletStores.destroy(), { defaultValue: null });

      this.#walletStores.delete(walletStoreId);
    }
  }

  /**
   * Deactivates the active wallet.
   *
   * @private
   */
  #deactivateWallet(): void {
    const wallet = this.activeWallet$?.getValue();
    // Consumers are subscribed to the wallet observable properties.
    // Do not shutdown the active wallet while these subscriptions are still coupled with the observed wallet.
    // Instead, first decouple the active wallet from the observed wallet.
    this.#stopEmittingFromBitcoinActiveWallet();
    wallet?.wallet.shutdown();
    this.#activeWalletProps = null;
  }

  /**
   * Checks if the wallet is active.
   *
   * @private
   */
  #hasBitcoinActiveWallet(): boolean {
    return this.#activeWalletProps !== null;
  }

  /**
   * Stops emitting from the active wallet.
   *
   * @private
   */
  #stopEmittingFromBitcoinActiveWallet(): void {
    this.#hasBitcoinActiveWallet() && this.activeWallet$.next(null);
  }
}

export const bitcoinWalletProperties: RemoteApiProperties<Bitcoin.BitcoinWallet> = {
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
  syncStatus: {
    isAnyRequestPending$: RemoteApiPropertyType.HotObservable,
    isSettled$: RemoteApiPropertyType.HotObservable,
    isUpToDate$: RemoteApiPropertyType.HotObservable
  }
};

export const bitcoinWalletManagerProperties: RemoteApiProperties<BitcoinWalletManagerApi> = {
  activate: RemoteApiPropertyType.MethodReturningPromise,
  activeWalletId$: RemoteApiPropertyType.HotObservable,
  deactivate: RemoteApiPropertyType.MethodReturningPromise,
  destroyData: RemoteApiPropertyType.MethodReturningPromise,
  switchNetwork: RemoteApiPropertyType.MethodReturningPromise
};

export const bitcoinProviderProperties: RemoteApiProperties<Bitcoin.BlockchainDataProvider> = {
  getLastKnownBlock: RemoteApiPropertyType.MethodReturningPromise,
  getTransaction: RemoteApiPropertyType.MethodReturningPromise,
  getTransactions: RemoteApiPropertyType.MethodReturningPromise,
  getTransactionsInMempool: RemoteApiPropertyType.MethodReturningPromise,
  getUTxOs: RemoteApiPropertyType.MethodReturningPromise,
  submitTransaction: RemoteApiPropertyType.MethodReturningPromise,
  getTransactionStatus: RemoteApiPropertyType.MethodReturningPromise,
  estimateFee: RemoteApiPropertyType.MethodReturningPromise
};
