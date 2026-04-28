import { emip3decrypt } from '@cardano-sdk/key-management';
import { deepEquals, Percent } from '@cardano-sdk/util';
import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import {
  createInitialMidnightTokenMetadata,
  createMidnightToken,
  isInMemoryMidnightAccount,
  midnightWallets$,
} from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber, ByteArray, Timestamp } from '@lace-sdk/util';
import { HexBytes } from '@lace-sdk/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import isEqual from 'lodash/isEqual';
import {
  catchError,
  combineLatest,
  defaultIfEmpty,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  finalize,
  from,
  groupBy,
  map,
  merge,
  mergeAll,
  mergeMap,
  of,
  share,
  skip,
  switchMap,
  take,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
  zip,
  type Observable,
} from 'rxjs';

import { FEATURE_FLAG_MIDNIGHT_UNSHIELDED } from '../../const';

import { createAccountKeyManager as createAccountKeyManagerImpl } from './account-key-manager';

import type { ActionCreators, SideEffect } from '../..';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { FeatureFlag } from '@lace-contract/feature';
import type {
  AccountKeyManager,
  AccountKeys,
  CoinsByTokenType,
  CoinStatus,
  DustGenerationDetails,
  MidnightAccountId,
  MidnightAccountProps,
  MidnightNetwork,
  MidnightNetworkConfig,
  MidnightSDKNetworkId,
  MidnightShieldedAddress,
  MidnightTokenKind,
  MidnightUnshieldedAddress,
  MidnightWallet,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type { ActionType } from '@lace-contract/module';
import type { CollectionStorage } from '@lace-contract/storage';
import type { MetadataByTokenId } from '@lace-contract/tokens';
import type {
  AccountId,
  AnyAccount,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

type Action = ActionType<ActionCreators>;

const filterMidnightAccounts =
  (network: MidnightNetwork) => (source$: Observable<AnyAccount[]>) =>
    source$.pipe(
      map(accounts =>
        accounts
          .filter(isInMemoryMidnightAccount)
          .filter(
            midnightAccount =>
              midnightAccount.blockchainSpecific.networkId ===
              network.networkId,
          ),
      ),
    );
const noLongerHasAccount =
  (accountId: AccountId) => (source$: Observable<AnyAccount[]>) =>
    source$.pipe(
      filter(
        accounts => !accounts.some(account => account.accountId === accountId),
      ),
      map(() => true),
    );

const getFeatureFlagByName = (
  featureFlags: FeatureFlag[],
  featureFlagName: string,
) =>
  featureFlags.find(featureFlag => featureFlag.key === featureFlagName) || null;

const sumCoinsValueByKind = (
  status: CoinStatus,
  coins: CoinsByTokenType[keyof CoinsByTokenType] = [],
) =>
  coins
    .filter(c => c.status === status)
    .reduce((sum, { value }) => sum + BigInt(value), 0n);

const buildAddressTokenData = ({
  accountId,
  address,
  coinsByTokenType,
}: {
  accountId: MidnightAccountId;
  address: MidnightShieldedAddress | MidnightUnshieldedAddress;
  coinsByTokenType: CoinsByTokenType;
}) =>
  of({
    address,
    tokens: Object.keys(coinsByTokenType).map(type => ({
      type,
      balance: {
        available: sumCoinsValueByKind('available', coinsByTokenType[type]),
        pending: sumCoinsValueByKind('pending', coinsByTokenType[type]),
      },
    })),
  }).pipe(
    map(({ address, tokens }) => ({
      accountId,
      address,
      blockchainName: 'Midnight' as const,
      tokens: tokens.map(({ type, balance }) =>
        createMidnightToken(type, balance),
      ),
    })),
  );

// Dust balance subscription - emits setDustBalance when wallet.state() emits
// Note: wallet.state() uses combineLatest([shielded, unshielded, dust]) internally.
// DustWallet emits state immediately upon restoration (before start() is called),
// so this will emit as soon as the wallet is created/restored.
// dustBalance is also persisted in Redux to show cached value on app restart
// before the wallet observable chain is set up.
export const updateDustBalance =
  (wallet: MidnightWallet): SideEffect =>
  (_, __, { actions }) =>
    wallet.state().pipe(
      map(state => state.dust.balance(new Date())),
      distinctUntilChanged(),
      map(BigNumber),
      map(dustBalance =>
        actions.midnightContext.setDustBalance({
          accountId: wallet.accountId,
          dustBalance,
        }),
      ),
    );

const buildTokenMetadata = ({
  coinsByTokenType,
  existingTokenMetadata,
  networkId,
  kind,
}: {
  coinsByTokenType: CoinsByTokenType;
  existingTokenMetadata: MetadataByTokenId;
  networkId: MidnightSDKNetworkId;
  kind: MidnightTokenKind;
}) =>
  of(Object.entries(coinsByTokenType)).pipe(
    map(coinsByTokenTypeEntries =>
      coinsByTokenTypeEntries.map(
        ([tokenType, coins]) =>
          [
            tokenType,
            coins
              .reduce((sum, { value }) => sum + BigInt(value), 0n)
              .toString(),
            coins,
          ] as const,
      ),
    ),
    map(entries => ({
      balances: Object.fromEntries(
        entries.map(([type, balance]) => [type, balance]),
      ),
      coinsMap: Object.fromEntries(
        entries.map(([type, _, coins]) => [type, coins]),
      ),
    })),
    distinctUntilChanged(deepEquals),
    filter(({ balances, coinsMap }) => {
      const hasTokenIdsChanged = !isEqual(
        Object.keys(balances).toSorted(),
        Object.keys(existingTokenMetadata).toSorted(),
      );
      if (hasTokenIdsChanged) return true;

      const existingCoinsMap = Object.fromEntries(
        Object.entries(existingTokenMetadata).map(([id, meta]) => [
          id,
          (meta?.blockchainSpecific as { coins?: unknown } | undefined)?.coins,
        ]),
      );
      return !deepEquals(coinsMap, existingCoinsMap);
    }),
    map(({ balances, coinsMap }) => ({
      metadatas: Object.keys(balances).map(tokenId => {
        const existingMetadata = existingTokenMetadata[TokenId(tokenId)];
        if (existingMetadata) {
          return {
            ...existingMetadata,
            blockchainSpecific: {
              ...(existingMetadata.blockchainSpecific || {}),
              coins: coinsMap[tokenId],
            },
          };
        }

        return createInitialMidnightTokenMetadata({
          tokenType: TokenId(tokenId),
          kind,
          networkId,
          coins: coinsMap[tokenId],
        });
      }),
      balances,
    })),
  );

// Address subscription - emits upsertAddresses when wallet.address$ emits.
// Use blockingWithLatestFrom to wait for isUnshieldedEnabled$ if it hasn't emitted yet.
// This fixes race conditions where wallet.address$ (BehaviorSubject) emits before
// selectLoadedFeatures$ has emitted in the integration test environment.
export const upsertAddresses =
  (
    wallet: MidnightWallet,
    isUnshieldedEnabled$: Observable<boolean>,
  ): SideEffect =>
  (_, __, { actions }) =>
    wallet.address$.pipe(
      blockingWithLatestFrom(isUnshieldedEnabled$),
      map(([address, isUnshieldedEnabled]) =>
        actions.addresses.upsertAddresses({
          blockchainName: 'Midnight',
          accountId: wallet.accountId,
          addresses: [
            { address: address.shielded },
            isUnshieldedEnabled && { address: address.unshielded },
            { address: address.dust },
          ].filter(value => !!value),
        }),
      ),
    );

// Sync progress subscription - emits sync actions when wallet.syncProgress$ emits.
// Use blockingWithLatestFrom for isUnshieldedEnabled$ to handle race conditions.
// Throttle to 500ms to reduce Redux dispatch frequency during heavy sync,
// keeping the SW event loop responsive for navigation and other user actions.
export const updateSyncProgress =
  (
    wallet: MidnightWallet,
    isUnshieldedEnabled$: Observable<boolean>,
  ): SideEffect =>
  (_, stateObservables, { actions }) =>
    wallet.syncProgress$.pipe(
      throttleTime(500, undefined, { leading: true, trailing: true }),
      blockingWithLatestFrom(isUnshieldedEnabled$),
      withLatestFrom(stateObservables.sync.selectSyncStatusByAccount$),
      mergeMap(
        ([
          [
            { shielded, unshielded, dust, isStrictlyComplete },
            isUnshieldedEnabled,
          ],
          syncStatusByAccount,
        ]) => {
          const { accountId } = wallet;
          const operationId = `${accountId}-midnight-sync`;
          const accountSyncStatus = syncStatusByAccount[accountId];
          const progressValues = [shielded];

          if (isUnshieldedEnabled) {
            progressValues.push(unshielded);
          }

          // Track whether dust should be required for completion:
          // - when dust has made progress (it's running and needs to finish), OR
          // - when other wallets are still in progress (prevents premature completion before dust can start)
          const isDustIncluded = dust > 0 || progressValues.some(p => p < 1);

          // Only include dust in the progress DISPLAY when it has actually started (dust > 0).
          // Before dust starts, its ratio is 0 and would artificially halve the displayed percentage
          // (e.g. shielded at 90% with unstarted dust shows 45% instead of 90%).
          if (dust > 0) {
            progressValues.push(dust);
          }

          const progress =
            progressValues.reduce((sum, p) => sum + p, 0) /
            progressValues.length;

          // Sync is complete only when the SDK confirms strict completion for all active wallets.
          // This prevents false positives from the initial "connected + empty state" where
          // computeConnectedSyncRatio returns 1 before the indexer has sent actual sync data.
          const isComplete =
            isStrictlyComplete.shielded &&
            (!isUnshieldedEnabled || isStrictlyComplete.unshielded) &&
            (!isDustIncluded || isStrictlyComplete.dust);

          // If no pending InProgress operation exists yet (e.g. first sync or resync Pending
          // placeholder), create a new InProgress+Determinate operation instead of updating.
          const existingOperation =
            accountSyncStatus?.pendingSync?.operations[operationId];
          if (
            !accountSyncStatus ||
            !accountSyncStatus.pendingSync ||
            !existingOperation ||
            existingOperation.status === 'Pending'
          ) {
            const syncActions: Action[] = [
              actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(progress),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: Timestamp(Date.now()),
                },
              }),
            ];

            // If progress is already complete, also dispatch completion action immediately
            if (isComplete) {
              syncActions.push(
                actions.sync.completeSyncOperation({
                  accountId,
                  operationId,
                }),
              );
            }

            return from(syncActions);
          }

          // Update progress for existing operation
          const progressActions: Action[] = [
            actions.sync.updateSyncProgress({
              accountId,
              operationId,
              progress: Percent(progress),
            }),
          ];

          // If progress is complete, also dispatch completion action
          if (isComplete) {
            progressActions.push(
              actions.sync.completeSyncOperation({
                accountId,
                operationId,
              }),
            );
          }

          return from(progressActions);
        },
      ),
    );

