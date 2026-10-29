import { createMigrate } from 'redux-persist';

import { TEMENOS_PROOF_SERVER_MODES } from '../const';

import { initializeSideEffects } from './side-effects';
import { initialState, midnightContextReducers } from './slice';

import type { MidnightSDKNetworkId } from '../const';
import type { MidnightContextSliceState } from './slice';
import type {
  LaceInit,
  LaceModuleStoreInit,
  PersistedState,
} from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async props => ({
  sideEffects: initializeSideEffects(),
  reducers: midnightContextReducers,
  preloadedState: {
    midnightContext: {
      ...initialState,
      supportsWasmProver: props.runtime.app === 'lace-extension',
      defaultTestNetNetworkId:
        props.runtime.config.defaultMidnightTestnetNetworkId,
    },
  },
  persistConfig: {
    midnightContext: {
      version: 14,
      whitelist: [
        'userNetworksConfigOverrides',
        'proofServerDisclosureAcknowledgements',
        'isActivityPageHeaderBannerDismissed',
        'isPortfolioBannerDismissed',
        // Persist dustBalanceByAccount and dustGenerationDetailsByAccount to
        // show cached values immediately on app restart. While wallet.state()
        // does emit after DustWallet is restored (before sync starts),
        // persisting ensures the values are available before the wallet
        // observable chain is set up, improving perceived load time.
        'dustBalanceByAccount',
        'dustGenerationDetailsByAccount',
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
          // Migration 6 no longer needed; shouldAcknowledgeMidnightDisclaimer
          // removed when the Midnight disclaimer was deleted (see migration 11).
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
        11: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          // shouldAcknowledgeMidnightDisclaimer removed with the Midnight disclaimer.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          delete (typedState as any).shouldAcknowledgeMidnightDisclaimer;
          return typedState;
        },
        12: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          // The Shielded remote proof servers are being switched off, so the
          // only remaining option is the local default. A profile that selected
          // a remote one holds it as a user override, which would otherwise
          // survive as an address nothing answers on. Dropping the override
          // falls back to the default; a later provider is a fresh choice.
          const userOverrides = typedState.userNetworksConfigOverrides;
          if (userOverrides) {
            for (const networkId in userOverrides) {
              const override =
                userOverrides[networkId as keyof typeof userOverrides];
              if (override)
                delete (override as { proofServerAddress?: string })
                  .proofServerAddress;
            }
          }
          return typedState;
        },
        13: state => {
          // v12 deliberately retired legacy URL overrides. Do not turn a
          // residual URL into a new delegated provider. Pre-release v12
          // profiles may already have a proofServer selection; preserve it
          // and let provider availability checks resolve it as usual.
          const typedState = state as PersistedState<MidnightContextSliceState>;
          for (const override of Object.values(
            typedState.userNetworksConfigOverrides ?? {},
          )) {
            if (override)
              delete (override as { proofServerAddress?: string })
                .proofServerAddress;
          }
          return typedState;
        },
        14: state => {
          const typedState = state as PersistedState<MidnightContextSliceState>;
          for (const networkId of ['mainnet', 'preview'] as const) {
            const override =
              typedState.userNetworksConfigOverrides?.[networkId];
            const previousMode = override?.proofServer;
            const mode = TEMENOS_PROOF_SERVER_MODES[networkId];
            if (
              override &&
              mode &&
              previousMode?.kind === 'tee-delegated' &&
              previousMode.url === 'https://api.proofserver.wastedp.io'
            ) {
              override.proofServer = { ...mode };
            }
          }
          return typedState;
        },
      }),
    },
  },
});

export default store;
