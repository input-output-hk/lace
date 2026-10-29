import { midnightContextActions } from '@lace-contract/midnight-context';
import { mergeMap, take, zip } from 'rxjs';

import type { SideEffect } from '../../context';
import type {
  MidnightNetworkConfig,
  MidnightSDKNetworkId,
  ProofServerMode,
} from '@lace-contract/midnight-context';
import type { Action, Middleware } from '@reduxjs/toolkit';

/** Endpoint overrides per Midnight network; each replaces the fields it sets. */
export type MidnightNetworkConfigOverrides = Partial<
  Record<MidnightSDKNetworkId, Partial<MidnightNetworkConfig>>
>;

/** A headless loadout's network choices, applied once on startup. */
export type MidnightNetworkStartupConfig = {
  /** Endpoint overrides per network, stored as user overrides. */
  networks?: MidnightNetworkConfigOverrides;
  /** The networks the loadout can sync, the only ones selectable; the contract's list when absent. */
  supportedNetworkIds?: MidnightSDKNetworkId[];
  /**
   * The proof server each listed network proves with by default; the
   * contract's default when absent. A user override of another available
   * mode still takes precedence.
   */
  defaultProofServers?: Partial<Record<MidnightSDKNetworkId, ProofServerMode>>;
};

/**
 * Applies a loadout's supported networks and default proof servers right
 * after the first action the store handles, which redux-persist dispatches
 * while the store is created. Both therefore hold before the store is handed
 * out and before any side effect starts: a side effect would land a tick
 * later, and a network selected in between would be checked against the
 * contract's full list.
 */
export const createApplyNetworkDefaultsMiddleware = ({
  supportedNetworkIds,
  defaultProofServers,
}: Pick<
  MidnightNetworkStartupConfig,
  'defaultProofServers' | 'supportedNetworkIds'
>): Middleware => {
  const { setDefaultProofServers, setSupportedNetworksIds } =
    midnightContextActions.midnightContext;
  return store => next => {
    let pending: Action[] = [
      ...(supportedNetworkIds
        ? [setSupportedNetworksIds(supportedNetworkIds)]
        : []),
      ...(defaultProofServers
        ? [setDefaultProofServers(defaultProofServers)]
        : []),
    ];
    return action => {
      const result = next(action);
      const defaults = pending;
      pending = [];
      for (const defaultAction of defaults) store.dispatch(defaultAction);
      return result;
    };
  };
};

/**
 * Applies a loadout's endpoint choices as user overrides on startup, so they
 * take precedence over the contract defaults and the feature-flag values
 * without a settings UI to enter them through.
 */
export const createApplyNetworkConfigOverrides =
  (overrides: MidnightNetworkConfigOverrides): SideEffect =>
  (
    _,
    {
      midnightContext: {
        selectNetworksConfig$,
        selectNetworksConfigFeatureFlagsOverrides$,
      },
    },
    { actions },
  ) =>
    zip(
      selectNetworksConfig$.pipe(take(1)),
      selectNetworksConfigFeatureFlagsOverrides$.pipe(take(1)),
    ).pipe(
      mergeMap(([networksConfig, featureFlagsOverrides]) =>
        (
          Object.entries(overrides) as [
            MidnightSDKNetworkId,
            Partial<MidnightNetworkConfig>,
          ][]
        ).map(([networkId, override]) =>
          actions.midnightContext.setUserNetworkConfigOverride({
            networkId,
            config: { ...networksConfig[networkId], ...override },
            featureFlagsOverrides: featureFlagsOverrides[networkId],
          }),
        ),
      ),
    );