// Dust generation details subscription - extracts full dust info from SDK.
// This provides pre-computed values (currentValue, maxCap, rate, etc.)
// directly from the SDK, eliminating the need for manual calculations.
export const updateDustGenerationDetails =
  (wallet: MidnightWallet): SideEffect =>
  (_, __, { actions }) =>
    wallet.state().pipe(
      map((state): DustGenerationDetails | undefined => {
        const now = new Date();
        const coinsWithFullInfo = state.dust.availableCoinsWithFullInfo(now);
        if (coinsWithFullInfo.length === 0) {
          return undefined;
        }
        const totalCurrentValue = coinsWithFullInfo.reduce(
          (sum, coin) => sum + coin.generatedNow,
          0n,
        );
        const totalMaxCap = coinsWithFullInfo.reduce(
          (sum, coin) => sum + coin.maxCap,
          0n,
        );
        const totalRate = coinsWithFullInfo.reduce(
          (sum, coin) => sum + coin.rate,
          0n,
        );
        const earliestDecayTime = coinsWithFullInfo
          .map(coin => coin.dtime)
          .filter((d): d is Date => d !== undefined)
          .reduce<Date | undefined>(
            (earliest, d) => (!earliest || d < earliest ? d : earliest),
            undefined,
          );
        const latestMaxCapReachedAt = coinsWithFullInfo
          .map(coin => coin.maxCapReachedAt)
          .filter((d): d is Date => d !== undefined)
          .reduce<Date | undefined>(
            (latest, d) => (!latest || d > latest ? d : latest),
            undefined,
          );
        return {
          currentValue: totalCurrentValue,
          maxCap: totalMaxCap,
          decayTime: earliestDecayTime?.getTime(),
          maxCapReachedAt: latestMaxCapReachedAt?.getTime(),
          rate: totalRate,
        };
      }),
      distinctUntilChanged(
        (a, b) =>
          a?.currentValue === b?.currentValue &&
          a?.maxCap === b?.maxCap &&
          a?.decayTime === b?.decayTime &&
          a?.maxCapReachedAt === b?.maxCapReachedAt &&
          a?.rate === b?.rate,
      ),
      map(dustGenerationDetails =>
        actions.midnightContext.setDustGenerationDetails({
          accountId: wallet.accountId,
          dustGenerationDetails,
        }),
      ),
    );

