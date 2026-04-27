import { FeatureFlagKey } from '@lace-contract/feature';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { FEATURE_FLAG_NETWORK_TYPE } from '../../src/const';
import { syncInitialNetworkTypeFeatureFlagPayload } from '../../src/store/side-effects';
import { networkActions } from '../../src/store/slice';

const actions = { ...networkActions };

describe('side-effects', () => {
  describe('syncInitialNetworkTypeFeatureFlagPayload', () => {
    describe('from selectLoadedFeatures$', () => {
      it('dispatches setInitialNetworkType with feature flag payload when flag is present and valid', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', {
                  a: {
                    modules: [],
                    featureFlags: [
                      { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'mainnet' },
                    ],
                  },
                }),
                selectNextFeatureFlags$: cold('|'),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('mainnet'),
              });
            },
          }),
        );
      });

      it('falls back to mainnet when feature flag is absent', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', {
                  a: { modules: [], featureFlags: [] },
                }),
                selectNextFeatureFlags$: cold('|'),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('mainnet'),
              });
            },
          }),
        );
      });

      it('falls back to mainnet when feature flag payload is missing', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', {
                  a: {
                    modules: [],
                    featureFlags: [{ key: FEATURE_FLAG_NETWORK_TYPE }],
                  },
                }),
                selectNextFeatureFlags$: cold('|'),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('mainnet'),
              });
            },
          }),
        );
      });

      it('falls back to mainnet when feature flag payload is not a valid string', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', {
                  a: {
                    modules: [],
                    featureFlags: [
                      { key: FEATURE_FLAG_NETWORK_TYPE, payload: 42 },
                    ],
                  },
                }),
                selectNextFeatureFlags$: cold('|'),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('mainnet'),
              });
            },
          }),
        );
      });

      it('dispatches setInitialNetworkType when payload is object-shaped { networkType }', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', {
                  a: {
                    modules: [],
                    featureFlags: [
                      {
                        key: FEATURE_FLAG_NETWORK_TYPE,
                        payload: { networkType: 'testnet' },
                      },
                    ],
                  },
                }),
                selectNextFeatureFlags$: cold('|'),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('testnet'),
              });
            },
          }),
        );
      });

      it('falls back to mainnet when payload is object-shaped with invalid networkType', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', {
                  a: {
                    modules: [],
                    featureFlags: [
                      {
                        key: FEATURE_FLAG_NETWORK_TYPE,
                        payload: { networkType: 'staging' },
                      },
                    ],
                  },
                }),
                selectNextFeatureFlags$: cold('|'),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('mainnet'),
              });
            },
          }),
        );
      });

      it('falls back to mainnet when feature flag payload is an invalid string', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', {
                  a: {
                    modules: [],
                    featureFlags: [
                      { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'staging' },
                    ],
                  },
                }),
                selectNextFeatureFlags$: cold('|'),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('mainnet'),
              });
            },
          }),
        );
      });

      it('ignores unrelated feature flags', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', {
                  a: {
                    modules: [],
                    featureFlags: [
                      {
                        key: FeatureFlagKey('SOME_OTHER_FLAG'),
                        payload: 'mainnet',
                      },
                    ],
                  },
                }),
                selectNextFeatureFlags$: cold('|'),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('mainnet'),
              });
            },
          }),
        );
      });

      it('never dispatches setNetworkType regardless of flag value', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('a', {
                  a: {
                    modules: [],
                    featureFlags: [
                      { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
                    ],
                  },
                }),
                selectNextFeatureFlags$: cold('|'),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('testnet'),
              });
            },
          }),
        );
      });
    });

    describe('from selectNextFeatureFlags$', () => {
      it('dispatches setInitialNetworkType with feature flag payload when flag is present and valid', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('|'),
                selectNextFeatureFlags$: cold('a', {
                  a: {
                    features: [
                      { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
                    ],
                    added: [],
                    removed: [],
                    updated: [],
                  },
                }),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('testnet'),
              });
            },
          }),
        );
      });

      it('falls back to mainnet when feature flag is absent from next flags', () => {
        testSideEffect(
          syncInitialNetworkTypeFeatureFlagPayload,
          ({ cold, expectObservable }) => ({
            stateObservables: {
              features: {
                selectLoadedFeatures$: cold('|'),
                selectNextFeatureFlags$: cold('a', {
                  a: {
                    features: [],
                    added: [],
                    removed: [],
                    updated: [],
                  },
                }),
              },
              network: {},
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.network.setInitialNetworkType('mainnet'),
              });
            },
          }),
        );
      });
    });

    it('deduplicates consecutive identical payloads', () => {
      testSideEffect(
        syncInitialNetworkTypeFeatureFlagPayload,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            features: {
              selectLoadedFeatures$: cold('ab', {
                a: {
                  modules: [],
                  featureFlags: [
                    { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'mainnet' },
                  ],
                },
                b: {
                  modules: [],
                  featureFlags: [
                    { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'mainnet' },
                  ],
                },
              }),
              selectNextFeatureFlags$: cold('|'),
            },
            network: {},
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // Only one emission despite two identical flag values
            expectObservable(sideEffect$).toBe('a-', {
              a: actions.network.setInitialNetworkType('mainnet'),
            });
          },
        }),
      );
    });
  });
});
