import { deepEquals } from '@cardano-sdk/util';
import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import {
  convertHttpUrlToWebsocket,
  getValidNetworkStringPayload,
  hasMidnightAccount,
  isInMemoryMidnightAccount,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { Milliseconds, Timestamp } from '@lace-sdk/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import omit from 'lodash/omit.js';
import {
  catchError,
  combineLatest,
  defaultIfEmpty,
  distinctUntilChanged,
  EMPTY,
  filter,
  forkJoin,
  from,
  map,
  merge,
  mergeMap,
  of,
  pairwise,
  switchMap,
  take,
  throttleTime,
  withLatestFrom,
} from 'rxjs';

import {
  FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_INDEXER_URLS,
  FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_NODE_URLS,
  FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
  FeatureFlagKeysByNetworkId,
  GatedMidnightSDKNetworkId,
} from '../../const';
import { MidnightWalletFailureId } from '../../value-objects/midnight-wallet-failure-id.vo';

import { loadActivityDetails, updateActivities } from './activities';
import {
  sendFlowAddressValidation,
  sendFlowAnalyticsEnhancer,
} from './send-flow';
import { watchMidnightAccount, watchMidnightAccounts } from './watch';

import type { SideEffect } from '../..';
import type { FeatureFlag } from '@lace-contract/feature/src';
import type {
  MidnightAccountProps,
  SerializedMidnightWallet,
  MidnightSDKNetworkId,
  MidnightNetworkConfig,
} from '@lace-contract/midnight-context';
import type { LaceInitSync } from '@lace-contract/module';
import type { TestnetOption } from '@lace-contract/network';
import type { CollectionStorage } from '@lace-contract/storage';
import type {
  AnyAccount,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

const sameAccounts = (
  accounts1: InMemoryWalletAccount<MidnightAccountProps>[],
  accounts2: InMemoryWalletAccount<MidnightAccountProps>[],
) => {
  if (accounts1.length !== accounts2.length) return false;
  for (let index = 0; index < accounts1.length; index++) {
    if (accounts1[index].accountId !== accounts2[index].accountId) return false;
  }
  return true;
};

const withMidnightAccounts =
  (
    makeSideEffect: (
      midnightAccounts$: Observable<
        InMemoryWalletAccount<MidnightAccountProps>[]
      >,
    ) => SideEffect,
  ): SideEffect =>
  (actionObservables, stateObservables, dependencies) => {
    const midnightAccounts$ = combineLatest([
      stateObservables.wallets.selectActiveNetworkAccounts$,
      stateObservables.midnightContext.selectMidnightBlockchainNetworkId$.pipe(
        filter(Boolean),
      ),
      stateObservables.wallets.selectIsWalletRepoMigrating$,
    ]).pipe(
      map(([accounts, activeNetwork, isWalletRepoMigrating]) =>
        isWalletRepoMigrating
          ? []
          : accounts
              .filter(isInMemoryMidnightAccount)
              .filter(account => account.blockchainNetworkId === activeNetwork),
      ),
      distinctUntilChanged(sameAccounts),
    );

    return makeSideEffect(midnightAccounts$)(
      actionObservables,
      stateObservables,
      dependencies,
    );
  };

/**
 * Registers Midnight blockchain networks with the global network store.
 * Only triggers once when Midnight is not yet registered.
 *
 * For migration: If an existing Midnight account exists, uses its network
 * as the testnet selection. Otherwise uses the default testnet.
 */
export const registerMidnightBlockchainNetworks: SideEffect = (
  _,
  {
    network: { selectBlockchainNetworks$ },
    midnightContext: { selectDefaultTestNetNetworkId$ },
    wallets: { selectAll$ },
  },
  { actions },
) =>
  selectBlockchainNetworks$.pipe(
    filter(blockchainNetworks => !blockchainNetworks?.Midnight),
    withLatestFrom(
      selectDefaultTestNetNetworkId$,
      selectAll$.pipe(
        map(allWallets =>
          allWallets.flatMap((wallet): AnyAccount[] => wallet.accounts),
        ),
      ),
    ),
    map(([, defaultTestNetNetworkId, accounts]) => {
      // Check for existing Midnight account (for migration)
      const existingMidnightAccount = accounts.find(
        account => account.blockchainName === 'Midnight',
      );
      const testnetNetworkId = existingMidnightAccount
        ? (existingMidnightAccount.blockchainSpecific as MidnightAccountProps)
            .networkId
        : defaultTestNetNetworkId;

      return actions.network.setBlockchainNetworks({
        blockchain: 'Midnight',
        mainnet: MidnightNetworkId('mainnet'),
        testnet: MidnightNetworkId(testnetNetworkId),
      });
    }),
  );

/**
 * Auto-dismiss Midnight wallet failure when unlock succeeds.
 *
 * This side effect listens for successful unlock actions and dismisses
 * any existing failure for that wallet. This provides automatic error
 * recovery without user intervention.
 */
export const autoDismissMidnightWalletFailure: SideEffect = (
  _,
  {
    appLock: { isUnlocked$ },
    wallets: { selectAll$ },
    failures: { selectFailureById$ },
  },
) =>
  isUnlocked$.pipe(
    distinctUntilChanged(),
    filter(Boolean),
    withLatestFrom(selectAll$),
    switchMap(([_, wallets]) =>
      wallets.map(w => MidnightWalletFailureId(w.walletId)),
    ),
    autoDismissFailureOnSuccess(selectFailureById$),
  );

export const requestResyncWallet = withMidnightAccounts(
  midnightAccount$ =>
    ({ midnight: { requestResync$ } }, _, { actions }) =>
      merge(
        requestResync$.pipe(
          withLatestFrom(midnightAccount$),
          switchMap(([_, accounts]) => {
            const syncActions = accounts.map(({ accountId }) =>
              actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                  startedAt: Timestamp(Date.now()),
                },
              }),
            );

            return from([...syncActions, actions.midnight.resync()]);
          }),
        ),
      ),
);