// Token updates - emits setAddressTokens and upsertTokensMetadata when coins change.
export const updateTokens =
  (
    wallet: MidnightWallet,
    isUnshieldedEnabled$: Observable<boolean>,
  ): SideEffect =>
  (_, stateObservables, { actions }) =>
    wallet.coinsByTokenType$.pipe(
      blockingWithLatestFrom(isUnshieldedEnabled$),
      switchMap(([coinsByTokenType, isUnshieldedEnabled]) =>
        merge(
          wallet.address$.pipe(
            switchMap(address =>
              zip(
                buildAddressTokenData({
                  accountId: wallet.accountId,
                  address: address.shielded,
                  coinsByTokenType: coinsByTokenType.shielded,
                }).pipe(defaultIfEmpty(null)),
                isUnshieldedEnabled
                  ? buildAddressTokenData({
                      accountId: wallet.accountId,
                      address: address.unshielded,
                      coinsByTokenType: coinsByTokenType.unshielded,
                    }).pipe(defaultIfEmpty(null))
                  : of(null),
              ),
            ),
            // returning an array from `switchMap` sends all items separately
            switchMap(arrayOfTwoPayloads => arrayOfTwoPayloads),
            filter(Boolean),
            map(payload => actions.tokens.setAddressTokens(payload)),
          ),
          stateObservables.tokens.selectTokensMetadata$.pipe(
            take(1),
            switchMap(existingTokenMetadata =>
              zip(
                buildTokenMetadata({
                  coinsByTokenType: coinsByTokenType.shielded,
                  existingTokenMetadata,
                  networkId: wallet.networkId,
                  kind: 'shielded',
                }).pipe(defaultIfEmpty(null)),
                isUnshieldedEnabled
                  ? buildTokenMetadata({
                      coinsByTokenType: coinsByTokenType.unshielded,
                      existingTokenMetadata,
                      networkId: wallet.networkId,
                      kind: 'unshielded',
                    }).pipe(defaultIfEmpty(null))
                  : of(null),
              ),
            ),
            // returning an array from `switchMap` sends all items separately
            switchMap(arrayOfTwoPayloads => arrayOfTwoPayloads),
            filter(Boolean),
            map(payload => actions.tokens.upsertTokensMetadata(payload)),
          ),
        ),
      ),
    );

