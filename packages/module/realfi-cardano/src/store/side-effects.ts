import { getRealFiConfigFromFlags } from '@lace-contract/realfi-staking';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  tap,
} from 'rxjs';

import {
  setCachedEarnedUsdPerSusdr,
  setCachedPendingUnstakeBaseUnits,
  setCachedYieldInfoByNetwork,
} from '../realfi-yield';

import type { SideEffect } from '../index';
import type { BlockchainNetworkId } from '@lace-contract/network';

/**
 * Mirrors the store's earned-USD-per-sUSDr map (persisted basis-rate
 * appreciation, LW-14651) into the module-level cache the store-blind
 * Staking Center product-card addon reads via `earnedUsdPerToken`.
 */
export const makeEarnedUsdCache: SideEffect = (
  _,
  { realfiPosition: { selectEarnedUsdPerSusdrByNetwork$ } },
) =>
  selectEarnedUsdPerSusdrByNetwork$.pipe(
    tap(byNetwork => {
      setCachedEarnedUsdPerSusdr(byNetwork);
    }),
    ignoreElements(),
  );

/**
 * Mirrors the store's wallet-wide pending-unstake total (cooldown +
 * withdraw-ready USDr base units, LW-14651 AC1) into the module cache the
 * store-blind product-card addon reads via `pendingUsd`.
 */
export const makePendingUnstakeCache: SideEffect = (
  _,
  { realfiPosition: { selectPendingUnstakeTotalBaseUnits$ } },
) =>
  selectPendingUnstakeTotalBaseUnits$.pipe(
    tap(baseUnits => {
      setCachedPendingUnstakeBaseUnits(baseUnits);
    }),
    ignoreElements(),
  );

/**
 * Mirrors the store's persisted per-network yield info (APY + vault rate)
 * into the module cache the store-blind Staking Center product-card addon
 * reads via `apyDisplay`/`usdBalance`. The store is the ONLY owner of these
 * figures — the card and the USDr detail screen (which selects the store
 * directly) must present the same value.
 */
export const makeYieldInfoCache: SideEffect = (
  _,
  { realfiPosition: { selectYieldInfoByNetwork$ } },
) =>
  selectYieldInfoByNetwork$.pipe(
    tap(byNetwork => {
      setCachedYieldInfoByNetwork(byNetwork);
    }),
    ignoreElements(),
  );

/**
 * Requests the store's yield-info read (the contract's `makeYieldInfo`, which
 * persists per network and feeds `makeYieldInfoCache` above) as soon as the
 * loaded flags enable any RealFi network — and again on network changes — so
 * the Staking Center's USDr card has current APY + vault rate on a cold boot
 * instead of waiting for a detail-screen visit.
 */
export const makeStakingYieldPrime: SideEffect = (
  _,
  { features: { selectLoadedFeatures$ }, network: { selectActiveNetworkId$ } },
  { actions },
) =>
  combineLatest([selectLoadedFeatures$, selectActiveNetworkId$]).pipe(
    map(([loadedFeatures, selectActiveNetworkId]) => {
      const networkId = selectActiveNetworkId('Cardano') as BlockchainNetworkId;
      return getRealFiConfigFromFlags(loadedFeatures.featureFlags, networkId)
        ?.realfiNetwork;
    }),
    filter(network => network !== undefined),
    distinctUntilChanged(),
    map(() => actions.realfiPosition.yieldInfoRequested()),
  );

/**
 * Kicks the wallet-wide withdrawables/cooldown read (the contract's
 * `makeWithdrawables`) as soon as the RealFi config and Cardano accounts are
 * available — and again on network/account changes — so the Staking Center's
 * pending-unstake balance (LW-14651 AC1) doesn't wait for a detail-screen
 * visit to populate the (non-persisted) store.
 */
export const makePendingUnstakeRefresh: SideEffect = (
  _,
  {
    features: { selectLoadedFeatures$ },
    network: { selectActiveNetworkId$ },
    wallets: { selectActiveNetworkAccountsByBlockchainName$ },
  },
  { actions },
) =>
  combineLatest([
    selectLoadedFeatures$,
    selectActiveNetworkId$,
    selectActiveNetworkAccountsByBlockchainName$,
  ]).pipe(
    map(([loadedFeatures, selectActiveNetworkId, selectAccounts]) => {
      const networkId = selectActiveNetworkId('Cardano') as BlockchainNetworkId;
      const config = getRealFiConfigFromFlags(
        loadedFeatures.featureFlags,
        networkId,
      );
      const accounts = selectAccounts({ blockchainName: 'Cardano' }) ?? [];
      return config && accounts.length > 0
        ? `${config.realfiNetwork}:${accounts.length}`
        : undefined;
    }),
    filter(key => key !== undefined),
    distinctUntilChanged(),
    map(() => actions.realfiPosition.withdrawablesRequested()),
  );