export const createClearWalletStateOnResync = (
  store: CollectionStorage<SerializedMidnightWallet>,
): SideEffect =>
  withMidnightAccounts(
    midnightAccounts$ =>
      ({ midnight: { resync$ } }, _, { actions, stopAllMidnightWallets }) =>
        resync$.pipe(
          withLatestFrom(midnightAccounts$),
          switchMap(([_, midnightAccounts]) =>
            stopAllMidnightWallets().pipe(
              switchMap(() => store.setAll([])),
              switchMap(() => [
                ...midnightAccounts.map(({ accountId }) =>
                  actions.tokens.resetAccountTokens({
                    accountId,
                  }),
                ),
                actions.midnight.restartWalletWatch(),
              ]),
            ),
          ),
        ),
  );

/**
 * Side-effect that triggers a Midnight wallet resync whenever the config change
 * is made with a feature flag override and the wallet is unlocked.
 */
export const resyncWalletOnConfigChangeFromFeatureFlags = withMidnightAccounts(
  midnightAccounts$ =>
    (
      _,
      {
        appLock: { isUnlocked$ },
        midnightContext: {
          selectCurrentNetwork$,
          selectNetworksConfigFeatureFlagsOverrides$,
        },
      },
      { actions },
    ) => {
      const configChangesCausedByFFUpdate$ =
        selectNetworksConfigFeatureFlagsOverrides$.pipe(
          withLatestFrom(isUnlocked$),
          filter(([_, isUnlocked]) => isUnlocked),
          switchMap(() => selectCurrentNetwork$.pipe(take(1))),
          map(({ config }) => config),
          distinctUntilChanged(deepEquals),
        );

      return configChangesCausedByFFUpdate$.pipe(
        withLatestFrom(midnightAccounts$),
        switchMap(([_, midnightAccounts]) =>
          from([
            ...midnightAccounts.map(({ accountId }) =>
              actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                  startedAt: Timestamp(Date.now()),
                },
              }),
            ),
            actions.midnight.resync(),
          ]),
        ),
      );
    },
);

