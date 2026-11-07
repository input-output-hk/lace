import { FeatureFlagKey } from '@lace-contract/feature';
import {
  MidnightNetworkId,
  midnightContextActions,
} from '@lace-contract/midnight-context';
import { networkActions } from '@lace-contract/network';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { syncSupportedNetworksWithFeatureFlags } from '../../../src/store/side-effects';

describe('StageNet discovery gate', () => {
  it.each([false, true])(
    'includes StageNet only when its flag is enabled: %s',
    isEnabled => {
      testSideEffect(
        syncSupportedNetworksWithFeatureFlags,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            features: {
              selectLoadedFeatures$: cold('a', {
                a: {
                  modules: [],
                  featureFlags: isEnabled
                    ? [
                        {
                          key: FeatureFlagKey(
                            'BLOCKCHAIN_MIDNIGHT_STAGENET_SUPPORT',
                          ),
                        },
                      ]
                    : [],
                },
              }),
              selectNextFeatureFlags$: cold(''),
            },
            midnightContext: {
              selectDefaultTestNetNetworkId$: cold('a', { a: 'preview' }),
              selectNetworkId$: cold('a', { a: 'undeployed' }),
            },
          },
          dependencies: {
            actions: { ...midnightContextActions, ...networkActions },
          },
          assertion: effect => {
            expectObservable(effect).toBe('1000ms (ab)', {
              a: midnightContextActions.midnightContext.setSupportedNetworksIds(
                isEnabled ? ['undeployed', 'stagenet'] : ['undeployed'],
              ),
              b: networkActions.network.setTestnetOptions({
                blockchainName: 'Midnight',
                options: [
                  {
                    id: MidnightNetworkId('undeployed'),
                    label: 'midnight.network-config.network-option.undeployed',
                  },
                  ...(isEnabled
                    ? [
                        {
                          id: MidnightNetworkId('stagenet'),
                          label:
                            'midnight.network-config.network-option.stagenet' as const,
                        },
                      ]
                    : []),
                ],
              }),
            });
          },
        }),
      );
    },
  );
});
