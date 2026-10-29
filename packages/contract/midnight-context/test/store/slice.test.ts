import { BigNumber, HexBytes } from '@lace-lib/util';
import { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
  FEATURE_FLAG_MIDNIGHT_NODE_URLS,
  FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
  FEATURE_FLAG_MIDNIGHT_TEE_TEMENOS_PROOF_SERVER,
  TEMENOS_PROOF_SERVER_MODES,
} from '../../src/const';
import { MidnightSDKNetworkIds } from '../../src/const';
import {
  initialState as sliceInitialState,
  midnightContextActions as actions,
  midnightContextReducers as reducers,
  midnightContextSelectors as selectors,
} from '../../src/store/slice';
import { accountId, networkId, walletId } from '../../src/stub-data';
import { MidnightAccountId, MidnightNetworkId } from '../../src/value-objects';

import type {
  DustGenerationDetails,
  MidnightAccountPublicKeys,
  MidnightContextSliceState,
} from '../../src';
import type { FeaturesSliceState } from '@lace-contract/feature';
import type { NetworkSliceState } from '@lace-contract/network';

// State for selectors that don't require network slice
type TestState = {
  midnightContext: MidnightContextSliceState;
};

// State for selectors that derive network from global network store
type WithNetworkTestState = TestState & {
  network: NetworkSliceState;
  features: FeaturesSliceState;
};

