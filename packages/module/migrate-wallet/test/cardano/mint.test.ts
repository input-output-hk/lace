import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { TEST_TOKEN_POLICY_ID, testAssetId, testAssetId2 } from './mint';

describe('test minting policies', () => {
  // A collision would silently turn the multi-policy scenario into a
  // single-policy repeat, and on-chain staging is the only other way to notice.
  it('hash to distinct policy ids, so one name yields two assets', () => {
    const first = testAssetId('multipol-1');
    const second = testAssetId2('multipol-1');

    expect(Cardano.AssetId.getPolicyId(first)).toBe(TEST_TOKEN_POLICY_ID);
    expect(Cardano.AssetId.getPolicyId(second)).not.toBe(TEST_TOKEN_POLICY_ID);
    expect(second).not.toBe(first);
  });
});
