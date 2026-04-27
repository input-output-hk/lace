import { deepEquals } from '@cardano-sdk/util';
import {
  convertHttpUrlToWebsocket,
  MidnightDustAddress,
  MidnightShieldedAddress,
  MidnightUnshieldedAddress,
  midnightWallets$,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { BigNumber, HexBytes, Milliseconds } from '@lace-sdk/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  DustAddress,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { CustomShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { V1Builder } from '@midnight-ntwrk/wallet-sdk-shielded/v1';
import {
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import {
  catchError,
  defaultIfEmpty,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  forkJoin,
  from,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  take,
  throwError,
  throttleTime,
  toArray,
  zip,
} from 'rxjs';

// TODO: try to fix import
// eslint-disable-next-line @nx/enforce-module-boundaries
import { makeEventsSyncCapability } from '../../../../../node_modules/@midnight-ntwrk/wallet-sdk-shielded/dist/v1/Sync';

import { computeConnectedSyncRatio } from './compute-sync-ratio';
import { makeDeferredShieldedSyncService } from './deferred-sync-service';

import type {
  AccountKeyManager,
  CoinsByTokenType,
  MidnightSideEffectsDependencies,
  MidnightWallet,
  SerializedMidnightWallet,
  CoinStatus,
  MidnightAccountId,
  StartMidnightAccountWalletParams,
} from '@lace-contract/midnight-context';
import type { LaceInitSync } from '@lace-contract/module';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { WithLogger } from '@lace-sdk/util';
import type { DefaultConfiguration } from '@midnight-ntwrk/wallet-sdk-facade';
import type { Subscription } from 'rxjs';

/**
 * Wraps keyManager.keys$ with recovery for AuthenticationCancelledError.
 * If the user cancels the auth prompt, waits for keys to become available
 * from another source (e.g., shielded sync triggering a separate auth flow)
 * and retries — same pattern used by the deferred sync service.
 */
const keysWithAuthCancelledRecovery$ = (
  keyManager: Pick<AccountKeyManager, 'areKeysAvailable$' | 'keys$'>,
) =>
  keyManager.keys$.pipe(
    take(1),
    catchError((error: unknown) => {
      if (!(error instanceof AuthenticationCancelledError))
        return throwError(() => error as Error);
      return keyManager.areKeysAvailable$.pipe(
        filter(available => available),
        take(1),
        switchMap(() => keyManager.keys$.pipe(take(1))),
      );
    }),
  );

// Only create new serialized state every 5 seconds
const STATE_SERIALISATION_THROTTLE_TIME = Milliseconds(5000);

type MidnightAccountWalletInstanceDependencies =
  StartMidnightAccountWalletParams;

type AccountWalletInstanceResult = {
  walletFacade: WalletFacade;
  unshieldedTxHistoryStorage: InMemoryTransactionHistoryStorage;
};

const getAccountWalletInstance = async ({
  account,
  config,
  store,
  keyManager,
}: MidnightAccountWalletInstanceDependencies): Promise<AccountWalletInstanceResult> => {
  const states = await firstValueFrom(store.getAll().pipe(defaultIfEmpty([])));

  const walletState = states.find(
    state => state.accountId === account.accountId,
  );

  const indexerClientConnection = {
    indexerHttpUrl: config.indexerAddress,
    indexerWsUrl: convertHttpUrlToWebsocket(config.indexerAddress),
    keepAlive: 45_000,
  };
  const { networkId } = account.blockchainSpecific;

  const configuration: DefaultConfiguration = {
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
    networkId,
    batchSize: 60,
    indexerClientConnection,
    provingServerUrl: new URL(config.proofServerAddress),
    relayURL: new URL(convertHttpUrlToWebsocket(config.nodeAddress)),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  };

  const shieldedWalletBuilder = new V1Builder()
    .withDefaults()
    .withSync(
      makeDeferredShieldedSyncService(keyManager),
      makeEventsSyncCapability,
    );

  // Restore wallet

  if (walletState) {
    const unshieldedTxHistoryStorage =
      InMemoryTransactionHistoryStorage.fromSerialized(
        HexBytes.toUTF8(walletState.serializedState.unshieldedTxHistory),
      );
    configuration.txHistoryStorage = unshieldedTxHistoryStorage;

    return {
      walletFacade: await WalletFacade.init({
        configuration,
        shielded: config =>
          CustomShieldedWallet(config, shieldedWalletBuilder).restore(
            HexBytes.toUTF8(walletState.serializedState.shielded),
          ),
        unshielded: config =>
          UnshieldedWallet(config).restore(
            HexBytes.toUTF8(walletState.serializedState.unshielded),
          ),
        dust: config =>
          DustWallet(config).restore(
            HexBytes.toUTF8(walletState.serializedState.dust),
          ),
      }),
      unshieldedTxHistoryStorage,
    };
  }

  // Else create new wallet

  const {
    walletKeys: { dustKeyBuffer, zswapKeyBuffer },
    unshieldedKeystore,
  } = await firstValueFrom(keysWithAuthCancelledRecovery$(keyManager));
  const dustParameters = ledger.LedgerParameters.initialParameters().dust;
  const unshieldedTxHistoryStorage = new InMemoryTransactionHistoryStorage();

  return {
    walletFacade: await WalletFacade.init({
      configuration,
      shielded: config =>
        CustomShieldedWallet(config, shieldedWalletBuilder).startWithSeed(
          zswapKeyBuffer,
        ),
      unshielded: config =>
        UnshieldedWallet(config).startWithPublicKey(
          PublicKey.fromKeyStore(unshieldedKeystore),
        ),
      dust: config =>
        DustWallet(config).startWithSeed(dustKeyBuffer, dustParameters),
    }),
    unshieldedTxHistoryStorage,
  };
};

/**
 * Creates an observable MidnightWallet from wallet instances.
 *
 * The nightVerifyingKey is obtained from the wallet state, which works
 * for both restored and new wallets.
 */
const createAccountObservableMidnightWallet = ({
  account,
  keyManager,
  walletFacade,
}: {
  account: StartMidnightAccountWalletParams['account'];
  keyManager: StartMidnightAccountWalletParams['keyManager'];
  walletFacade: WalletFacade;
}): Observable<MidnightWallet> => {
  const { networkId } = account.blockchainSpecific;

  const state$ = walletFacade
    .state()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  // Get nightVerifyingKey from first state emission - works for both restored and new wallets
  return state$.pipe(
    take(1),
    map(initialState => {
      const nightVerifyingKey =
        initialState.unshielded.capabilities.keys.getPublicKey(
          initialState.unshielded.state,
        );

      return {
        accountId: account.accountId as MidnightAccountId,
        areKeysAvailable$: keyManager.areKeysAvailable$,
        networkId,
        nightVerifyingKey,
        walletId: account.walletId,

        address$: state$.pipe(
          map(({ dust, shielded, unshielded }) => ({
            dust: MidnightDustAddress(
              DustAddress.codec
                .encode(
                  networkId,
                  dust.capabilities.keys.getAddress(dust.state),
                )
                .asString(),
            ),
            shielded: MidnightShieldedAddress(
              ShieldedAddress.codec
                .encode(networkId, shielded.address)
                .asString(),
            ),
            unshielded: MidnightUnshieldedAddress(
              UnshieldedAddress.codec
                .encode(networkId, unshielded.address)
                .asString(),
            ),
          })),
          distinctUntilChanged(deepEquals),
        ),

        coinsByTokenType$: state$.pipe(
          map(({ shielded, unshielded }) => {
            const shieldedCoins: CoinsByTokenType = {};
            const unshieldedCoins: CoinsByTokenType = {};

            for (const { coin } of shielded.totalCoins) {
              const previousCoinsList = shieldedCoins[coin.type] || [];
              shieldedCoins[coin.type] = previousCoinsList.concat({
                status: 'mt_index' in coin ? 'available' : 'pending',
                value: BigNumber(coin.value),
              });
            }

            const parseUnshieldedCoins = (
              status: CoinStatus,
              coins: readonly {
                meta: { readonly registeredForDustGeneration: boolean };
                utxo: ledger.Utxo;
              }[],
            ) => {
              for (const { meta, utxo } of coins) {
                const tokenType = toUnshieldedTokenType(utxo.type, networkId);
                const previousCoinsList = unshieldedCoins[tokenType] || [];
                unshieldedCoins[tokenType] = previousCoinsList.concat({
                  status,
                  value: BigNumber(utxo.value),
                  registeredForDustGeneration: meta.registeredForDustGeneration,
                  ownerAddress: utxo.owner,
                });
              }
            };

            parseUnshieldedCoins('pending', unshielded.pendingCoins);
            parseUnshieldedCoins('available', unshielded.availableCoins);

            return {
              shielded: shieldedCoins,
              unshielded: unshieldedCoins,
            };
          }),
          distinctUntilChanged(deepEquals),
        ),

        syncProgress$: state$.pipe(
          map(({ dust, shielded, unshielded }) => ({
            dust: computeConnectedSyncRatio(
              dust.state.progress.appliedIndex,
              dust.state.progress.highestRelevantWalletIndex,
              dust.state.progress.isConnected,
            ),
            shielded: computeConnectedSyncRatio(
              shielded.state.progress.appliedIndex,
              shielded.state.progress.highestRelevantWalletIndex,
              shielded.state.progress.isConnected,
            ),
            unshielded: computeConnectedSyncRatio(
              unshielded.state.progress.appliedId,
              unshielded.state.progress.highestTransactionId,
              unshielded.state.progress.isConnected,
            ),
            isStrictlyComplete: {
              dust: dust.state.progress.isStrictlyComplete(),
              shielded: shielded.state.progress.isStrictlyComplete(),
              unshielded: unshielded.state.progress.isStrictlyComplete(),
            },
          })),
          distinctUntilChanged(deepEquals),
        ),
        transactionHistory$: state$.pipe(
          throttleTime(500, undefined, { leading: true, trailing: true }),
          switchMap(({ unshielded }) =>
            from(unshielded.transactionHistory.getAll()).pipe(toArray()),
          ),
          distinctUntilChanged(deepEquals),
        ),

        balanceFinalizedTransaction: (tx, { ttl, tokenKindsToBalance }) =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ walletKeys: { dustSecretKey, zswapSecretKeys } }) =>
              from(
                walletFacade.balanceFinalizedTransaction(
                  tx,
                  {
                    shieldedSecretKeys: zswapSecretKeys,
                    dustSecretKey: dustSecretKey,
                  },
                  { ttl, tokenKindsToBalance },
                ),
              ),
            ),
          ),
        balanceUnboundTransaction: (tx, { ttl, tokenKindsToBalance }) =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ walletKeys: { dustSecretKey, zswapSecretKeys } }) =>
              from(
                walletFacade.balanceUnboundTransaction(
                  tx,
                  {
                    shieldedSecretKeys: zswapSecretKeys,
                    dustSecretKey: dustSecretKey,
                  },
                  { ttl, tokenKindsToBalance },
                ),
              ),
            ),
          ),
        balanceUnprovenTransaction: (tx, { ttl, tokenKindsToBalance }) =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ walletKeys: { dustSecretKey, zswapSecretKeys } }) =>
              from(
                walletFacade.balanceUnprovenTransaction(
                  tx,
                  {
                    shieldedSecretKeys: zswapSecretKeys,
                    dustSecretKey: dustSecretKey,
                  },
                  { ttl, tokenKindsToBalance },
                ),
              ),
            ),
          ),
        calculateTransactionFee: tx =>
          from(walletFacade.calculateTransactionFee(tx)),
        estimateTransactionFee: (tx, options) =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ walletKeys: { dustSecretKey } }) =>
              from(
                walletFacade.estimateTransactionFee(tx, dustSecretKey, options),
              ),
            ),
          ),
        deregisterFromDustGeneration: nightUtxos =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ unshieldedKeystore }) =>
              from(
                walletFacade.deregisterFromDustGeneration(
                  nightUtxos,
                  unshieldedKeystore.getPublicKey(),
                  data => unshieldedKeystore.signData(data),
                ),
              ),
            ),
          ),
        getTransactionHistoryEntryByHash: hash =>
          state$.pipe(
            take(1),
            switchMap(async ({ unshielded }) =>
              unshielded.transactionHistory.get(hash),
            ),
          ),
        finalizeRecipe: recipe => from(walletFacade.finalizeRecipe(recipe)),
        finalizeTransaction: recipe =>
          from(walletFacade.finalizeTransaction(recipe)),
        registerNightUtxosForDustGeneration: (nightUtxos, dustAddress) =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ unshieldedKeystore }) =>
              from(
                walletFacade.registerNightUtxosForDustGeneration(
                  nightUtxos,
                  unshieldedKeystore.getPublicKey(),
                  data => unshieldedKeystore.signData(data),
                  dustAddress,
                ),
              ),
            ),
          ),
        state: () => state$,
        stop: () => from(walletFacade.stop()),
        signUnprovenTransaction: tx =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ unshieldedKeystore }) =>
              from(
                walletFacade.signUnprovenTransaction(tx, data =>
                  unshieldedKeystore.signData(data),
                ),
              ),
            ),
          ),
        signRecipe: recipe =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ unshieldedKeystore }) =>
              from(
                walletFacade.signRecipe(recipe, data =>
                  unshieldedKeystore.signData(data),
                ),
              ),
            ),
          ),
        signData: (data: Uint8Array) =>
          keyManager.keys$.pipe(
            take(1),
            map(({ unshieldedKeystore }) => ({
              signature: unshieldedKeystore.signData(data),
              verifyingKey: unshieldedKeystore.getPublicKey(),
            })),
          ),
        submitTransaction: tx => from(walletFacade.submitTransaction(tx)),
        transferTransaction: (outputs, { ttl, payFees }) =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ walletKeys: { dustSecretKey, zswapSecretKeys } }) =>
              from(
                walletFacade.transferTransaction(
                  outputs,
                  {
                    shieldedSecretKeys: zswapSecretKeys,
                    dustSecretKey: dustSecretKey,
                  },
                  { ttl, payFees },
                ),
              ),
            ),
          ),
        initSwap: (desiredInputs, desiredOutputs, { ttl, payFees }) =>
          keyManager.keys$.pipe(
            take(1),
            switchMap(({ walletKeys: { dustSecretKey, zswapSecretKeys } }) =>
              from(
                walletFacade.initSwap(
                  desiredInputs,
                  desiredOutputs,
                  {
                    shieldedSecretKeys: zswapSecretKeys,
                    dustSecretKey: dustSecretKey,
                  },
                  { ttl, payFees },
                ),
              ),
            ),
          ),
      };
    }),
  );
};