export const updateSetPublicKeys =
  (wallet: MidnightWallet): SideEffect =>
  (_, __, { actions }) =>
    wallet.state().pipe(
      take(1),
      map(({ shielded }) =>
        actions.midnightContext.setPublicKeys({
          accountId: wallet.accountId,
          publicKeys: {
            coin: HexBytes(shielded.coinPublicKey.toHexString()),
            encryption: HexBytes(shielded.encryptionPublicKey.toHexString()),
          },
        }),
      ),
    );

/**
 * Creates a side effect that subscribes to wallet observables and dispatches
 * Redux actions for state updates (addresses, sync progress, dust balance, tokens).
 */
export const subscribeToWallet =
  (wallet: MidnightWallet): SideEffect =>
  (actionObservables, stateObservables, dependencies) => {
    const isUnshieldedEnabled$ =
      stateObservables.features.selectLoadedFeatures$.pipe(
        map(loaded =>
          getFeatureFlagByName(
            loaded.featureFlags,
            FEATURE_FLAG_MIDNIGHT_UNSHIELDED,
          ),
        ),
        map(Boolean),
      );

    return merge(
      ...[
        upsertAddresses(wallet, isUnshieldedEnabled$),
        updateSyncProgress(wallet, isUnshieldedEnabled$),
        updateDustBalance(wallet),
        updateDustGenerationDetails(wallet),
        updateTokens(wallet, isUnshieldedEnabled$),
        updateSetPublicKeys(wallet),
      ].map(sideEffect =>
        sideEffect(actionObservables, stateObservables, dependencies),
      ),
    );
  };

