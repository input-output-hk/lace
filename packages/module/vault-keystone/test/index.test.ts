import { describe, expect, it } from 'vitest';

import moduleMap, { FEATURE_FLAG_KEYSTONE } from '../src';

import type { FeatureFlag } from '@lace-contract/feature';

const flags = (keys: string[]): FeatureFlag[] =>
  keys.map(key => ({ key })) as FeatureFlag[];

describe('vault-keystone module', () => {
  it('registers the same module for extension and mobile', () => {
    expect(moduleMap['lace-extension']).toBeDefined();
    expect(moduleMap['lace-mobile']).toBe(moduleMap['lace-extension']);
  });

  it('loads only when the KEYSTONE feature flag is present', () => {
    const feature = moduleMap['lace-extension']!.feature!;
    const environment = {} as never;
    expect(feature.willLoad(flags([FEATURE_FLAG_KEYSTONE]), environment)).toBe(
      true,
    );
    expect(feature.willLoad(flags(['SEED_SIGNER']), environment)).toBe(false);
    expect(feature.willLoad(flags([]), environment)).toBe(false);
  });
});