type ManagedWalletInstances = {
  walletFacade: WalletFacade;
};

/**
 * Creates and manages the lifecycle of Midnight SDK wallet instances.
 *
 * Lifecycle:
 * - Creates all 3 wallets (Unshielded, Shielded, Dust) via getAccountWalletInstance
 * - Starts UnshieldedWallet immediately (no keys needed)
 * - Starts ShieldedWallet with stub keys (deferred sync service ignores them,
 *   fetches real keys on-demand via keyManager when events need to be applied)
 * - DustWallet starts once when keys first become available, never stopped
 *   (SDK limitation: stop() closes Effect runtime, breaking calculateFee)
 * - On unsubscribe: stops all wallets
 */
const createAndManageWallets = (
  props: StartMidnightAccountWalletParams,
  { logger }: WithLogger,
): Observable<ManagedWalletInstances> => {
  const { keyManager, account, store } = props;

  return new Observable<ManagedWalletInstances>(subscriber => {
    let walletFacade: WalletFacade | null = null;
    let dustStartSubscription: Subscription | null = null;
    let persistSubscription: Subscription | null = null;
    let isDestroyed = false;

    const init = async () => {
      // 1. Create all wallets + WalletFacade
      const { walletFacade: facade, unshieldedTxHistoryStorage } =
        await getAccountWalletInstance(props);

      if (isDestroyed) {
        // Cleanup if unsubscribed during async init
        void facade.stop();
        return;
      }

      walletFacade = facade;

      // 2. Start UnshieldedWallet immediately (no keys needed)
      await walletFacade.unshielded.start();

      // 3. Start ShieldedWallet with stub keys.
      //    The SDK requires start() to be called to begin sync, but our deferred
      //    sync service ignores the keys parameter - it fetches keys on-demand via
      //    keyManager when events need to be applied. The stub keys satisfy the
      //    type signature but are never used.
      const stubSeed = new Uint8Array(32); // All zeros - ignored by deferred sync
      const stubSecretKeys = ledger.ZswapSecretKeys.fromSeed(stubSeed);
      await walletFacade.shielded.start(stubSecretKeys);

      // 4. DustWallet: Start immediately by requesting keys, never stop
      //
      // Requests keys eagerly so dust wallet syncs from the start, not only
      // when shielded sync encounters a new event. This ensures dust balance
      // updates even when dust is generated by contracts (e.g. cNIGHT).
      //
      // If auth is cancelled, waits for keys to become available from another
      // source (e.g. shielded sync) and retries — same pattern as the deferred
      // sync service.
      //
      // LIMITATION: DustWallet is never stopped because SDK's stop() closes the
      // Effect runtime scope, which releases all resources including HTTP client.
      // After stop(), methods like calculateFee() fail. This means dustSecretKey
      // stays in memory until account watcher stops.
      dustStartSubscription = keysWithAuthCancelledRecovery$(keyManager)
        .pipe(
          switchMap(keys => {
            if (!walletFacade) return from(Promise.resolve());
            return from(walletFacade.dust.start(keys.walletKeys.dustSecretKey));
          }),
        )
        .subscribe({
          error: error => {
            logger.error(
              `DustWallet start error for account ${account.accountId}:`,
              error,
            );
          },
        });

      // 5. Persist wallet state to storage on changes
      //    This encapsulates storage read/write in one place (read happens in getAccountWalletInstance)
      const serializedState$ = walletFacade.state().pipe(
        // Throttle rapid emissions but ensure we capture final state:
        // - leading: true (default) - persist immediately on first emission
        // - trailing: true - also persist at end of throttle window if there were more emissions
        // This ensures we persist both immediately AND after the 5s throttle window
        throttleTime(STATE_SERIALISATION_THROTTLE_TIME, undefined, {
          leading: true,
          trailing: true,
        }),
        switchMap(() =>
          zip(
            from(walletFacade!.dust.serializeState()),
            from(walletFacade!.shielded.serializeState()),
            from(walletFacade!.unshielded.serializeState()),
            from([unshieldedTxHistoryStorage.serialize()]),
          ),
        ),
        map(states => states.map(HexBytes.fromUTF8)),
        map(([dust, shielded, unshielded, unshieldedTxHistory]) => ({
          dust,
          shielded,
          unshielded,
          unshieldedTxHistory,
        })),
        distinctUntilChanged(
          (a, b) =>
            a.dust === b.dust &&
            a.shielded === b.shielded &&
            a.unshielded === b.unshielded &&
            a.unshieldedTxHistory === b.unshieldedTxHistory,
        ),
      );

      persistSubscription = serializedState$
        .pipe(
          // For each serialized state emission, fetch FRESH storage data before persisting.
          // We can't use withLatestFrom/blockingWithLatestFrom because store.getAll() is a
          // one-shot observable (like fetch), not a continuous stream. Using those operators
          // would cache the first result and use stale data for subsequent persists.
          switchMap(serializedState =>
            store.getAll().pipe(
              defaultIfEmpty([] as SerializedMidnightWallet[]),
              switchMap(states => {
                const clonedStates = [...states];
                const accountStateIndex = clonedStates.findIndex(
                  w => w.accountId === account.accountId,
                );
                const newSerializedState: SerializedMidnightWallet = {
                  serializedState,
                  accountId: account.accountId,
                  walletId: account.walletId,
                  networkId: account.blockchainSpecific.networkId,
                };

                if (accountStateIndex !== -1) {
                  clonedStates.splice(accountStateIndex, 1, newSerializedState);
                } else {
                  clonedStates.push(newSerializedState);
                }
                return from(store.setAll(clonedStates));
              }),
            ),
          ),
        )
        .subscribe({
          error: error => {
            // Log but don't propagate - persistence failure is non-critical for wallet operation

            logger.error(
              `Failed to persist wallet state for account ${account.accountId}:`,
              error,
            );
          },
        });

      // 6. Emit the managed instances
      subscriber.next({ walletFacade });
    };

    init().catch(error => {
      subscriber.error(error);
    });

    // Cleanup on unsubscribe
    return () => {
      isDestroyed = true;
      dustStartSubscription?.unsubscribe();
      persistSubscription?.unsubscribe();
      if (walletFacade) {
        void walletFacade.stop();
      }
    };
  });
};

