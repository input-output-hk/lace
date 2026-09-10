import { Cardano } from '@cardano-sdk/core';
import { resolveEarnRewardsTarget } from '@lace-contract/earn-rewards';
import { describe, expect, it } from 'vitest';

import defaultFeatureFlags from '../src/app/feature-flags';

/**
 * The bootstrap flags have to resolve a promoted pool + DRep, or two features
 * fail silently rather than loudly: the earn-rewards nudge never appears, and
 * the wallet migration's post-sweep delegation settles `unavailable` and skips
 * to done without an error.
 *
 * Mobile shipped without `EARN_REWARDS` or `GOVERNANCE_CENTER` at all and with a
 * payload-less `STAKING_CENTER`, so both behaved that way on every network. The
 * absence was invisible — nothing asserted the flags resolve to anything.
 */
describe('earn-rewards target resolves from the mobile bootstrap flags', () => {
  const featureFlags = defaultFeatureFlags;

  it.each([
    ['mainnet', Cardano.ChainIds.Mainnet],
    ['preprod', Cardano.ChainIds.Preprod],
    ['preview', Cardano.ChainIds.Preview],
  ])('resolves a promoted pool and DRep on %s', (_network, chainId) => {
    const target = resolveEarnRewardsTarget({ featureFlags, chainId });

    expect(target).toBeDefined();
    expect(target?.poolId).toBeTruthy();
    expect(target?.dRep?.drepId).toBeTruthy();
  });

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
