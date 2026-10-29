import {
  DEFAULT_NETWORKS_CONFIG,
  EMPTY_PARTIAL_NETWORKS_CONFIG,
  midnightContextActions,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { midnightContextReducers } from '@lace-contract/midnight-context/src/store/slice';
import { testSideEffect } from '@lace-lib/util-dev';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';

import {
  createApplyNetworkConfigOverrides,
  createApplyNetworkDefaultsMiddleware,
} from '../../../src/store/side-effects/network-config';

import type { ProofServerMode } from '@lace-contract/midnight-context';
import type { Middleware } from '@reduxjs/toolkit';

const actions = midnightContextActions;

describe('createApplyNetworkConfigOverrides', () => {
  it('stores each configured network as a user override over the current config', () => {
    const featureFlagsOverrides = {
      ...EMPTY_PARTIAL_NETWORKS_CONFIG,
      [MidnightSDKNetworkIds.Preview]: { nodeAddress: 'https://flag.node' },
    };
    testSideEffect(
      createApplyNetworkConfigOverrides({
        [MidnightSDKNetworkIds.Preview]: {
          nodeAddress: 'https://rpc.preview',
          indexerAddress: 'https://indexer.preview/graphql',
        },
        [MidnightSDKNetworkIds.PreProd]: {
          proofServer: { kind: 'local-host', url: 'https://prover' },
        },
      }),
      ({ expectObservable, cold }) => ({
        actionObservables: {},
        stateObservables: {
          midnightContext: {
            selectNetworksConfig$: cold('a', { a: DEFAULT_NETWORKS_CONFIG }),
            selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
              a: featureFlagsOverrides,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab|)', {
            a: actions.midnightContext.setUserNetworkConfigOverride({
              networkId: MidnightSDKNetworkIds.Preview,
              config: {
                ...DEFAULT_NETWORKS_CONFIG[MidnightSDKNetworkIds.Preview],
                nodeAddress: 'https://rpc.preview',
                indexerAddress: 'https://indexer.preview/graphql',
              },
              featureFlagsOverrides: { nodeAddress: 'https://flag.node' },
            }),
            b: actions.midnightContext.setUserNetworkConfigOverride({
              networkId: MidnightSDKNetworkIds.PreProd,
              config: {
                ...DEFAULT_NETWORKS_CONFIG[MidnightSDKNetworkIds.PreProd],
                proofServer: { kind: 'local-host', url: 'https://prover' },
              },
              featureFlagsOverrides: {},
            }),
          });
        },
      }),
    );
  });

  it('emits nothing without overrides', () => {
    testSideEffect(
      createApplyNetworkConfigOverrides({}),
      ({ expectObservable, cold }) => ({
        actionObservables: {},
        stateObservables: {
          midnightContext: {
            selectNetworksConfig$: cold('a', { a: DEFAULT_NETWORKS_CONFIG }),
            selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
              a: EMPTY_PARTIAL_NETWORKS_CONFIG,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('|');
        },
      }),
    );
  });
});

describe('createApplyNetworkDefaultsMiddleware', () => {
  const remoteMode: ProofServerMode = {
    kind: 'delegated',
    url: 'https://prover.example',
    label: 'prover.example',
  };
  const supportedNetworkIds = [
    MidnightSDKNetworkIds.Preview,
    MidnightSDKNetworkIds.PreProd,
  ];
  const createTestStore = (middleware: Middleware) => {
    const dispatched: string[] = [];
    const record: Middleware = () => next => action => {
      dispatched.push((action as { type: string }).type);
      return next(action);
    };
    const store = configureStore({
      reducer: midnightContextReducers,
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware().concat(middleware, record),
    });
    return { store, dispatched };
  };

  it('applies the supported networks and default proof servers right after the first action, once', () => {
    const { store, dispatched } = createTestStore(
      createApplyNetworkDefaultsMiddleware({
        supportedNetworkIds,
        defaultProofServers: { [MidnightSDKNetworkIds.Preview]: remoteMode },
      }),
    );
    expect(store.getState().midnightContext.supportedNetworksIds).toHaveLength(
      7,
    );

    store.dispatch({ type: 'persist/PERSIST' });
    store.dispatch({ type: 'persist/REHYDRATE' });

    const state = store.getState().midnightContext;
    expect(state.supportedNetworksIds).toEqual(supportedNetworkIds);
    expect(
      state.defaultNetworksConfig[MidnightSDKNetworkIds.Preview].proofServer,
    ).toEqual(remoteMode);
    expect(state.defaultNetworksConfig[MidnightSDKNetworkIds.PreProd]).toEqual(
      DEFAULT_NETWORKS_CONFIG[MidnightSDKNetworkIds.PreProd],
    );
    expect(dispatched).toEqual([
      'persist/PERSIST',
      midnightContextActions.midnightContext.setSupportedNetworksIds.type,
      midnightContextActions.midnightContext.setDefaultProofServers.type,
      'persist/REHYDRATE',
    ]);
  });

  it('dispatches nothing of its own without loadout defaults', () => {
    const { store, dispatched } = createTestStore(
      createApplyNetworkDefaultsMiddleware({}),
    );

    store.dispatch({ type: 'persist/PERSIST' });

    expect(dispatched).toEqual(['persist/PERSIST']);
    expect(store.getState().midnightContext.supportedNetworksIds).toHaveLength(
      7,
    );
  });
});
