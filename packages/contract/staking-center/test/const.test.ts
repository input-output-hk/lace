import { describe, expect, it } from 'vitest';

import { parseStakingFeatureFlagPayload } from '../src/const';

// Crash barrier for remote CMS data — mirrors the coverage of the symmetric
// parseGovernanceFeatureFlagPayload in governance-center.
describe('parseStakingFeatureFlagPayload', () => {
  it('returns the promotedPools map from a valid payload', () => {
    const promotedPools = { mainnet: [{ id: 'pool1abc' }] };
    expect(
      parseStakingFeatureFlagPayload({ payload: { promotedPools } }),
    ).toEqual({ promotedPools });
  });

  it('returns {} when the flag is missing', () => {
    expect(parseStakingFeatureFlagPayload(undefined)).toEqual({});
  });

  it('returns {} when the payload is absent or not an object', () => {
    expect(parseStakingFeatureFlagPayload({})).toEqual({});
    expect(parseStakingFeatureFlagPayload({ payload: 'nope' })).toEqual({});
  });

  it('returns {} when promotedPools is missing or malformed', () => {
    expect(parseStakingFeatureFlagPayload({ payload: {} })).toEqual({});
    expect(
      parseStakingFeatureFlagPayload({ payload: { promotedPools: 1 } }),
    ).toEqual({});
  });
});
