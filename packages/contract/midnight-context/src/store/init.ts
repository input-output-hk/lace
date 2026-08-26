import { createMigrate } from 'redux-persist';

import { initializeSideEffects } from './side-effects';
import { initialState, midnightContextReducers } from './slice';

import type { MidnightSDKNetworkId } from '../const';
import type { MidnightContextSliceState } from './slice';
import type {
  LaceInit,
  LaceModuleStoreInit,
  PersistedState,
} from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = ({
  runtime: {
    config: { defaultMidnightTestnetNetworkId },
  },
}) => ({
  sideEffects: initializeSideEffects(),
  reducers: midnightContextReducers,
  preloadedState: {
    midnightContext: {
      ...initialState,
      defaultTestNetNetworkId: defaultMidnightTestnetNetworkId,
    },
  },
  persistConfig: {
    midnightContext: {
      version: 10,
      whitelist: [
        'userNetworksConfigOverrides',
        'isActivityPageHeaderBannerDismissed',
        'isPortfolioBannerDismissed',
        // Persist dustBalanceByAccount and dustGenerationDetailsByAccount to
        // show cached values immediately on app restart. While wallet.state()
        // does emit after DustWallet is restored (before sync starts),
        // persisting ensures the values are available before the wallet
        // observable chain is set up, improving perceived load time.
        'dustBalanceByAccount',
        'dustGenerationDetailsByAccount',
        'shouldAcknowledgeMidnightDisclaimer',
      ],
      migrate: createMigrate({
        3: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          // networkId is now derived from @lace-contract/network store (ADR-18)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          delete (typedState as any).networkId;
          return typedState;
        },
        4: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          // Migration 4 no longer needed; dustParameters removed in v5
          return typedState;
        },
        5: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          delete (typedState as any).dustParameters;
          return typedState;
        },
        6: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          typedState.shouldAcknowledgeMidnightDisclaimer = 'not-shown';
          return typedState;
        },
        7: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          delete (typedState as any).dustBalance;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          delete (typedState as any).dustGenerationDetails;
          typedState.dustBalanceByAccount = {};
          typedState.dustGenerationDetailsByAccount = {};
          return typedState;
        },
        8: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          // featureFlagsNetworksConfigOverrides is derived state recomputed from
          // feature flags on startup; persisting it caused stale values to be
          // visible before the side effect recomputed them.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          delete (typedState as any).featureFlagsNetworksConfigOverrides;
          return typedState;
        },
        9: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          typedState.publicKeysByAccount = {};
          return typedState;
        },
        10: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          // nodeAddress and indexerAddress are not user-settable — the Midnight
          // settings sheet only offers a proof-server choice. Any persisted value
          // was written by the (now removed) setFeatureFlagsNetworksConfigOverrides
          // side effect, which copied feature flag values into this user-override
          // slot. Left in place they permanently shadow later flag changes, and a
          // startup emission with no flags could clear them to `undefined`, falling
          // back to whatever the defaults happen to be after an upgrade.
          //
          // proofServerAddress is kept: it is a genuine user choice (local vs
          // remote) and cannot be distinguished from a flag-derived value.
          const overrides = typedState.userNetworksConfigOverrides;
          for (const networkId in overrides) {
            const networkOverrides =
              overrides[networkId as MidnightSDKNetworkId];
            if (!networkOverrides) continue;
            delete networkOverrides.nodeAddress;
            delete networkOverrides.indexerAddress;
          }
          return typedState;
        },
      }),
    },
  },
});

export default store;