export const createDeleteWalletSideEffect =
  (storage: CollectionStorage<SerializedMidnightWallet>): SideEffect =>
  (
    { wallets: { removeWallet$ } },
    { wallets: { selectAll$ } },
    { stopMidnightWallet, actions },
  ) =>
    removeWallet$.pipe(
      withLatestFrom(
        selectAll$.pipe(map(wallets => wallets.filter(hasMidnightAccount))),
      ),
      switchMap(([{ payload }, midnightWallets]) => {
        const walletId =
          typeof payload === 'string' ? payload : payload.walletId;

        const targetWallet = midnightWallets.find(w => w.walletId === walletId);
        if (!targetWallet) return EMPTY;

        const allMidnightAccounts = targetWallet.accounts.filter(
          isInMemoryMidnightAccount,
        );

        const stopWallets$ =
          allMidnightAccounts.length > 0
            ? forkJoin(
                allMidnightAccounts.map(({ accountId }) =>
                  stopMidnightWallet(accountId),
                ),
              )
            : of([]);

        return stopWallets$.pipe(
          switchMap(() =>
            storage.getAll().pipe(
              defaultIfEmpty([]),
              take(1),
              switchMap(wallets => {
                const remainingWallets = wallets.filter(
                  wallet => wallet.walletId !== walletId,
                );
                return storage.setAll(remainingWallets);
              }),
            ),
          ),
          mergeMap(() =>
            allMidnightAccounts.flatMap(({ accountId }) => [
              actions.addresses.resetAddresses({
                accountId,
              }),
              actions.tokens.resetAccountTokens({
                accountId,
              }),
              actions.activities.resetActivities({
                accountId,
              }),
            ]),
          ),
        );
      }),
    );

const getFeatureFlagByName = (
  featureFlags: FeatureFlag[],
  featureFlagName: string,
) =>
  featureFlags.find(featureFlag => featureFlag.key === featureFlagName) || null;

/*
  This side effect is responsible for setting the remote proof server address
  based on loading or updating the feature flag. If the feature flag is not present or the payload
  is incorrect, it will log an error and do nothing.
  Currently available for Testnet network only.
*/
export const setFeatureFlagsNetworksConfigOverrides: SideEffect = (
  _,
  {
    features: { selectLoadedFeatures$, selectNextFeatureFlags$ },
    midnightContext: {
      selectNetworksConfigFeatureFlagsOverrides$,
      selectSupportedNetworksIds$,
    },
  },
  { actions },
) => {
  return merge(
    // Listen to and unify the shape of loaded / next features
    selectLoadedFeatures$,
    selectNextFeatureFlags$.pipe(
      map(nextFeatureFlags => ({
        featureFlags: nextFeatureFlags?.features ?? [],
      })),
    ),
  ).pipe(
    map(({ featureFlags }) => ({
      remoteProofServer: getFeatureFlagByName(
        featureFlags,
        FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
      ),
      indexerUrls: getFeatureFlagByName(
        featureFlags,
        FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_INDEXER_URLS,
      ),
      nodeUrls: getFeatureFlagByName(
        featureFlags,
        FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_NODE_URLS,
      ),
    })),
    distinctUntilChanged(deepEquals),
    withLatestFrom(
      selectNetworksConfigFeatureFlagsOverrides$,
      selectSupportedNetworksIds$,
    ),
    switchMap(
      ([
        { remoteProofServer, indexerUrls, nodeUrls },
        featureFlagsNetworksConfigOverrides,
        supportedNetworksIds,
      ]) => {
        const remoteProofServerOverrides =
          (remoteProofServer &&
            getValidNetworkStringPayload(
              supportedNetworksIds,
              remoteProofServer,
            )) ||
          {};

        const indexerUrlsOverrides =
          (indexerUrls &&
            getValidNetworkStringPayload(supportedNetworksIds, indexerUrls)) ||
          {};

        const nodeUrlsOverrides =
          (nodeUrls &&
            getValidNetworkStringPayload(supportedNetworksIds, nodeUrls)) ||
          {};

        return merge(
          ...supportedNetworksIds.map(networkId => {
            const existing = featureFlagsNetworksConfigOverrides[networkId];
            const config: Partial<MidnightNetworkConfig> = {
              ...omit(existing, [
                'nodeAddress',
                'proofServerAddress',
                'indexerAddress',
              ]),
              ...(nodeUrlsOverrides[networkId]
                ? { nodeAddress: nodeUrlsOverrides[networkId] }
                : {}),
              ...(remoteProofServerOverrides[networkId]
                ? {
                    proofServerAddress: remoteProofServerOverrides[networkId],
                  }
                : {}),
              ...(indexerUrlsOverrides[networkId]
                ? { indexerAddress: indexerUrlsOverrides[networkId] }
                : {}),
            };

            return of(
              actions.midnightContext.setUserNetworkConfigOverride({
                networkId,
                config,
                featureFlagsOverrides: {},
              }),
            );
          }),
        );
      },
    ),
  );
};