/**
 * Resets the idle timer when relevant dust sync activity is detected.
 *
 * Problem: DustWallet receives keys via `dust.start(dustSecretKey)` and the SDK
 * handles sync internally. Unlike ShieldedWallet's deferred sync which subscribes
 * to `keyManager.keys$` for each event (resetting the idle timer), DustWallet
 * sync doesn't touch `keys$` at all, causing the idle timeout to fire during
 * active dust sync.
 *
 * Solution: Observe `wallet.state().dust.availableCoins` changes. When the count
 * changes (indicating a relevant dust event was applied), touch `keyManager.keys$`
 * to reset the idle timer. The initial emission is skipped since it represents
 * restoration, not sync activity.
 *
 * @param wallet - The MidnightWallet to observe
 * @param keyManager - The AccountKeyManager whose idle timer should be reset
 * @returns Observable that completes without emitting (side effect only)
 */
export const resetIdleTimerOnDustActivity = (
  wallet: MidnightWallet,
  keyManager: AccountKeyManager,
): Observable<never> =>
  wallet.state().pipe(
    map(state => state.dust.availableCoins.length),
    distinctUntilChanged(),
    skip(1), // Skip initial emission (restoration, not sync activity)
    withLatestFrom(keyManager.areKeysAvailable$),
    // Only reset timer if keys are currently cached.
    // If keys have been cleared (idle timeout fired), don't trigger a new key request.
    filter(([_, areKeysAvailable]) => areKeysAvailable),
    switchMap(() =>
      keyManager.keys$.pipe(
        take(1),
        // Don't emit any value - this is purely for the side effect of resetting the timer
        switchMap(() => EMPTY),
      ),
    ),
  );

/**
 * Helper to decrypt an encrypted key buffer with an auth secret.
 */
const decryptKey = async (
  encryptedKey: HexBytes,
  authSecret: AuthSecret,
): Promise<ByteArray> =>
  ByteArray(await emip3decrypt(ByteArray.fromHex(encryptedKey), authSecret));

type AccountKeyManagerResult = {
  keyManager: AccountKeyManager;
  destroyAccountKeyManager: () => void;
};

/**
 * Creates an AccountKeyManager for a Midnight account with auth prompt integration.
 */
const createAccountKeyManager =
  (
    account: InMemoryWalletAccount<MidnightAccountProps>,
  ): ((...props: Parameters<SideEffect>) => AccountKeyManagerResult) =>
  (_, __, { accessAuthSecret }) => {
    const { networkId } = account.blockchainSpecific;

    /**
     * Decrypts all account keys using available auth secret.
     * Hangs on the secret access if app is locked.
     * Pre-computes ledger key objects (DustSecretKey, ZswapSecretKeys) to avoid
     * repeated fromSeed() calls during sync and wallet operations.
     */
    const requestKeys = (): Observable<AccountKeys> =>
      accessAuthSecret(authSecret =>
        from(
          Promise.all([
            decryptKey(
              account.blockchainSpecific.nightExternalKey.encryptedKey,
              authSecret,
            ),
            decryptKey(
              account.blockchainSpecific.dustKey.encryptedKey,
              authSecret,
            ),
            decryptKey(
              account.blockchainSpecific.zswapKey.encryptedKey,
              authSecret,
            ),
          ]),
        ),
      ).pipe(
        map(([nightKeyBuffer, dustKeyBuffer, zswapKeyBuffer]) => {
          // Pre-compute ledger key objects once to avoid repeated fromSeed() calls
          const dustSecretKey = ledger.DustSecretKey.fromSeed(dustKeyBuffer);
          const zswapSecretKeys =
            ledger.ZswapSecretKeys.fromSeed(zswapKeyBuffer);

          return {
            unshieldedKeystore: createKeystore(nightKeyBuffer, networkId),
            walletKeys: {
              dustKeyBuffer,
              zswapKeyBuffer,
              dustSecretKey,
              zswapSecretKeys,
            },
            clear: () => {
              nightKeyBuffer.fill(0);
              zswapKeyBuffer.fill(0);
              // TODO: uncomment this once filtered dust wallet indexer is available.
              // We're never stopping Dust wallet once started because it would be 'destroyed' otherwise.
              // dustKeyBuffer.fill(0);
              // dustSecretKey.clear();
              zswapSecretKeys.clear();
            },
          } satisfies AccountKeys;
        }),
      );

    const keyManager = createAccountKeyManagerImpl({ requestKeys });

    return {
      keyManager,
      destroyAccountKeyManager: () => {
        keyManager.destroy();
      },
    };
  };

