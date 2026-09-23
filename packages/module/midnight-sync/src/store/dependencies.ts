import { deepEquals } from '@cardano-sdk/util';
import {
  convertHttpUrlToWebsocket,
  MidnightDustAddress,
  MidnightShieldedAddress,
  MidnightUnshieldedAddress,
  midnightWallets$,
  SerialisedWalletState,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { BigNumber, Milliseconds } from '@lace-lib/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  WalletEntrySchema,
} from '@midnightntwrk/wallet-sdk';
import { DustWallet } from '@midnightntwrk/wallet-sdk/dust';
import { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';
import { ShieldedWallet } from '@midnightntwrk/wallet-sdk/shielded';
import {
  PublicKey,
  UnshieldedWallet,
} from '@midnightntwrk/wallet-sdk/unshielded';
import {
  DustAddress,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
import {
  catchError,
  defaultIfEmpty,
  distinctUntilChanged,
  exhaustMap,
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
  zip,
} from 'rxjs';

import { computeConnectedSyncRatio } from './compute-sync-ratio';

import type {
  AccountKeyManager,
  CoinsByTokenType,
  MidnightSideEffectsDependencies,
  MidnightWallet,
  CoinStatus,
  MidnightAccountId,
  SerializedMidnightWallet,
  StartMidnightAccountWalletParams,
} from '@lace-contract/midnight-context';
import type { LaceInitSync } from '@lace-contract/module';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { WithLogger } from '@lace-lib/util';
import type { DefaultConfiguration } from '@midnightntwrk/wallet-sdk/facade';
import type { Subscription } from 'rxjs';

/**
 * Wraps keyManager.keys$ with recovery for AuthenticationCancelledError.
 * If the user cancels the auth prompt, waits for keys to become available
 * from another source (e.g., an unlock triggered by a different flow)
 * and retries.
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
  txHistoryStorage: InMemoryTransactionHistoryStorage;
};

/**
 * Restore accepts the legacy `unshieldedTxHistory` key so profiles written
 * before the persisted key was renamed load without a resync; the next persist
 * rewrites the doc under `txHistory`, migrating it lazily.
 */
const readPersistedTxHistory = (
  serializedState: SerializedMidnightWallet['serializedState'],
): SerialisedWalletState =>
  serializedState.txHistory ??
  (serializedState as { unshieldedTxHistory?: SerialisedWalletState })
    .unshieldedTxHistory;

/**
 * djb2 over the serialized states. The previous-persist comparator must not
 * RETAIN the inputs: keeping the raw serialized strings would pin ~10MB per
 * synced wallet in service worker memory between persist cycles.
 */
const fingerprintOf = (parts: readonly string[]): string => {
  let hash = 5381;
  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash = (hash * 33) ^ part.charCodeAt(index);
      hash |= 0;
    }
  }
  return `${hash}:${parts.map(part => part.length).join(':')}`;
};