/**
 * Synchronizes the list of supported Midnight networks based on feature flags.
 *
 * Monitors these feature flags:
 * - BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT
 * - BLOCKCHAIN_MIDNIGHT_PREPROD_SUPPORT
 * - BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT
 * - BLOCKCHAIN_MIDNIGHT_QANET_SUPPORT
 *
 * When a feature flag changes:
 * 1. Updates the supported networks set (adds/removes networks)
 * 2. If the current network becomes unsupported, switches to default testnet
 */
export const syncSupportedNetworksWithFeatureFlags: SideEffect = (
  _,
  {
    features: { selectLoadedFeatures$, selectNextFeatureFlags$ },
    midnightContext: { selectDefaultTestNetNetworkId$, selectNetworkId$ },
  },
  { actions },
) => {
  return merge(
    // Listen to and unify the shape of loaded / next features
    selectLoadedFeatures$,
    selectNextFeatureFlags$.pipe(
      filter(Boolean),
      map(nextFeatureFlags => ({
        featureFlags: nextFeatureFlags.features,
      })),
    ),
  ).pipe(
    map(({ featureFlags }) => {
      const gatedNetworkIds = {} as Record<GatedMidnightSDKNetworkId, boolean>;

      for (const id of GatedMidnightSDKNetworkId)
        gatedNetworkIds[id] = !!getFeatureFlagByName(
          featureFlags,
          FeatureFlagKeysByNetworkId[id],
        );

      return gatedNetworkIds;
    }),
    distinctUntilChanged(deepEquals),
    throttleTime(Milliseconds(1000), undefined, {
      leading: false,
      trailing: true,
    }),
    withLatestFrom(selectDefaultTestNetNetworkId$, selectNetworkId$),
    switchMap(([gatedNetworkIds, defaultTestNetNetworkId, networkId]) => {
      const supportedNetworkIds = new Set<MidnightSDKNetworkId>([
        MidnightSDKNetworkIds.Undeployed,
      ]);

      for (const id of GatedMidnightSDKNetworkId)
        if (gatedNetworkIds[id]) supportedNetworkIds.add(id);

      const isCurrentNetworkDisabled = !supportedNetworkIds.has(networkId);
      const supportedNetworks = Array.from(supportedNetworkIds);
      return [
        actions.midnightContext.setSupportedNetworksIds(supportedNetworks),
        actions.network.setTestnetOptions({
          blockchainName: 'Midnight',
          options: supportedNetworks
            .filter(network => network !== NetworkId.NetworkId.MainNet)
            .map(
              (networkId): TestnetOption => ({
                id: MidnightNetworkId(networkId),
                label: `midnight.network-config.network-option.${networkId}`,
              }),
            ),
        }),
        // Switch away from a disabled network
        ...(isCurrentNetworkDisabled
          ? [
              actions.network.setBlockchainNetworks({
                blockchain: 'Midnight',
                mainnet: MidnightNetworkId('mainnet'),
                testnet: MidnightNetworkId(defaultTestNetNetworkId),
              }),
            ]
          : []),
      ];
    }),
  );
};

