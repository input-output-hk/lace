import { FeatureFlagKey } from '@lace-contract/feature';
import {
  featuresActions,
  featuresReducers,
} from '@lace-contract/feature/src/store/slice';
import { describe, expect, it } from 'vitest';

import {
  FeatureIds,
  networkActions,
  networkReducers,
  networkSelectors,
} from '../src';

const buy = { key: FeatureFlagKey('BUY_FLOW') };
const explorer = { key: FeatureFlagKey('DAPP_EXPLORER') };
const network = networkReducers.network(
  undefined,
  networkActions.network.setNetworkType('mainnet'),
);
const initial = {
  ...featuresReducers.features(undefined, { type: '@@INIT' }),
  loaded: { featureFlags: [buy, explorer], modules: [] },
};
const available = networkSelectors.network.selectIsFeatureAvailable;

describe('Banxa remote availability', () => {
  it('applies flag removal and restoration to open views before a module reload', () => {
    const disabled = featuresReducers.features(
      initial,
      featuresActions.features.updateFeatures({
        featureFlags: [explorer],
        modules: [],
      }),
    );
    expect(
      available({ network, features: disabled }, FeatureIds.BUY_FLOW),
    ).toBe(false);
    const restored = featuresReducers.features(
      disabled,
      featuresActions.features.updateFeatures(initial.loaded),
    );
    expect(
      available({ network, features: restored }, FeatureIds.BUY_FLOW),
    ).toBe(true);
  });

  it('respects an empty pending flag set while other features retain their loaded lifecycle', () => {
    const disabled = featuresReducers.features(
      initial,
      featuresActions.features.updateFeatures({
        featureFlags: [],
        modules: [],
      }),
    );
    expect(
      available({ network, features: disabled }, FeatureIds.BUY_FLOW),
    ).toBe(false);
    expect(
      available({ network, features: disabled }, FeatureIds.DAPP_EXPLORER),
    ).toBe(true);
  });
});
