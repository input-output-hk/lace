import { describe, expect, it } from 'vitest';

import moduleMap from '../src';
import { FEATURE_FLAG_MIDNIGHT } from '../src/const';

import type { FeatureFlag } from '@lace-contract/feature';

const flags = (keys: string[]): FeatureFlag[] =>
  keys.map(key => ({ key })) as FeatureFlag[];

describe('midnight-host-pull module', () => {
  it('registers for the guest platform only', () => {
    expect(moduleMap['lace-extension-guest']).toBeDefined();
    expect(moduleMap['lace-extension']).toBeUndefined();
    expect(moduleMap['lace-mobile']).toBeUndefined();
  });

  it('loads only when the BLOCKCHAIN_MIDNIGHT feature flag is present', () => {
    const feature = moduleMap['lace-extension-guest']!.feature!;
    const environment = {} as never;
    expect(feature.willLoad(flags([FEATURE_FLAG_MIDNIGHT]), environment)).toBe(
      true,
    );
    expect(feature.willLoad(flags(['BLOCKCHAIN_BITCOIN']), environment)).toBe(
      false,
    );
    expect(feature.willLoad(flags([]), environment)).toBe(false);
  });
});