const getAccountWalletInstance = async (
  {
    account,
    config,
    store,
    keyManager,
  }: MidnightAccountWalletInstanceDependencies,
  logger: WithLogger['logger'],
): Promise<AccountWalletInstanceResult> => {
  // Keyed read, not getAll().find(): computeDocId is the accountId, so this is
  // one adapter read of this account's own key. getAll() re-reads every
  // account's multi-MB document, making an N-account restore cost N^2 reads and
  // pinning all of them in the store's cache.
  const walletState = await firstValueFrom(
    store.get(String(account.accountId)).pipe(defaultIfEmpty(undefined)),
  );

  const indexerClientConnection = {
    indexerHttpUrl: config.indexerAddress,
    indexerWsUrl: convertHttpUrlToWebsocket(config.indexerAddress),
    keepAlive: 15_000,
  };
  const { networkId } = account.blockchainSpecific;

  const configuration: DefaultConfiguration = {
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
    networkId,
    // Each batch is applied as one synchronous WASM chunk (~6ms/event shielded),
    // so `size` bounds the event loop's maximum blocking time (~70ms) to keep SW
    // messaging responsive during catch-up. Apply cost dominates throughput, so
    // larger batches barely sync faster while blocking the loop proportionally
    // longer; per-event pacing (the previous approach) capped sync at ~100 ev/s.
    batchUpdates: { size: 12, spacing: 4 },
    indexerClientConnection,
    provingServerUrl: new URL(config.proofServerAddress),
    relayURL: new URL(convertHttpUrlToWebsocket(config.nodeAddress)),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(
      WalletEntrySchema,
      mergeWalletEntries,
    ),
  };

  // Restore wallet

  if (walletState) {
    const { dust, shielded, unshielded } = walletState.serializedState;

    // Only the local restore() is guarded. An unreadable blob discards THIS
    // account's cached state and rebuilds from the seed; WalletFacade.init
    // stays outside the catch so a transient network error cannot trigger the
    // discard.
    let restoredTxHistoryStorage: InMemoryTransactionHistoryStorage | undefined;
    try {
      restoredTxHistoryStorage = InMemoryTransactionHistoryStorage.restore(
        SerialisedWalletState.toJSON(
          readPersistedTxHistory(walletState.serializedState),
        ),
        WalletEntrySchema,
        mergeWalletEntries,
      );
    } catch (error) {
      logger.warn(
        `Discarding unreadable persisted Midnight wallet state for account ${account.accountId}; rebuilding from seed`,
        error instanceof Error ? error.message : String(error),
      );
      // removeWhere touches only this account's document, so a sibling
      // account's state cannot be collateral. Best-effort: this already IS the
      // recovery path, so a failed wipe must not prevent the rebuild below --
      // the stale document is overwritten on the next persist, doc ids being
      // deterministic.
      await firstValueFrom(
        store
          .removeWhere(state => state.accountId === account.accountId)
          .pipe(
            defaultIfEmpty(undefined),
            catchError(wipeError => {
              logger.error(
                `Failed to discard unreadable Midnight wallet state for account ${account.accountId}`,
                wipeError,
              );
              return of(undefined);
            }),
          ),
      );
    }

    if (restoredTxHistoryStorage) {
      configuration.txHistoryStorage = restoredTxHistoryStorage;

      return {
        walletFacade: await WalletFacade.init({
          configuration,
          shielded: config =>
            ShieldedWallet(config).restore(
              SerialisedWalletState.toJSON(shielded),
            ),
          unshielded: config =>
            UnshieldedWallet(config).restore(
              SerialisedWalletState.toJSON(unshielded),
            ),
          dust: config =>
            DustWallet(config).restore(SerialisedWalletState.toJSON(dust)),
        }),
        txHistoryStorage: restoredTxHistoryStorage,
      };
    }
  }

  // Else: no persisted state for this account — start fresh

  const {
    walletKeys: { dustKeyBuffer, zswapKeyBuffer },
    unshieldedKeystore,
  } = await firstValueFrom(keysWithAuthCancelledRecovery$(keyManager));
  const dustParameters = ledger.LedgerParameters.initialParameters().dust;
  const txHistoryStorage = new InMemoryTransactionHistoryStorage(
    WalletEntrySchema,
    mergeWalletEntries,
  );
  // Mirrors the restore path: without this the facade writes into the throwaway
  // default from the config literal while we serialize this one, so a new
  // account's history persists empty however long it syncs.
  configuration.txHistoryStorage = txHistoryStorage;

  return {
    walletFacade: await WalletFacade.init({
      configuration,
      shielded: config => ShieldedWallet(config).startWithSeed(zswapKeyBuffer),
      unshielded: config =>
        UnshieldedWallet(config).startWithPublicKey(
          PublicKey.fromKeyStore(unshieldedKeystore),
        ),
      dust: config =>
        DustWallet(config).startWithSeed(dustKeyBuffer, dustParameters),
    }),
    txHistoryStorage,
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
  haltPersistence,
}: {
  account: StartMidnightAccountWalletParams['account'];
  keyManager: StartMidnightAccountWalletParams['keyManager'];
  walletFacade: WalletFacade;
  haltPersistence: () => void;
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
          switchMap(() => from(walletFacade.getAllFromTxHistory())),
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
          from(walletFacade.queryTxHistoryByHash(hash)),
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
        // Persistence is owned by the account watcher, so it outlives stop():
        // the SDK state stream goes silent rather than completing, and a queued
        // write still lands seconds later. Halted synchronously BEFORE the
        // facade stops, so no write survives the resync/delete wipe that
        // clear()/removeWhere() performs once stop() completes.
        stop: () => {
          haltPersistence();
          return from(walletFacade.stop());
        },
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
  /** Synchronously stops future persist writes; see the persistOnce guard. */
  haltPersistence: () => void;
};

/**
 * Creates and manages the lifecycle of Midnight SDK wallet instances.
 *
 * Lifecycle:
 * - Creates all 3 wallets (Unshielded, Shielded, Dust) via getAccountWalletInstance
 * - Starts UnshieldedWallet immediately (no keys needed)
 * - Starts ShieldedWallet and DustWallet once account keys become available
 *   (one auth prompt; sync then runs for the wallet's lifetime, surviving
 *   the key manager's idle zeroization — see the start step below)
 * - DustWallet is never stopped once started
 *   (SDK limitation: stop() closes Effect runtime, breaking calculateFee)
 * - On unsubscribe: stops all wallets and clears the sync key copy
 */
const createAndManageWallets = (
  props: StartMidnightAccountWalletParams,
  { logger }: WithLogger,
): Observable<ManagedWalletInstances> => {
  const { keyManager, account, store } = props;

  return new Observable<ManagedWalletInstances>(subscriber => {
    let walletFacade: WalletFacade | null = null;
    let syncSecretKeys: ledger.ZswapSecretKeys | null = null;
    let syncDustSecretKey: ledger.DustSecretKey | null = null;
    let syncStartSubscription: Subscription | null = null;
    let persistSubscription: Subscription | null = null;
    let isDestroyed = false;
    // Unsubscribing cannot cancel an in-flight persist cycle (a running
    // promise), so external stops flip this flag synchronously and the cycle
    // re-checks it before writing.
    let isPersistenceHalted = false;

    const init = async () => {
      // 1. Create all wallets + WalletFacade
      const { walletFacade: facade, txHistoryStorage } =
        await getAccountWalletInstance(props, logger);

      if (isDestroyed) {
        // Cleanup if unsubscribed during async init
        void facade.stop();
        return;
      }

      walletFacade = facade;

      // 2. Start UnshieldedWallet immediately (no keys needed)
      await walletFacade.unshielded.start();

      // 3. Start ShieldedWallet and DustWallet once account keys are available.
      //
      // shielded.start() hands the keys to the SDK sync stream, which holds
      // them for its entire lifetime (sync never completes — the WS
      // subscription keeps waiting for the next block at tip). The stream
      // therefore gets its OWN ZswapSecretKeys, derived here from the seed
      // buffer: reusing the key manager's cached object would let the idle
      // timer zeroize it mid-sync. The manager's cache still zeroes out on
      // idle/lock, so signing keeps requiring an unlock while sync keeps
      // running; the sync copy is cleared on teardown.
      //
      // If auth is cancelled, waits for keys to become available from another
      // source and retries (keysWithAuthCancelledRecovery$).
      //
      // LIMITATION: DustWallet is never stopped because SDK's stop() closes the
      // Effect runtime scope, which releases all resources including HTTP client.
      // After stop(), methods like calculateFee() fail. This means dustSecretKey
      // stays in memory until account watcher stops.
      syncStartSubscription = keysWithAuthCancelledRecovery$(keyManager)
        .pipe(
          switchMap(keys => {
            if (!walletFacade) return from(Promise.resolve());
            // Both sync streams get their OWN keys derived from the seed
            // buffers, so the key manager's cached copies can be zeroized on
            // idle without wedging a running stream. fromSeed copies into WASM
            // memory, so a later fill(0) on the buffer cannot reach these.
            syncSecretKeys = ledger.ZswapSecretKeys.fromSeed(
              keys.walletKeys.zswapKeyBuffer,
            );
            syncDustSecretKey = ledger.DustSecretKey.fromSeed(
              keys.walletKeys.dustKeyBuffer,
            );
            const facade = walletFacade;
            const syncKeys = syncSecretKeys;
            const dustSyncKey = syncDustSecretKey;
            return from(
              (async () => {
                // Started independently. Chaining dust off shielded's promise
                // made a shielded failure silently skip dust, so dust/cNIGHT
                // balances stopped updating for the session with nothing but a
                // console line to show for it. Still sequential: concurrent
                // starts would widen the WASM memory peak the facade queue caps.
                const failures: unknown[] = [];
                try {
                  await facade.shielded.start(syncKeys);
                } catch (error) {
                  logger.error(
                    `Midnight shielded wallet failed to start for account ${account.accountId}:`,
                    error,
                  );
                  failures.push(error);
                }
                try {
                  await facade.dust.start(dustSyncKey);
                } catch (error) {
                  logger.error(
                    `Midnight dust wallet failed to start for account ${account.accountId}:`,
                    error,
                  );
                  failures.push(error);
                }
                // Each failure is logged where it happens, so the second is not
                // lost when both fail; only the first is raised, because the
                // watch treats any rejection the same way.
                if (failures.length > 0) throw failures[0];
              })(),
            );
          }),
        )
        .subscribe({
          error: (error: unknown) => {
            logger.error(
              `Wallet sync start error for account ${account.accountId}:`,
              error,
            );
            // Surfaced, not just logged: the account watch retries this and
            // raises a user-visible failure once retries are exhausted (ADR 15,
            // LW-15217). Logging alone left sync dead with no way back.
            subscriber.error(error);
          },
        });

      // 5. Persist wallet state to storage on changes
      //    This encapsulates storage read/write in one place (read happens in getAccountWalletInstance)
      // Skip the storage write when nothing changed since the last landed write.
      let lastPersistedFingerprint: string | undefined;

      const persistOnce = async (): Promise<void> => {
        const [dust, shielded, unshielded, txHistory] = (
          await firstValueFrom(
            zip(
              from(walletFacade!.dust.serializeState()),
              from(walletFacade!.shielded.serializeState()),
              from(walletFacade!.unshielded.serializeState()),
              from(txHistoryStorage.serialize()),
            ),
          )
        ).map(SerialisedWalletState);

        const fingerprint = fingerprintOf([
          dust,
          shielded,
          unshielded,
          txHistory,
        ]);
        if (fingerprint === lastPersistedFingerprint) return;

        // Serialization above may have outlived an external stop(). Checking
        // here — before the write is queued — guarantees any upsert that
        // proceeds is ordered BEFORE a subsequent clear()/removeWhere() in
        // the store's write queue, so it cannot revive wiped state.
        if (isPersistenceHalted || isDestroyed) return;

        // upsert touches only this account's document — concurrent wallets
        // cannot clobber each other's persisted state.
        await firstValueFrom(
          store
            .upsert({
              serializedState: {
                dust,
                shielded,
                unshielded,
                txHistory,
              },
              accountId: account.accountId,
              walletId: account.walletId,
              networkId: account.blockchainSpecific.networkId,
            })
            .pipe(defaultIfEmpty(undefined)),
        );
        lastPersistedFingerprint = fingerprint;
      };

      persistSubscription = walletFacade
        .state()
        .pipe(
          // Throttle rapid emissions but ensure we capture final state:
          // - leading: true (default) - persist immediately on first emission
          // - trailing: true - also persist at end of throttle window if there were more emissions
          throttleTime(STATE_SERIALISATION_THROTTLE_TIME, undefined, {
            leading: true,
            trailing: true,
          }),
          // exhaustMap over the ENTIRE persist cycle (serialize + read + write):
          // at most one cycle in flight, nothing stale is ever queued, and a
          // dropped tick's changes are captured by the next cycle because each
          // cycle serializes live state at execution time. switchMap would
          // cancel cycles outliving the throttle window (starving persistence
          // under sync load); concatMap would queue stale snapshots without
          // bound while writes run slower than ticks.
          exhaustMap(() =>
            from(persistOnce()).pipe(
              catchError(error => {
                // Log but don't propagate - persistence failure is non-critical
                // for wallet operation, and the next tick retries.
                logger.error(
                  `Failed to persist wallet state for account ${account.accountId}:`,
                  error,
                );
                return of(undefined);
              }),
            ),
          ),
        )
        .subscribe();

      // 6. Emit the managed instances
      subscriber.next({
        walletFacade,
        haltPersistence: () => {
          isPersistenceHalted = true;
        },
      });
    };

    init().catch(error => {
      subscriber.error(error);
    });

    // Cleanup on unsubscribe
    return () => {
      isDestroyed = true;
      syncStartSubscription?.unsubscribe();
      persistSubscription?.unsubscribe();

      if (walletFacade) {
        // Only after the facade has stopped: clear() makes every subsequent
        // operation on these objects fail, so clearing while a sync stream
        // still holds one would wedge that stream rather than tidy up after
        // it. A stop() that never settles therefore leaves both resident
        // until the service worker dies — accepted; per-wallet scoping is the
        // precise fix and needs SDK-side idempotent per-wallet stops.
        void walletFacade
          .stop()
          .catch(() => undefined)
          .finally(() => {
            syncSecretKeys?.clear();
            syncDustSecretKey?.clear();
          });
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
      switchMap(({ walletFacade, haltPersistence }) =>
        createAccountObservableMidnightWallet({
          account: props.account,
          keyManager: props.keyManager,
          walletFacade,
          haltPersistence,
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