/**
 * Starts a Midnight account wallet with full lifecycle management.
 *
 * Creates SDK wallets, manages their start/stop lifecycle, and converts
 * to the MidnightWallet interface used by the rest of the application.
 */
const createStartMidnightAccountWallet =
  (
    dependencies: WithLogger,
  ): MidnightSideEffectsDependencies['startMidnightAccountWallet'] =>
  props =>
    createAndManageWallets(props, dependencies).pipe(
      switchMap(({ walletFacade }) =>
        createAccountObservableMidnightWallet({
          account: props.account,
          keyManager: props.keyManager,
          walletFacade,
        }),
      ),
    );

export const initializeMidnightSideEffectDependencies: LaceInitSync<
  MidnightSideEffectsDependencies
> = (_, dependencies) => ({
  midnightWallets$,

  getMidnightWalletByAccountId: (accountId: AccountId) =>
    midnightWallets$.pipe(
      take(1),
      map(wallets => wallets[accountId]),
      switchMap(wallet =>
        wallet
          ? of(wallet)
          : throwError(
              () =>
                new Error(
                  `Could not load midnight wallet for account ${accountId}`,
                ),
            ),
      ),
    ),

  stopAllMidnightWallets: () => {
    const walletsArray = Object.values(midnightWallets$.value);
    midnightWallets$.next({});
    if (walletsArray.length === 0) {
      return of(void 0);
    }
    return forkJoin(walletsArray.map(wallet => wallet.stop())).pipe(
      map(() => void 0),
    );
  },

  stopMidnightWallet: (accountId: AccountId) => {
    const wallet = midnightWallets$.value[accountId];
    if (!wallet) {
      return of(void 0);
    }
    const { [accountId]: _, ...remaining } = midnightWallets$.value;
    midnightWallets$.next(remaining);
    return wallet.stop().pipe(map(() => void 0));
  },

  startMidnightAccountWallet: createStartMidnightAccountWallet(dependencies),
});
