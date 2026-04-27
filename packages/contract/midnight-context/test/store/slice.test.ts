import { BigNumber, HexBytes } from '@lace-sdk/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
  FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
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
          const newConfig = {
            nodeAddress: 'newNodeAddress',
            indexerAddress: 'newIndexerAddress',
            proofServerAddress: 'newProofServerAddress',
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
            proofServerAddress: 'newProofServerAddress',
          });
        });

        it('should do nothing if networkId is not supported', () => {
          const newConfig = {
            nodeAddress: 'newNodeAddress',
            indexerAddress: 'newIndexerAddress',
            proofServerAddress: 'newProofServerAddress',
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
          const featureFlagsOverrides = {
            proofServerAddress: 'remoteProofServer',
          };
          const newConfig = {
            ...defaultConfig,
            proofServerAddress: 'remoteProofServer',
          };

          const action = actions.midnightContext.setUserNetworkConfigOverride({
            networkId: testNetworkId,
            config: newConfig,
            featureFlagsOverrides,
          });
          const state = reducers.midnightContext(initialState, action);
          // proofServerAddress matches base (default + FF override), so no user override stored
          expect(
            state.userNetworksConfigOverrides[testNetworkId],
          ).toStrictEqual({});
        });
      });
    });

    describe('setNetworkTermsAndConditions', () => {
      it('should store fetched terms and conditions', () => {
        const termsAndConditions = {
          url: 'https://midnight.network/terms',
          hash: 'abc123',
        };
        const action =
          actions.midnightContext.setNetworkTermsAndConditions(
            termsAndConditions,
          );
        const state = reducers.midnightContext(initialState, action);

        expect(state.networkTermsAndConditions).toEqual(termsAndConditions);
      });

      it('should clear terms and conditions when set to undefined', () => {
        const stateWithTerms = reducers.midnightContext(
          initialState,
          actions.midnightContext.setNetworkTermsAndConditions({
            url: 'https://midnight.network/terms',
            hash: 'abc123',
          }),
        );

        const action =
          actions.midnightContext.setNetworkTermsAndConditions(undefined);
        const state = reducers.midnightContext(stateWithTerms, action);

        expect(state.networkTermsAndConditions).toBeUndefined();
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
      it('should set dust balance for a given account', () => {
        const dustBalance = BigNumber(100n);
        const action = actions.midnightContext.setDustBalance({
          accountId,
          dustBalance,
        });
        const state = reducers.midnightContext(initialState, action);

        expect(state.dustBalanceByAccount[accountId]).toEqual(dustBalance);
      });

      it('should update existing dust balance for a given account', () => {
        const stateWithBalance: MidnightContextSliceState = {
          ...initialState,
          dustBalanceByAccount: { [accountId]: BigNumber(100n) },
        };
        const updatedBalance = BigNumber(200n);
        const action = actions.midnightContext.setDustBalance({
          accountId,
          dustBalance: updatedBalance,
        });
        const state = reducers.midnightContext(stateWithBalance, action);

        expect(state.dustBalanceByAccount[accountId]).toEqual(updatedBalance);
      });

      it('should not affect dust balance of other accounts', () => {
        const anotherAccountId = MidnightAccountId(walletId, 1, networkId);
        const existingBalance = BigNumber(50n);
        const stateWithOtherAccount: MidnightContextSliceState = {
          ...initialState,
          dustBalanceByAccount: { [anotherAccountId]: existingBalance },
        };
        const action = actions.midnightContext.setDustBalance({
          accountId,
          dustBalance: BigNumber(100n),
        });
        const state = reducers.midnightContext(stateWithOtherAccount, action);

        expect(state.dustBalanceByAccount[anotherAccountId]).toEqual(
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

      it('should derive proof server override from feature flags', () => {
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
                    [testNetworkId]: 'https://remote-proof-server.example.com',
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
          proofServerAddress: 'https://remote-proof-server.example.com',
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

      it('should derive both proof server and indexer overrides', () => {
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
                    [testNetworkId]: 'https://remote-proof-server.example.com',
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
          proofServerAddress: 'https://remote-proof-server.example.com',
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

      it('should allow feature flags to override parts of the default network config', () => {
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
                    [testNetworkId]: 'newProofServerAddress',
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
          proofServerAddress: 'newProofServerAddress',
        });
      });

      it('should allow user overrides to trump default and feature flags', () => {
        const state: WithNetworkTestState = {
          midnightContext: {
            ...initialState,
            userNetworksConfigOverrides: {
              ...initialState.userNetworksConfigOverrides,
              [testNetworkId]: {
                proofServerAddress: 'userProofServerAddress',
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
                    [testNetworkId]: 'newProofServerAddress',
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
          proofServerAddress: 'userProofServerAddress',
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

    describe('selectNetworkTermsAndConditions', () => {
      it('should return undefined when no terms have been fetched', () => {
        const state: TestState = {
          midnightContext: initialState,
        };

        const result =
          selectors.midnightContext.selectNetworkTermsAndConditions(state);

        expect(result).toBeUndefined();
      });

      it('should return the stored terms and conditions', () => {
        const termsAndConditions = {
          url: 'https://midnight.network/terms',
          hash: 'abc123',
        };
        const state: TestState = {
          midnightContext: {
            ...initialState,
            networkTermsAndConditions: termsAndConditions,
          },
        };

        const result =
          selectors.midnightContext.selectNetworkTermsAndConditions(state);

        expect(result).toEqual(termsAndConditions);
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

    describe('selectDustToken', () => {
      it('should create dust token from derived network ID and dust balance', () => {
        const dustBalanceByAccount = {
          [accountId]: BigNumber(456n),
        };
        const state: WithNetworkTestState = {
          midnightContext: {
            ...initialState,
            dustBalanceByAccount,
          },
          network: networkState,
          features: emptyFeaturesState,
        };

        const dustToken = selectors.midnightContext.selectDustToken(
          state,
          accountId,
        );

        expect(dustToken).toBeDefined();
        expect(dustToken.displayShortName).toBe('tDUST'); // Preview network uses tDUST ticker
        expect(dustToken.blockchainName).toBe('Midnight');
        expect(dustToken.available).toEqual(dustBalanceByAccount[accountId]);
        expect(dustToken.tokenId).toBe('dust');
      });

      it('should memoize the result when inputs do not change', () => {
        const dustBalanceByAccount = {
          [accountId]: BigNumber(789n),
        };
        const state: WithNetworkTestState = {
          midnightContext: {
            ...initialState,
            dustBalanceByAccount,
          },
          network: networkState,
          features: emptyFeaturesState,
        };

        const dustToken1 = selectors.midnightContext.selectDustToken(
          state,
          accountId,
        );
        const dustToken2 = selectors.midnightContext.selectDustToken(
          state,
          accountId,
        );

        // Same reference should be returned due to memoization
        expect(dustToken1).toBe(dustToken2);
      });

      it('should create new dust token when network type changes', () => {
        const dustBalanceByAccount = {
          [accountId]: BigNumber(100n),
        };
        const state1: WithNetworkTestState = {
          midnightContext: {
            ...initialState,
            dustBalanceByAccount,
          },
          network: networkState, // testnet → preview
          features: emptyFeaturesState,
        };

        const dustToken1 = selectors.midnightContext.selectDustToken(
          state1,
          accountId,
        );

        const state2: WithNetworkTestState = {
          midnightContext: {
            ...initialState,
            dustBalanceByAccount,
          },
          network: {
            ...networkState,
            networkType: 'mainnet',
          },
          features: emptyFeaturesState,
        };

        const dustToken2 = selectors.midnightContext.selectDustToken(
          state2,
          accountId,
        );

        // Different reference and different ticker (based on network)
        expect(dustToken1).not.toBe(dustToken2);
        expect(dustToken1.displayShortName).toBe('tDUST'); // Preview network
        expect(dustToken2.displayShortName).toBe('DUST'); // MainNet network
      });

      it('should create new dust token when dust balance changes', () => {
        const state1: WithNetworkTestState = {
          midnightContext: {
            ...initialState,
            dustBalanceByAccount: {
              [accountId]: BigNumber(100n),
            },
          },
          network: networkState,
          features: emptyFeaturesState,
        };

        const dustToken1 = selectors.midnightContext.selectDustToken(
          state1,
          accountId,
        );

        const state2: WithNetworkTestState = {
          midnightContext: {
            ...initialState,
            dustBalanceByAccount: {
              [accountId]: BigNumber(200n),
            },
          },
          network: networkState,
          features: emptyFeaturesState,
        };

        const dustToken2 = selectors.midnightContext.selectDustToken(
          state2,
          accountId,
        );

        // Different reference and different balance
        expect(dustToken1).not.toBe(dustToken2);
        expect(dustToken1.available).toEqual(BigNumber(100n));
        expect(dustToken2.available).toEqual(BigNumber(200n));
      });
    });
  });
});