export const handleMidnightSettingsChange: SideEffect = (
  _,
  {
    midnight: { selectSettingsDrawerState$ },
    midnightContext: { selectNetworksConfigFeatureFlagsOverrides$ },
  },
  { actions },
) =>
  firstStateOfStatus(selectSettingsDrawerState$, 'Saving').pipe(
    withLatestFrom(selectNetworksConfigFeatureFlagsOverrides$),
    switchMap(([{ config, networkId }, featureFlagsOverrides]) => {
      const isMainnet = networkId === NetworkId.NetworkId.MainNet;
      const networkType = isMainnet ? 'mainnet' : 'testnet';

      return from([
        actions.network.setNetworkType(networkType),
        ...(isMainnet
          ? []
          : [
              actions.network.setBlockchainNetworks({
                blockchain: 'Midnight',
                mainnet: MidnightNetworkId('mainnet'),
                testnet: MidnightNetworkId(networkId),
              }),
            ]),
        actions.midnightContext.setUserNetworkConfigOverride({
          networkId,
          config,
          featureFlagsOverrides: featureFlagsOverrides[networkId] ?? {},
        }),
        actions.midnight.savingCompleted(),
      ]);
    }),
  );

/**
 * Sets the Midnight disclaimer to `shown` when an in-memory Midnight account is introduced and
 * `shouldAcknowledgeMidnightDisclaimer` is still `not-shown` — via `addWallet` (wallet includes
 * Midnight) or `updateWallet` (Midnight added to an existing wallet).
 *
 * The Midnight `accountId` diff on `updateWallet` matters because the persisted flag can return to
 * `not-shown` while wallets already list Midnight (e.g. persist migrate step 6 in
 * `packages/contract/midnight-context/src/store/init.ts`), and each `updateWallet` sends the full
 * `accounts` array so unrelated edits still carry existing Midnight rows.
 */
export const triggerMidnightDisclaimerOnWalletCreation: SideEffect = (
  { wallets: { addWallet$, updateWallet$ } },
  {
    midnightContext: { selectShouldAcknowledgeMidnightDisclaimer$ },
    wallets: { selectAll$ },
  },
  { actions },
) => {
  const setDisclaimerShown = () =>
    actions.midnightContext.setShouldAcknowledgeMidnightDisclaimer('shown');

  const walletsPairwise$ = selectAll$.pipe(pairwise());

  return merge(
    addWallet$.pipe(
      filter(({ payload }) => hasMidnightAccount(payload)),
      withLatestFrom(selectShouldAcknowledgeMidnightDisclaimer$),
      filter(([, status]) => status === 'not-shown'),
      map(() => setDisclaimerShown()),
    ),
    updateWallet$.pipe(
      filter(({ payload }) => payload.changes.accounts !== undefined),
      withLatestFrom(
        walletsPairwise$,
        selectShouldAcknowledgeMidnightDisclaimer$,
      ),
      filter(([action, [previousWallets, nextWallets], disclaimerStatus]) => {
        if (disclaimerStatus !== 'not-shown') return false;

        const walletId = action.payload.id;
        const previousWallet = previousWallets.find(
          w => w.walletId === walletId,
        );
        const nextWallet = nextWallets.find(w => w.walletId === walletId);
        if (!previousWallet || !nextWallet) return false;

        // `updateWallet` carries the full `accounts` array. Any edit (e.g. add Cardano, rename)
        // still includes existing Midnight rows, so "has Midnight in next" is not enough.
        // Require a new Midnight accountId vs. the previous snapshot so we do not fire on
        // unrelated updates while the disclaimer flag is still `not-shown` (see effect JSDoc).
        const previousMidnightIds = new Set(
          previousWallet.accounts
            .filter(isInMemoryMidnightAccount)
            .map(a => a.accountId),
        );
        const isNewMidnightAccountAdded = nextWallet.accounts
          .filter(isInMemoryMidnightAccount)
          .some(account => !previousMidnightIds.has(account.accountId));

        return isNewMidnightAccountAdded;
      }),
      map(() => setDisclaimerShown()),
    ),
  );
};