/**
 * Creates a side effect that watches a single Midnight account for changes.
 * Stops the wallet when unsubscribed.
 *
 * @param account - The Midnight account to watch
 * @param config - Network configuration for the Midnight wallet
 * @param store - Storage for persisting serialized wallet state
 * @returns A side effect that monitors the account
 */
export const watchMidnightAccount =
  (
    account: InMemoryWalletAccount<MidnightAccountProps>,
    config: MidnightNetworkConfig,
    store: CollectionStorage<SerializedMidnightWallet>,
  ): SideEffect =>
  (actionObservables, stateObservables, dependencies) => {
    const { keyManager, destroyAccountKeyManager } = createAccountKeyManager(
      account,
    )(actionObservables, stateObservables, dependencies);

    return dependencies
      .startMidnightAccountWallet({
        account,
        config,
        store,
        keyManager,
      })
      .pipe(
        tap(midnightWallet => {
          midnightWallets$.next({
            ...midnightWallets$.value,
            [midnightWallet.accountId]: midnightWallet,
          });
        }),
        mergeMap(midnightWallet =>
          merge(
            subscribeToWallet(midnightWallet)(
              actionObservables,
              stateObservables,
              dependencies,
            ),
            resetIdleTimerOnDustActivity(midnightWallet, keyManager),
          ).pipe(
            finalize(() => {
              midnightWallet.stop().subscribe();
              const { [midnightWallet.accountId]: _, ...remainingWallets } =
                midnightWallets$.value;
              midnightWallets$.next(remainingWallets);
            }),
          ),
        ),
        finalize(() => {
          destroyAccountKeyManager();
        }),
      );
  };

/**
 * Creates a side effect that manages watching all Midnight accounts.
 *
 * Automatically starts watching new accounts when they appear and stops
 * watching accounts when they are removed. When the network changes, all
 * existing watchers are stopped and new ones are started for accounts
 * matching the new network.
 *
 * When resync is triggered, all watchers are stopped and immediately
 * restarted to sync from the cleared storage state.
 *
 * @param store - Storage for persisting serialized wallet state
 * @param watchAccount - Factory function to create a watcher for individual accounts
 * @returns A side effect that orchestrates account watching lifecycle
 */
export const watchMidnightAccounts =
  (
    store: CollectionStorage<SerializedMidnightWallet>,
    watchAccount: typeof watchMidnightAccount,
  ): SideEffect =>
  (actionObservables, selectorObservables, dependencies) =>
    merge(of(0), actionObservables.midnight.restartWalletWatch$).pipe(
      switchMap(() =>
        selectorObservables.midnightContext.selectCurrentNetwork$.pipe(
          distinctUntilChanged(deepEquals),
          share(),
        ),
      ),
      switchMap(currentNetwork => {
        const accounts$ = combineLatest([
          selectorObservables.wallets.selectActiveNetworkAccounts$,
          selectorObservables.wallets.selectIsWalletRepoMigrating$,
        ]).pipe(
          map(([accounts, isWalletRepoMigrating]) =>
            isWalletRepoMigrating ? [] : accounts,
          ),
          filterMidnightAccounts(currentNetwork),
          share(),
        );
        return accounts$.pipe(
          mergeAll(),
          groupBy(account => account.accountId),
          mergeMap(group$ =>
            group$.pipe(
              exhaustMap(account =>
                watchAccount(account, currentNetwork.config, store)(
                  actionObservables,
                  selectorObservables,
                  dependencies,
                ).pipe(
                  takeUntil(
                    accounts$.pipe(noLongerHasAccount(account.accountId)),
                  ),
                  catchError(error => {
                    dependencies.logger.error('Account watch failure:', error);
                    return EMPTY;
                  }),
                ),
              ),
            ),
          ),
        );
      }),
    );
