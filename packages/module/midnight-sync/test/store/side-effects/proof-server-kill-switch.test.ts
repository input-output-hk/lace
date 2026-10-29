import { uiActions } from '@lace-contract/app';
import {
  DEFAULT_NETWORKS_CONFIG,
  midnightContextActions,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { migrateUnavailableProofServerSelection } from '../../../src/store/side-effects/proof-server-kill-switch';

import type {
  MidnightSDKNetworkId,
  PartialMidnightNetworksConfig,
} from '@lace-contract/midnight-context';
const actions = { ...midnightContextActions, ...uiActions };
const preprod = MidnightSDKNetworkIds.PreProd;
const preview = MidnightSDKNetworkIds.Preview;
const rewrite = (networkId: MidnightSDKNetworkId) =>
  actions.midnightContext.setUserNetworkConfigOverride({
    networkId,
    config: DEFAULT_NETWORKS_CONFIG[networkId],
    featureFlagsOverrides: {},
  });
const notice = actions.ui.showToast({
  text: 'midnight.proof-server.unavailable',
  color: 'neutral',
  duration: 8,
  leftIcon: { name: 'AlertTriangle', size: 20 },
});
describe('migrateUnavailableProofServerSelection', () => {
  it.each<{
    name: string;
    input: string;
    values: Record<string, MidnightSDKNetworkId[]>;
    expected: string;
    outputs: Record<string, ReturnType<typeof rewrite> | typeof notice>;
  }>([
    {
      name: 'available selections',
      input: '-a',
      values: { a: [] },
      expected: '--',
      outputs: {},
    },
    {
      name: 'one disabled provider',
      input: '-a-b',
      values: { a: [preprod], b: [] },
      expected: '-(ab)',
      outputs: { a: rewrite(preprod), b: notice },
    },
    {
      name: 'one notice for multiple disabled providers',
      input: '-a-b',
      values: { a: [preprod, preview], b: [] },
      expected: '-(abc)',
      outputs: { a: rewrite(preprod), b: rewrite(preview), c: notice },
    },
    {
      name: 'no repeated notice for unchanged selection',
      input: '-a-b-c',
      values: { a: [preprod], b: [preprod], c: [] },
      expected: '-(ab)',
      outputs: { a: rewrite(preprod), b: notice },
    },
    {
      name: 'a later flag disable',
      input: '-a-b',
      values: { a: [], b: [preprod] },
      expected: '---(ab)',
      outputs: { a: rewrite(preprod), b: notice },
    },
  ])('$name', ({ input, values, expected, outputs }) => {
    testSideEffect(
      migrateUnavailableProofServerSelection,
      ({ hot, expectObservable }) => ({
        stateObservables: {
          midnightContext: {
            selectUnavailableProofServerNetworks$: hot(input, values),
            selectNetworksConfig$: hot('a', { a: DEFAULT_NETWORKS_CONFIG }),
            selectNetworksConfigFeatureFlagsOverrides$: hot('a', {
              a: {} as PartialMidnightNetworksConfig,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe(expected, outputs);
        },
      }),
    );
  });
});
