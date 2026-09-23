import { FeatureFlagKey } from '@lace-contract/feature';
import { describe, expect, it } from 'vitest';

import realfiCardano from '../src';

describe('@lace-module/realfi-cardano', () => {
  it('registers for both platforms', () => {
    expect(realfiCardano['lace-mobile']).toBeDefined();
    expect(realfiCardano['lace-extension']).toBeDefined();
  });

  it('willLoad only when the REALFI payload defines at least one valid network', () => {
    const willLoad = realfiCardano['lace-mobile']?.feature?.willLoad;
    expect(willLoad).toBeDefined();
    // No flag → off.
    expect(willLoad?.([], 'test')).toBe(false);
    expect(willLoad?.([{ key: FeatureFlagKey('OTHER') }], 'test')).toBe(false);
    // Flag present but no network defined → nothing to load.
    expect(willLoad?.([{ key: FeatureFlagKey('REALFI') }], 'test')).toBe(false);
    expect(
      willLoad?.([{ key: FeatureFlagKey('REALFI'), payload: {} }], 'test'),
    ).toBe(false);
    // Unrecognized payload keys are not network definitions.
    expect(
      willLoad?.(
        [{ key: FeatureFlagKey('REALFI'), payload: { bogus: {} } }],
        'test',
      ),
    ).toBe(false);
    // Flag present with ≥1 recognized network resolving to a valid config → load.
    expect(
      willLoad?.(
        [{ key: FeatureFlagKey('REALFI'), payload: { preview: {} } }],
        'test',
      ),
    ).toBe(true);
    expect(
      willLoad?.(
        [{ key: FeatureFlagKey('REALFI'), payload: { mainnet: {} } }],
        'test',
      ),
    ).toBe(true);
  });
});
