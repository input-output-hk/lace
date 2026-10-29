import { Cardano } from '@cardano-sdk/core';
import { resolveEarnRewardsTarget } from '@lace-contract/earn-rewards';
import { FeatureFlagKey } from '@lace-contract/feature';
import { describe, expect, it } from 'vitest';

import defaultFeatureFlags from '../src/app/feature-flags';

describe('earn-rewards target resolves from the mobile bootstrap flags', () => {
  const featureFlags = [
    ...defaultFeatureFlags,
    { key: FeatureFlagKey('EARN_REWARDS') },
  ];

  it.each([
    ['mainnet', Cardano.ChainIds.Mainnet],
    ['preprod', Cardano.ChainIds.Preprod],
    ['preview', Cardano.ChainIds.Preview],
  ])('does not offer earn-rewards by default on %s', (_network, chainId) => {
    expect(
      resolveEarnRewardsTarget({ featureFlags: defaultFeatureFlags, chainId }),
    ).toBeUndefined();
  });

  it.each([
    ['mainnet', Cardano.ChainIds.Mainnet],
    ['preprod', Cardano.ChainIds.Preprod],
    ['preview', Cardano.ChainIds.Preview],
  ])(
    'resolves a promoted pool and DRep when enabled on %s',
    (_network, chainId) => {
      const target = resolveEarnRewardsTarget({ featureFlags, chainId });

      expect(target).toBeDefined();
      expect(target?.poolId).toBeTruthy();
      expect(target?.dRep?.drepId).toBeTruthy();
    },
  );

  // The flow refuses to delegate a vote to abstain / no-confidence, so a
  // sentinel in the payload would resolve to `undefined` and read as "not
  // configured" — the same silent skip, from a value that looks configured.
  it('promotes a specific DRep, not a sentinel', () => {
    const target = resolveEarnRewardsTarget({
      featureFlags,
      chainId: Cardano.ChainIds.Preprod,
    });

    expect(target?.dRep?.type).toBe('specific');
  });
});
