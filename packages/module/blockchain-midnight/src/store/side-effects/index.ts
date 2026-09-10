import { deepEquals } from '@cardano-sdk/util';
import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import {
  hasMidnightAccount,
  isInMemoryMidnightAccount,
  midnightAccounts$,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { Milliseconds } from '@lace-lib/util';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';
import {
  distinctUntilChanged,
  filter,
  from,
  map,
  merge,
  pairwise,
  switchMap,
  throttleTime,
  withLatestFrom,
} from 'rxjs';

import {
  FEATURE_FLAG_MIDNIGHT_DISCLAIMER,
  FeatureFlagKeysByNetworkId,
  GatedMidnightSDKNetworkId,
} from '../../const';
import { MidnightWalletFailureId } from '../../value-objects/midnight-wallet-failure-id.vo';

import {
  sendFlowAddressValidation,
  sendFlowAnalyticsEnhancer,
} from './send-flow';

import type { SideEffect } from '../..';
import type { FeatureFlag } from '@lace-contract/feature/src';
import type {
  MidnightAccountProps,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import type { LaceInitSync } from '@lace-contract/module';
import type { TestnetOption } from '@lace-contract/network';
import type {
  AnyAccount,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

const withMidnightAccounts =
  (
    makeSideEffect: (
      accounts$: Observable<InMemoryWalletAccount<MidnightAccountProps>[]>,
    ) => SideEffect,
  ): SideEffect =>
  (actionObservables, stateObservables, dependencies) =>
    makeSideEffect(midnightAccounts$(stateObservables))(
      actionObservables,
      stateObservables,
      dependencies,
    );

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
 * Auto-dismiss Midnight wallet failure when the wallet resumes.
 *
 * `walletResumed$` fires on the rising edge after a genuine pause (the
 * unlock transition), so any failure accumulated while the wallet was
 * paused is dismissed on resume — automatic error recovery without user
 * intervention.
 */
export const autoDismissMidnightWalletFailure: SideEffect = (
  _,
  { wallets: { selectAll$ }, failures: { selectFailureById$ } },
  { walletResumed$ },
) =>
  walletResumed$.pipe(
    withLatestFrom(selectAll$),
    switchMap(([, wallets]) =>
      wallets.map(w => MidnightWalletFailureId(w.walletId)),
    ),
    autoDismissFailureOnSuccess(selectFailureById$),
  );

const getFeatureFlagByName = (
  featureFlags: FeatureFlag[],
  featureFlagName: string,
) =>
  featureFlags.find(featureFlag => featureFlag.key === featureFlagName) || null;

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
    features: { selectLoadedFeatures$ },
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
      withLatestFrom(
        selectShouldAcknowledgeMidnightDisclaimer$,
        selectLoadedFeatures$,
      ),
      filter(
        ([, status, loadedFeatures]) =>
          status === 'not-shown' &&
          loadedFeatures.featureFlags.some(
            f => f.key === FEATURE_FLAG_MIDNIGHT_DISCLAIMER,
          ),
      ),
      map(() => setDisclaimerShown()),
    ),
    updateWallet$.pipe(
      filter(({ payload }) => payload.changes.accounts !== undefined),
      withLatestFrom(
        walletsPairwise$,
        selectShouldAcknowledgeMidnightDisclaimer$,
        selectLoadedFeatures$,
      ),
      filter(
        ([
          action,
          [previousWallets, nextWallets],
          disclaimerStatus,
          loadedFeatures,
        ]) => {
          if (disclaimerStatus !== 'not-shown') return false;
          if (
            !loadedFeatures.featureFlags.some(
              f => f.key === FEATURE_FLAG_MIDNIGHT_DISCLAIMER,
            )
          )
            return false;

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
        },
      ),
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

export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => {
  return [
    (actionObservables, stateObservables, dependencies) => {
      return merge(
        ...[
          registerMidnightBlockchainNetworks,
          syncSupportedNetworksWithFeatureFlags,
          autoDismissMidnightWalletFailure,
          handleMidnightSettingsChange,
          sendFlowAddressValidation,
          sendFlowAnalyticsEnhancer,
          triggerMidnightDisclaimerOnWalletCreation,
          updateActiveAccountContextOnNetworkSwitch,
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      );
    },
  ];
};