describe('midnight slice', () => {
  let initialState: MidnightContextSliceState;

  const testNetworkId = MidnightSDKNetworkIds.Preview;

  // Network store state with Midnight registered
  const networkState: NetworkSliceState = {
    networkType: 'testnet',
    initialNetworkType: 'testnet',
    blockchainNetworks: {
      Midnight: {
        mainnet: MidnightNetworkId('mainnet'),
        testnet: MidnightNetworkId('preview'),
      },
    },
    testnetOptions: {},
  };

  const emptyFeaturesState: FeaturesSliceState = {
    loaded: { modules: [], featureFlags: [] },
  };

  beforeEach(() => {
    initialState = {
      ...sliceInitialState,
      defaultTestNetNetworkId: NetworkId.NetworkId.Preview,
    };
  });

  describe('reducers', () => {
    describe('configuring Midnight network', () => {
      describe('setting user network overrides for specified network', () => {
        it('should set the user config overrides for the specified network', () => {
          const customProofServer = {
            kind: 'delegated' as const,
            url: 'https://newProofServerAddress',
            label: 'Custom',
          };
          const newConfig = {
            nodeAddress: 'newNodeAddress',
            indexerAddress: 'newIndexerAddress',
            proofServer: customProofServer,
          };

          const action = actions.midnightContext.setUserNetworkConfigOverride({
            networkId: testNetworkId,
            config: newConfig,
            featureFlagsOverrides: {},
          });
          const state = reducers.midnightContext(initialState, action);

          expect(state.userNetworksConfigOverrides[testNetworkId]).toEqual({
            nodeAddress: 'newNodeAddress',
            indexerAddress: 'newIndexerAddress',
            proofServer: customProofServer,
          });
        });

        it('should do nothing if networkId is not supported', () => {
          const newConfig = {
            nodeAddress: 'newNodeAddress',
            indexerAddress: 'newIndexerAddress',
            proofServer: {
              kind: 'delegated' as const,
              url: 'https://newProofServerAddress',
              label: 'Custom',
            },
          };

          const action = actions.midnightContext.setUserNetworkConfigOverride({
            networkId: NetworkId.NetworkId.MainNet,
            config: newConfig,
            featureFlagsOverrides: {},
          });
          const state = reducers.midnightContext(
            {
              ...initialState,
              supportedNetworksIds: [],
            },
            action,
          );

          expect(state.userNetworksConfigOverrides).toEqual(
            initialState.userNetworksConfigOverrides,
          );
        });

        it('should only set the user config overrides different from the defaults', () => {
          const defaultConfig =
            initialState.defaultNetworksConfig[testNetworkId];
          const newConfig = {
            ...defaultConfig,
            nodeAddress: 'newNodeAddress',
          };

          const action = actions.midnightContext.setUserNetworkConfigOverride({
            networkId: testNetworkId,
            config: newConfig,
            featureFlagsOverrides: {},
          });
          const state = reducers.midnightContext(initialState, action);
          expect(
            state.userNetworksConfigOverrides[testNetworkId],
          ).toStrictEqual({
            nodeAddress: newConfig.nodeAddress,
          });
        });

        it('should unset user override when user switches back to default', () => {
          const defaultConfig =
            initialState.defaultNetworksConfig[testNetworkId];
          const userOverrides = {
            nodeAddress: 'newNodeAddress',
            indexerAddress: 'newIndexerAddress',
          };
          const setUserOverrides =
            actions.midnightContext.setUserNetworkConfigOverride({
              networkId: testNetworkId,
              config: userOverrides,
              featureFlagsOverrides: {},
            });
          const switchBackToDefault =
            actions.midnightContext.setUserNetworkConfigOverride({
              networkId: testNetworkId,
              config: defaultConfig,
              featureFlagsOverrides: {},
            });
          const userOverridesState = reducers.midnightContext(
            initialState,
            setUserOverrides,
          );
          const switchedBackToDefaultsState = reducers.midnightContext(
            userOverridesState,
            switchBackToDefault,
          );
          expect(
            switchedBackToDefaultsState.userNetworksConfigOverrides[
              testNetworkId
            ],
          ).toStrictEqual({});
        });

        it('should consider feature flag overrides when computing base config', () => {
          const defaultConfig =
            initialState.defaultNetworksConfig[testNetworkId];
          const remoteMode = {
            kind: 'delegated' as const,
            url: 'https://remote.proof-server.example.com',
            label: 'Midnight',
          };
          const featureFlagsOverrides = {
            proofServer: remoteMode,
          };
          const newConfig = {
            ...defaultConfig,
            proofServer: remoteMode,
          };

          const action = actions.midnightContext.setUserNetworkConfigOverride({
            networkId: testNetworkId,
            config: newConfig,
            featureFlagsOverrides,
          });
          const state = reducers.midnightContext(initialState, action);
          // proofServer matches base (default + FF override), so no user override stored
          expect(
            state.userNetworksConfigOverrides[testNetworkId],
          ).toStrictEqual({});
        });
      });
    });

    describe('setDefaultProofServers', () => {
      const remoteMode = {
        kind: 'delegated' as const,
        url: 'https://prover.example',
        label: 'prover.example',
      };

      it('replaces only the default proof server of the listed networks', () => {
        const state = reducers.midnightContext(
          initialState,
          actions.midnightContext.setDefaultProofServers({
            [testNetworkId]: remoteMode,
          }),
        );

        expect(state.defaultNetworksConfig).toEqual({
          ...initialState.defaultNetworksConfig,
          [testNetworkId]: {
            ...initialState.defaultNetworksConfig[testNetworkId],
            proofServer: remoteMode,
          },
        });
        expect(state.userNetworksConfigOverrides).toBe(
          initialState.userNetworksConfigOverrides,
        );
      });

      it('makes the new default the base proof server, with a user override of an available mode still taking precedence', () => {
        const teeMode = TEMENOS_PROOF_SERVER_MODES[testNetworkId];
        if (!teeMode) throw new Error('No Temenos mode on Preview');
        const withDefault = reducers.midnightContext(
          initialState,
          actions.midnightContext.setDefaultProofServers({
            [testNetworkId]: remoteMode,
          }),
        );
        const features = {
          loaded: {
            modules: [],
            featureFlags: [
              { key: FEATURE_FLAG_MIDNIGHT_TEE_TEMENOS_PROOF_SERVER },
            ],
          },
        };
        const defaultOnly: WithNetworkTestState = {
          midnightContext: withDefault,
          network: networkState,
          features,
        };
        expect(
          selectors.midnightContext.selectNetworksConfig(defaultOnly)[
            testNetworkId
          ].proofServer,
        ).toEqual(remoteMode);
        expect(
          selectors.midnightContext.selectAllProofServerModes(defaultOnly)[
            testNetworkId
          ],
        ).toEqual([remoteMode, teeMode]);

        const userSelected: WithNetworkTestState = {
          ...defaultOnly,
          midnightContext: reducers.midnightContext(
            withDefault,
            actions.midnightContext.setUserNetworkConfigOverride({
              networkId: testNetworkId,
              config: {
                ...withDefault.defaultNetworksConfig[testNetworkId],
                proofServer: teeMode,
              },
              featureFlagsOverrides: {},
            }),
          ),
        };
        expect(
          selectors.midnightContext.selectNetworksConfig(userSelected)[
            testNetworkId
          ].proofServer,
        ).toEqual(teeMode);
      });

      it('does not honour a user override of the replaced default, which is no longer an available mode', () => {
        const withDefault = reducers.midnightContext(
          initialState,
          actions.midnightContext.setDefaultProofServers({
            [testNetworkId]: remoteMode,
          }),
        );
        const state: WithNetworkTestState = {
          midnightContext: {
            ...withDefault,
            userNetworksConfigOverrides: {
              ...withDefault.userNetworksConfigOverrides,
              [testNetworkId]: {
                proofServer:
                  initialState.defaultNetworksConfig[testNetworkId].proofServer,
              },
            },
          },
          network: networkState,
          features: emptyFeaturesState,
        };

        expect(
          selectors.midnightContext.selectNetworksConfig(state)[testNetworkId]
            .proofServer,
        ).toEqual(remoteMode);
      });
    });

    describe('dismissActivityPageHeaderBanner', () => {
      it('should dismiss activity page header banner', () => {
        const action =
          actions.midnightContext.dismissActivityPageHeaderBanner();
        const state = reducers.midnightContext(initialState, action);

        expect(
          selectors.midnightContext.selectIsActivityPageHeaderBannerDismissed({
            midnightContext: state,
          }),
        ).toBe(true);
      });
    });

    describe('dismissPortfolioBanner', () => {
      it('should dismiss portfolio page banner', () => {
        const action = actions.midnightContext.dismissPortfolioBanner();
        const state = reducers.midnightContext(initialState, action);

        expect(
          selectors.midnightContext.selectIsPortfolioBannerDismissed({
            midnightContext: state,
          }),
        ).toBe(true);
      });
    });

    describe('setDustBalance', () => {
      it('should set dust balance and its spendable subset for a given account', () => {
        const dustBalance = BigNumber(100n);
        const dustAvailable = BigNumber(40n);
        const action = actions.midnightContext.setDustBalance({
          accountId,
          dustBalance,
          dustAvailable,
        });
        const state = reducers.midnightContext(initialState, action);

        expect(state.dustBalanceByAccount[accountId]).toEqual(dustBalance);
        expect(state.dustAvailableByAccount[accountId]).toEqual(dustAvailable);
      });

      it('should update existing dust balance for a given account', () => {
        const stateWithBalance: MidnightContextSliceState = {
          ...initialState,
          dustBalanceByAccount: { [accountId]: BigNumber(100n) },
          dustAvailableByAccount: { [accountId]: BigNumber(100n) },
        };
        const updatedBalance = BigNumber(200n);
        const action = actions.midnightContext.setDustBalance({
          accountId,
          dustBalance: updatedBalance,
          dustAvailable: BigNumber(0n),
        });
        const state = reducers.midnightContext(stateWithBalance, action);

        expect(state.dustBalanceByAccount[accountId]).toEqual(updatedBalance);
        expect(state.dustAvailableByAccount[accountId]).toEqual(BigNumber(0n));
      });

      it('should not affect dust balance of other accounts', () => {
        const anotherAccountId = MidnightAccountId(walletId, 1, networkId);
        const existingBalance = BigNumber(50n);
        const stateWithOtherAccount: MidnightContextSliceState = {
          ...initialState,
          dustBalanceByAccount: { [anotherAccountId]: existingBalance },
          dustAvailableByAccount: { [anotherAccountId]: existingBalance },
        };
        const action = actions.midnightContext.setDustBalance({
          accountId,
          dustBalance: BigNumber(100n),
          dustAvailable: BigNumber(100n),
        });
        const state = reducers.midnightContext(stateWithOtherAccount, action);

        expect(state.dustBalanceByAccount[anotherAccountId]).toEqual(
          existingBalance,
        );
        expect(state.dustAvailableByAccount[anotherAccountId]).toEqual(
          existingBalance,
        );
      });
    });

    describe('setDustGenerationDetails', () => {
      const dustGenerationDetails: DustGenerationDetails = {
        currentValue: 100n,
        maxCap: 1000n,
        decayTime: undefined,
        maxCapReachedAt: undefined,
        rate: 10n,
      };

      it('should set dust generation details for a given account', () => {
        const action = actions.midnightContext.setDustGenerationDetails({
          accountId,
          dustGenerationDetails,
        });
        const state = reducers.midnightContext(initialState, action);

        const result = selectors.midnightContext.selectDustGenerationDetails(
          { midnightContext: state },
          [accountId],
        );

        expect(result[accountId]).toEqual(dustGenerationDetails);
      });

      it('should delete dust generation details when undefined is passed', () => {
        const setAction = actions.midnightContext.setDustGenerationDetails({
          accountId,
          dustGenerationDetails,
        });
        const stateWithDetails = reducers.midnightContext(
          initialState,
          setAction,
        );

        const deleteAction = actions.midnightContext.setDustGenerationDetails({
          accountId,
          dustGenerationDetails: undefined,
        });
        const state = reducers.midnightContext(stateWithDetails, deleteAction);

        expect(state.dustGenerationDetailsByAccount[accountId]).toBeUndefined();
      });

      it('should update existing dust generation details', () => {
        const setAction = actions.midnightContext.setDustGenerationDetails({
          accountId,
          dustGenerationDetails,
        });
        const stateWithDetails = reducers.midnightContext(
          initialState,
          setAction,
        );
        const updatedDetails: DustGenerationDetails = {
          ...dustGenerationDetails,
          currentValue: 200n,
        };

        const updateAction = actions.midnightContext.setDustGenerationDetails({
          accountId,
          dustGenerationDetails: updatedDetails,
        });
        const state = reducers.midnightContext(stateWithDetails, updateAction);

        const result = selectors.midnightContext.selectDustGenerationDetails(
          { midnightContext: state },
          [accountId],
        );

        expect(result[accountId]).toEqual(updatedDetails);
      });

      it('should not affect dust generation details of other accounts', () => {
        const anotherAccountId = MidnightAccountId(walletId, 1, networkId);
        const setupAction = actions.midnightContext.setDustGenerationDetails({
          accountId: anotherAccountId,
          dustGenerationDetails,
        });
        const stateWithOtherAccount = reducers.midnightContext(
          initialState,
          setupAction,
        );

        const action = actions.midnightContext.setDustGenerationDetails({
          accountId,
          dustGenerationDetails,
        });
        const state = reducers.midnightContext(stateWithOtherAccount, action);

        const result = selectors.midnightContext.selectDustGenerationDetails(
          { midnightContext: state },
          [anotherAccountId],
        );

        expect(result[anotherAccountId]).toEqual(dustGenerationDetails);
      });
    });

    describe('resetAccountDust', () => {
      const dustGenerationDetails: DustGenerationDetails = {
        currentValue: 100n,
        maxCap: 1000n,
        decayTime: undefined,
        maxCapReachedAt: undefined,
        rate: 10n,
      };

      it('clears both dust balance and generation details for the account', () => {
        const stateWithDust = reducers.midnightContext(
          {
            ...initialState,
            dustBalanceByAccount: { [accountId]: BigNumber(100n) },
            dustAvailableByAccount: { [accountId]: BigNumber(40n) },
          },
          actions.midnightContext.setDustGenerationDetails({
            accountId,
            dustGenerationDetails,
          }),
        );

        const next = reducers.midnightContext(
          stateWithDust,
          actions.midnightContext.resetAccountDust({ accountId }),
        );

        expect(next.dustBalanceByAccount[accountId]).toBeUndefined();
        expect(next.dustAvailableByAccount[accountId]).toBeUndefined();
        expect(next.dustGenerationDetailsByAccount[accountId]).toBeUndefined();
      });

      it('does not affect other accounts', () => {
        const otherAccountId = MidnightAccountId(walletId, 1, networkId);
        const seeded = reducers.midnightContext(
          {
            ...initialState,
            dustBalanceByAccount: {
              [accountId]: BigNumber(100n),
              [otherAccountId]: BigNumber(50n),
            },
          },
          actions.midnightContext.setDustGenerationDetails({
            accountId: otherAccountId,
            dustGenerationDetails,
          }),
        );

        const next = reducers.midnightContext(
          seeded,
          actions.midnightContext.resetAccountDust({ accountId }),
        );

        expect(next.dustBalanceByAccount[accountId]).toBeUndefined();
        expect(next.dustBalanceByAccount[otherAccountId]).toEqual(
          BigNumber(50n),
        );
        const otherDetails =
          selectors.midnightContext.selectDustGenerationDetails(
            { midnightContext: next },
            [otherAccountId],
          );
        expect(otherDetails[otherAccountId]).toEqual(dustGenerationDetails);
      });

      it('is a no-op when the account has no dust', () => {
        const next = reducers.midnightContext(
          initialState,
          actions.midnightContext.resetAccountDust({ accountId }),
        );

        expect(next.dustBalanceByAccount[accountId]).toBeUndefined();
        expect(next.dustGenerationDetailsByAccount[accountId]).toBeUndefined();
      });
    });

    describe('setPublicKeys', () => {
      const publicKeys: MidnightAccountPublicKeys = {
        coin: HexBytes('deadbeef'),
        encryption: HexBytes('cafebabe'),
      };

      it('should set public keys for a given account', () => {
        const action = actions.midnightContext.setPublicKeys({
          accountId,
          publicKeys,
        });
        const state = reducers.midnightContext(initialState, action);

        expect(state.publicKeysByAccount[accountId]).toEqual(publicKeys);
      });

      it('should update existing public keys for a given account', () => {
        const stateWithKeys: MidnightContextSliceState = {
          ...initialState,
          publicKeysByAccount: {
            [accountId]: {
              coin: HexBytes('aabbccdd'),
              encryption: HexBytes('11223344'),
            },
          },
        };
        const action = actions.midnightContext.setPublicKeys({
          accountId,
          publicKeys,
        });
        const state = reducers.midnightContext(stateWithKeys, action);

        expect(state.publicKeysByAccount[accountId]).toEqual(publicKeys);
      });

      it('should not affect public keys of other accounts', () => {
        const anotherAccountId = MidnightAccountId(walletId, 1, networkId);
        const otherKeys: MidnightAccountPublicKeys = {
          coin: HexBytes('11111111'),
          encryption: HexBytes('22222222'),
        };
        const stateWithOtherAccount: MidnightContextSliceState = {
          ...initialState,
          publicKeysByAccount: { [anotherAccountId]: otherKeys },
        };
        const action = actions.midnightContext.setPublicKeys({
          accountId,
          publicKeys,
        });
        const state = reducers.midnightContext(stateWithOtherAccount, action);

        expect(state.publicKeysByAccount[anotherAccountId]).toEqual(otherKeys);
      });
    });
  });

  describe('proof-server disclosure acknowledgement', () => {
    it('treats older persisted state as unacknowledged and records custom and delegated endpoint/version keys', () => {
      const oldState = {
        ...initialState,
        proofServerDisclosureAcknowledgements: undefined,
      };
      expect(
        selectors.midnightContext.selectProofServerDisclosureAcknowledgements({
          midnightContext: oldState,
        }),
      ).toBeUndefined();
      const local = reducers.midnightContext(
        oldState,
        actions.midnightContext.acknowledgeProofServerDisclosure({
          kind: 'local-host',
          url: 'http://localhost:6300',
        }),
      );
      expect(local.proofServerDisclosureAcknowledgements).toEqual({
        'v1:local-host:http://localhost:6300': true,
      });
      const wasm = reducers.midnightContext(
        oldState,
        actions.midnightContext.acknowledgeProofServerDisclosure({
          kind: 'in-process',
        }),
      );
      expect(wasm.proofServerDisclosureAcknowledgements).toBeUndefined();
      const remote = TEMENOS_PROOF_SERVER_MODES['preprod']!;
      const acknowledged = reducers.midnightContext(
        oldState,
        actions.midnightContext.acknowledgeProofServerDisclosure(remote),
      );
      expect(acknowledged.proofServerDisclosureAcknowledgements).toEqual({
        [`v1:${remote.kind}:${remote.url}`]: true,
      });
      expect(acknowledged.userNetworksConfigOverrides).toEqual(
        oldState.userNetworksConfigOverrides,
      );
    });
  });

  describe('selectors', () => {
    it('should select the default networks config', () => {
      const state: TestState = {
        midnightContext: initialState,
      };
      const networkConfig =
        selectors.midnightContext.selectNetworksDefaultConfig(state);

      expect(networkConfig).toEqual(initialState.defaultNetworksConfig);
    });

    it('should select the network config user override', () => {
      const state: TestState = {
        midnightContext: initialState,
      };
      const networkConfig =
        selectors.midnightContext.selectNetworksConfigUserOverrides(state);

      expect(networkConfig).toEqual(initialState.userNetworksConfigOverrides);
    });

    describe('selectNetworkId', () => {
      it('should derive network ID from global network store', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: emptyFeaturesState,
        };
        const networkId = selectors.midnightContext.selectNetworkId(state);

        expect(networkId).toEqual(testNetworkId);
      });

      it('should return mainnet when networkType is mainnet', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: {
            ...networkState,
            networkType: 'mainnet',
          },
          features: emptyFeaturesState,
        };
        const networkId = selectors.midnightContext.selectNetworkId(state);

        expect(networkId).toEqual(NetworkId.NetworkId.MainNet);
      });

      it('should fallback to default testnet when Midnight not registered', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: {
            networkType: 'testnet',
            initialNetworkType: 'testnet',
            blockchainNetworks: {},
            testnetOptions: {},
          },
          features: emptyFeaturesState,
        };
        const networkId = selectors.midnightContext.selectNetworkId(state);

        // Falls back to defaultTestNetNetworkId from midnightContext
        expect(networkId).toEqual(initialState.defaultTestNetNetworkId);
      });
    });

    describe('selectNetworksConfigFeatureFlagsOverrides', () => {
      it('should return empty overrides when no feature flags are loaded', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: emptyFeaturesState,
        };
        const overrides =
          selectors.midnightContext.selectNetworksConfigFeatureFlagsOverrides(
            state,
          );

        for (const networkId of initialState.supportedNetworksIds) {
          expect(overrides[networkId]).toEqual({});
        }
      });

      it.each([
        undefined,
        { preview: [{ url: 'https://untrusted.example', label: 'Injected' }] },
        'https://untrusted.example',
      ])(
        'cannot restore the retired remote provider through payload %j',
        payload => {
          const state: WithNetworkTestState = {
            midnightContext: initialState,
            network: networkState,
            features: {
              loaded: {
                modules: [],
                featureFlags: [
                  { key: FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER, payload },
                ],
              },
            },
          };
          expect(
            selectors.midnightContext.selectNetworksConfigFeatureFlagsOverrides(
              state,
            )[testNetworkId],
          ).toEqual({});
          expect(
            selectors.midnightContext.selectRemoteProofServerOptions(state)[
              testNetworkId
            ],
          ).toBeUndefined();
          expect(
            selectors.midnightContext.selectAllProofServerModes(state)[
              testNetworkId
            ],
          ).toEqual([{ kind: 'local-host', url: 'http://localhost:6300' }]);
        },
      );

      it('offers WASM only with runtime support and restores the single saved selection', () => {
        const state: WithNetworkTestState = {
          midnightContext: {
            ...initialState,
            supportsWasmProver: true,
            userNetworksConfigOverrides: {
              ...initialState.userNetworksConfigOverrides,
              [testNetworkId]: { proofServer: { kind: 'in-process' } },
            },
          },
          network: networkState,
          features: emptyFeaturesState,
        };
        const modes =
          selectors.midnightContext.selectAllProofServerModes(state);
        expect(modes[testNetworkId]).toEqual([
          { kind: 'in-process' },
          { kind: 'local-host', url: 'http://localhost:6300' },
        ]);
        expect(selectors.midnightContext.selectAllProofServerModes(state)).toBe(
          modes,
        );
        expect(
          selectors.midnightContext.selectNetworksConfig(state)[testNetworkId]
            .proofServer,
        ).toEqual({ kind: 'in-process' });
        expect(
          selectors.midnightContext.selectUnavailableProofServerNetworks(state),
        ).toEqual([]);

        const unsupportedState = {
          ...state,
          midnightContext: {
            ...state.midnightContext,
            supportsWasmProver: false,
          },
        };
        expect(
          selectors.midnightContext.selectNetworksConfig(unsupportedState)[
            testNetworkId
          ].proofServer,
        ).toEqual({ kind: 'local-host', url: 'http://localhost:6300' });
        expect(
          selectors.midnightContext.selectUnavailableProofServerNetworks(
            unsupportedState,
          ),
        ).toEqual([testNetworkId]);
      });

      it('selectAllProofServerModes appends the baked Temenos mode on networks with an entry when its flag is enabled', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: {
            loaded: {
              modules: [],
              featureFlags: [
                { key: FEATURE_FLAG_MIDNIGHT_TEE_TEMENOS_PROOF_SERVER },
              ],
            },
          },
        };
        const modes =
          selectors.midnightContext.selectAllProofServerModes(state);

        for (const networkId of [
          MidnightSDKNetworkIds.MainNet,
          MidnightSDKNetworkIds.PreProd,
          MidnightSDKNetworkIds.Preview,
        ] as const) {
          expect(modes[networkId]).toEqual([
            { kind: 'local-host', url: 'http://localhost:6300' },
            TEMENOS_PROOF_SERVER_MODES[networkId],
          ]);
        }
        const persistedMainnet: WithNetworkTestState = {
          ...state,
          midnightContext: {
            ...initialState,
            userNetworksConfigOverrides: {
              ...initialState.userNetworksConfigOverrides,
              mainnet: { proofServer: TEMENOS_PROOF_SERVER_MODES.preprod },
            },
          },
        };
        expect(
          selectors.midnightContext.selectNetworksConfig(persistedMainnet)
            .mainnet.proofServer.kind,
        ).toBe('local-host');
        expect(
          selectors.midnightContext.selectUnavailableProofServerNetworks(
            persistedMainnet,
          ),
        ).toContain('mainnet');
        // No baked entry for this network — flag alone must not surface one.
        expect(modes[MidnightSDKNetworkIds.QaNet]).toEqual([
          { kind: 'local-host', url: 'http://localhost:6300' },
        ]);
      });

      it('selectAllProofServerModes omits the Temenos mode when its flag is absent', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: { loaded: { modules: [], featureFlags: [] } },
        };
        const modes =
          selectors.midnightContext.selectAllProofServerModes(state);

        expect(modes[MidnightSDKNetworkIds.PreProd]).toEqual([
          { kind: 'local-host', url: 'http://localhost:6300' },
        ]);
      });

      it.each([MidnightSDKNetworkIds.PreProd, MidnightSDKNetworkIds.Preview])(
        'migrates a persisted Foundation choice on %s even with both flags enabled',
        networkId => {
          const state: WithNetworkTestState = {
            midnightContext: {
              ...initialState,
              userNetworksConfigOverrides: {
                ...initialState.userNetworksConfigOverrides,
                [networkId]: {
                  proofServer: {
                    kind: 'delegated',
                    url: `https://proof-server.${networkId}.midnight.network`,
                    label: 'Midnight Foundation',
                  },
                  nodeAddress: 'https://custom-node.example',
                },
              },
            },
            network: networkState,
            features: {
              loaded: {
                modules: [],
                featureFlags: [
                  { key: FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER },
                  { key: FEATURE_FLAG_MIDNIGHT_TEE_TEMENOS_PROOF_SERVER },
                ],
              },
            },
          };
          expect(
            selectors.midnightContext.selectAllProofServerModes(state)[
              networkId
            ],
          ).toEqual([
            { kind: 'local-host', url: 'http://localhost:6300' },
            TEMENOS_PROOF_SERVER_MODES[networkId],
          ]);
          expect(
            selectors.midnightContext.selectNetworksConfig(state)[networkId],
          ).toMatchObject({
            proofServer: { kind: 'local-host', url: 'http://localhost:6300' },
            nodeAddress: 'https://custom-node.example',
          });
          expect(
            selectors.midnightContext.selectUnavailableProofServerNetworks(
              state,
            ),
          ).toEqual([networkId]);
        },
      );

      describe('Temenos kill switch', () => {
        const preprod = MidnightSDKNetworkIds.PreProd;
        // Built per test: `initialState` is assigned in a beforeEach above.
        const withTeeSelected = (): MidnightContextSliceState => ({
          ...initialState,
          userNetworksConfigOverrides: {
            ...initialState.userNetworksConfigOverrides,
            [preprod]: { proofServer: TEMENOS_PROOF_SERVER_MODES[preprod] },
          },
        });
        const teeFlagOn = {
          loaded: {
            modules: [],
            featureFlags: [
              { key: FEATURE_FLAG_MIDNIGHT_TEE_TEMENOS_PROOF_SERVER },
            ],
          },
        };
        const teeFlagOff = { loaded: { modules: [], featureFlags: [] } };

        it('selectIsTemenosProofServerEnabled reflects the flag', () => {
          const on: WithNetworkTestState = {
            midnightContext: initialState,
            network: networkState,
            features: teeFlagOn,
          };
          const off: WithNetworkTestState = { ...on, features: teeFlagOff };
          expect(
            selectors.midnightContext.selectIsTemenosProofServerEnabled(on),
          ).toBe(true);
          expect(
            selectors.midnightContext.selectIsTemenosProofServerEnabled(off),
          ).toBe(false);
        });

        it('honours a persisted tee-delegated selection while the flag is on', () => {
          const state: WithNetworkTestState = {
            midnightContext: withTeeSelected(),
            network: networkState,
            features: teeFlagOn,
          };
          const config = selectors.midnightContext.selectNetworksConfig(state);
          expect(config[preprod].proofServer).toEqual(
            TEMENOS_PROOF_SERVER_MODES[preprod],
          );
        });

        it('falls back to the base proof server when the flag is off, leaving other overrides intact', () => {
          const selected = withTeeSelected();
          const state: WithNetworkTestState = {
            midnightContext: {
              ...selected,
              userNetworksConfigOverrides: {
                ...selected.userNetworksConfigOverrides,
                [preprod]: {
                  proofServer: TEMENOS_PROOF_SERVER_MODES[preprod],
                  nodeAddress: 'https://node.example',
                },
              },
            },
            network: networkState,
            features: teeFlagOff,
          };
          const config = selectors.midnightContext.selectNetworksConfig(state);
          expect(config[preprod].proofServer).toEqual(
            initialState.defaultNetworksConfig[preprod].proofServer,
          );
          expect(config[preprod].nodeAddress).toBe('https://node.example');
        });

        it('rejects an unknown persisted remote URL when the flag is off', () => {
          const delegated = {
            kind: 'delegated' as const,
            url: 'https://proof.example',
            label: 'Provider',
          };
          const state: WithNetworkTestState = {
            midnightContext: {
              ...initialState,
              userNetworksConfigOverrides: {
                ...initialState.userNetworksConfigOverrides,
                [preprod]: { proofServer: delegated },
              },
            },
            network: networkState,
            features: teeFlagOff,
          };
          const config = selectors.midnightContext.selectNetworksConfig(state);
          expect(config[preprod].proofServer).toEqual(
            initialState.defaultNetworksConfig[preprod].proofServer,
          );
          expect(
            selectors.midnightContext.selectUnavailableProofServerNetworks(
              state,
            ),
          ).toEqual([preprod]);
        });
      });

      it('should derive indexer override from feature flags', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: {
            loaded: {
              modules: [],
              featureFlags: [
                {
                  key: FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
                  payload: {
                    [testNetworkId]: 'https://indexer.example.com',
                  },
                },
              ],
            },
          },
        };
        const overrides =
          selectors.midnightContext.selectNetworksConfigFeatureFlagsOverrides(
            state,
          );

        expect(overrides[testNetworkId]).toEqual({
          indexerAddress: 'https://indexer.example.com',
        });
      });

      it('should derive node override from feature flags', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: {
            loaded: {
              modules: [],
              featureFlags: [
                {
                  key: FEATURE_FLAG_MIDNIGHT_NODE_URLS,
                  payload: {
                    [testNetworkId]: 'https://rpc.example.com',
                  },
                },
              ],
            },
          },
        };
        const overrides =
          selectors.midnightContext.selectNetworksConfigFeatureFlagsOverrides(
            state,
          );

        expect(overrides[testNetworkId]).toEqual({
          nodeAddress: 'https://rpc.example.com',
        });
      });

      it('should derive all three overrides from feature flags', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: {
            loaded: {
              modules: [],
              featureFlags: [
                {
                  key: FEATURE_FLAG_MIDNIGHT_NODE_URLS,
                  payload: {
                    [testNetworkId]: 'https://rpc.example.com',
                  },
                },
                {
                  key: FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
                  payload: {
                    [testNetworkId]: 'https://indexer.example.com',
                  },
                },
                {
                  key: FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
                  payload: {
                    [testNetworkId]: [
                      {
                        url: 'https://remote-proof-server.example.com',
                        label: 'Midnight',
                      },
                    ],
                  },
                },
              ],
            },
          },
        };
        const overrides =
          selectors.midnightContext.selectNetworksConfigFeatureFlagsOverrides(
            state,
          );

        expect(overrides[testNetworkId]).toEqual({
          nodeAddress: 'https://rpc.example.com',
          indexerAddress: 'https://indexer.example.com',
        });
      });

      it('derives indexer overrides without reviving retired proof servers', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: {
            loaded: {
              modules: [],
              featureFlags: [
                {
                  key: FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
                  payload: {
                    [testNetworkId]: [
                      {
                        url: 'https://remote-proof-server.example.com',
                        label: 'Midnight',
                      },
                    ],
                  },
                },
                {
                  key: FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
                  payload: {
                    [testNetworkId]: 'https://indexer.example.com',
                  },
                },
              ],
            },
          },
        };
        const overrides =
          selectors.midnightContext.selectNetworksConfigFeatureFlagsOverrides(
            state,
          );

        expect(overrides[testNetworkId]).toEqual({
          indexerAddress: 'https://indexer.example.com',
        });
      });
    });

    describe('selectCurrentNetwork', () => {
      it('should return active network defaults if no feature flag or user overrides', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: emptyFeaturesState,
        };
        const { config, networkId } =
          selectors.midnightContext.selectCurrentNetwork(state);

        expect(networkId).toEqual(testNetworkId);
        expect(config).toEqual(
          initialState.defaultNetworksConfig[testNetworkId],
        );
      });

      it('keeps the local default when the legacy remote flag is present', () => {
        const state: WithNetworkTestState = {
          midnightContext: initialState,
          network: networkState,
          features: {
            loaded: {
              modules: [],
              featureFlags: [
                {
                  key: FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
                  payload: {
                    [testNetworkId]: [
                      {
                        url: 'https://newProofServerAddress',
                        label: 'Midnight',
                      },
                    ],
                  },
                },
              ],
            },
          },
        };
        const { config } =
          selectors.midnightContext.selectCurrentNetwork(state);

        expect(config).toEqual({
          ...initialState.defaultNetworksConfig[testNetworkId],
        });
      });

      it('should allow user overrides to trump default and feature flags', () => {
        const userProofServer = {
          kind: 'local-host' as const,
          url: 'http://localhost:6300',
        };
        const state: WithNetworkTestState = {
          midnightContext: {
            ...initialState,
            userNetworksConfigOverrides: {
              ...initialState.userNetworksConfigOverrides,
              [testNetworkId]: {
                proofServer: userProofServer,
              },
            },
          },
          network: networkState,
          features: {
            loaded: {
              modules: [],
              featureFlags: [
                {
                  key: FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
                  payload: {
                    [testNetworkId]: [
                      {
                        url: 'https://newProofServerAddress',
                        label: 'Midnight',
                      },
                    ],
                  },
                },
              ],
            },
          },
        };
        const { config } =
          selectors.midnightContext.selectCurrentNetwork(state);

        expect(config).toEqual({
          ...initialState.defaultNetworksConfig[testNetworkId],
          proofServer: userProofServer,
        });
      });
    });

    describe('selectPublicKeysByAccountId', () => {
      const publicKeys: MidnightAccountPublicKeys = {
        coin: HexBytes('deadbeef'),
        encryption: HexBytes('cafebabe'),
      };

      it('should return public keys for a given account', () => {
        const state: TestState = {
          midnightContext: {
            ...initialState,
            publicKeysByAccount: { [accountId]: publicKeys },
          },
        };

        const result = selectors.midnightContext.selectPublicKeysByAccountId(
          state,
          accountId,
        );

        expect(result).toEqual(publicKeys);
      });

      it('should return undefined when account has no public keys', () => {
        const state: TestState = { midnightContext: initialState };

        const result = selectors.midnightContext.selectPublicKeysByAccountId(
          state,
          accountId,
        );

        expect(result).toBeUndefined();
      });

      it('should not return keys of a different account', () => {
        const anotherAccountId = MidnightAccountId(walletId, 1, networkId);
        const state: TestState = {
          midnightContext: {
            ...initialState,
            publicKeysByAccount: { [anotherAccountId]: publicKeys },
          },
        };

        const result = selectors.midnightContext.selectPublicKeysByAccountId(
          state,
          accountId,
        );

        expect(result).toBeUndefined();
      });
    });

    describe('selectDustBalanceByAccount', () => {
      it('should select the dust balance', () => {
        const dustBalanceByAccount = {
          [accountId]: BigNumber(123n),
        };
        const state: TestState = {
          midnightContext: {
            ...initialState,
            dustBalanceByAccount,
          },
        };

        const result =
          selectors.midnightContext.selectDustBalanceByAccount(state);

        expect(result).toEqual(dustBalanceByAccount);
      });
    });

    describe('selectDustAvailableByAccount', () => {
      it('should select the spendable dust, not the total balance', () => {
        const dustAvailableByAccount = {
          [accountId]: BigNumber(56n),
        };
        const state: TestState = {
          midnightContext: {
            ...initialState,
            dustBalanceByAccount: { [accountId]: BigNumber(456n) },
            dustAvailableByAccount,
          },
        };

        const result =
          selectors.midnightContext.selectDustAvailableByAccount(state);

        expect(result).toEqual(dustAvailableByAccount);
      });
    });
  });
});