/**
 * Updates the active account context when the network switches.
 *
 * When a network switch occurs, the active midnight accounts change (filtered by
 * the new network). If the current activeAccountContext points to an account that
 * is no longer in the active network, this side effect updates it to the first
 * account of the new network.
 */
export const updateActiveAccountContextOnNetworkSwitch: SideEffect =
  withMidnightAccounts(
    midnightAccounts$ =>
      (_, { wallets: { selectActiveAccountContext$ } }, { actions }) =>
        midnightAccounts$.pipe(
          withLatestFrom(selectActiveAccountContext$),
          filter(
            ([accounts, activeContext]) =>
              accounts.length > 0 &&
              activeContext !== null &&
              !accounts.some(a => a.accountId === activeContext.accountId),
          ),
          map(([accounts]) =>
            actions.wallets.setActiveAccountContext({
              walletId: accounts[0].walletId,
              accountId: accounts[0].accountId,
            }),
          ),
        ),
  );

/**
 * Fetches network Terms & Conditions from the indexer on each network change.
 * Stores the result in Redux; consumers fall back to the hardcoded config URL on failure.
 */
export const fetchNetworkTermsAndConditions: SideEffect = (
  _,
  { midnightContext: { selectCurrentNetwork$ } },
  { actions, logger },
) =>
  selectCurrentNetwork$.pipe(
    distinctUntilChanged(deepEquals),
    switchMap(({ config }) =>
      from(
        WalletFacade.fetchTermsAndConditions({
          indexerClientConnection: {
            indexerHttpUrl: config.indexerAddress,
            indexerWsUrl: convertHttpUrlToWebsocket(config.indexerAddress),
          },
        }),
      ).pipe(
        map(termsAndConditions =>
          actions.midnightContext.setNetworkTermsAndConditions(
            termsAndConditions,
          ),
        ),
        catchError(error => {
          logger.error('Failed to fetch network Terms & Conditions:', error);
          return of(
            actions.midnightContext.setNetworkTermsAndConditions(undefined),
          );
        }),
      ),
    ),
  );

export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => {
  return [
    (actionObservables, stateObservables, dependencies) => {
      const midnightStateStorage =
        dependencies.createCollectionStorage<SerializedMidnightWallet>({
          collectionId: 'midnightWalletState',
          computeDocId: wallet => `${wallet.walletId}-${wallet.networkId}`,
        });

      const deleteWallet = createDeleteWalletSideEffect(midnightStateStorage);
      const clearWalletStateOnResync =
        createClearWalletStateOnResync(midnightStateStorage);

      // New account-based wallet management replaces:
      // - createUnlockWalletSideEffect (wallet lifecycle)
      // - triggerUnlockFromAuthenticationPrompt (auth trigger)
      // - createUpsertAddresses (now in subscribeToWallet)
      // - createUpdateSyncProgress (now in subscribeToWallet)
      // - updateDustBalance (now in subscribeToWallet)
      // - createUpdateTokens (now in subscribeToWallet)
      const accountWalletWatcher = watchMidnightAccounts(
        midnightStateStorage,
        watchMidnightAccount,
      );

      return merge(
        ...[
          registerMidnightBlockchainNetworks,
          syncSupportedNetworksWithFeatureFlags,
          setFeatureFlagsNetworksConfigOverrides,
          autoDismissMidnightWalletFailure,
          updateActivities,
          loadActivityDetails,
          deleteWallet,
          clearWalletStateOnResync,
          resyncWalletOnConfigChangeFromFeatureFlags,
          handleMidnightSettingsChange,
          requestResyncWallet,
          accountWalletWatcher,
          sendFlowAddressValidation,
          sendFlowAnalyticsEnhancer,
          triggerMidnightDisclaimerOnWalletCreation,
          fetchNetworkTermsAndConditions,
          updateActiveAccountContextOnNetworkSwitch,
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      );
    },
  ];
};
