import { Cardano } from '@cardano-sdk/core';
import {
  DREP_ALWAYS_ABSTAIN,
  DREP_ALWAYS_NO_CONFIDENCE,
  FEATURE_FLAG_GOVERNANCE_CENTER,
} from '@lace-contract/governance-center';
import { FEATURE_FLAG_STAKING_CENTER } from '@lace-contract/staking-center';
import { describe, expect, it } from 'vitest';

import {
  FEATURE_FLAG_EARN_REWARDS,
  parseEarnRewardsFeatureFlagPayload,
} from '../src/const';
import { resolveEarnRewardsTarget } from '../src/resolve-target';

import type { EarnRewardsRateInput } from '../src/rate';
import type { FeatureFlag } from '@lace-contract/feature';

const POOL = 'pool132jxjzyw4awr3s75ltcdx5tv5ecv6m042306l630wqjckhfm32r';
const DREP = 'drep1y2v8w544v5teexvycd6zqgh2686yz7050tdv834yegpt0gsnampev';

const stakingFlag = {
  key: FEATURE_FLAG_STAKING_CENTER,
  payload: { promotedPools: { preprod: [{ id: POOL }] } },
} as FeatureFlag;
const governanceFlagWith = (drepId: string) =>
  ({
    key: FEATURE_FLAG_GOVERNANCE_CENTER,
    payload: { promotedDreps: { preprod: [{ id: drepId }] } },
  } as FeatureFlag);
const governanceFlag = governanceFlagWith(DREP);
const earnRewardsFlag = (rate?: EarnRewardsRateInput) =>
  ({
    key: FEATURE_FLAG_EARN_REWARDS,
    ...(rate === undefined ? {} : { payload: { rate: { preprod: rate } } }),
  } as FeatureFlag);

describe('parseEarnRewardsFeatureFlagPayload', () => {
  it('extracts the per-network rate map', () => {
    expect(
      parseEarnRewardsFeatureFlagPayload({
        payload: { rate: { preprod: 3.2 } },
      }),
    ).toEqual({ rate: { preprod: 3.2 } });
  });

  it.each<[string, { payload?: unknown } | undefined]>([
    ['no flag', undefined],
    ['no payload', {}],
    ['non-object payload', { payload: 'x' }],
    ['missing rate', { payload: {} }],
    ['non-object rate', { payload: { rate: 'x' } }],
  ])('returns {} for %s', (_label, flag) => {
    expect(parseEarnRewardsFeatureFlagPayload(flag)).toEqual({});
  });
});

describe('resolveEarnRewardsTarget — advertised rate', () => {
  it('reads a single rate from the EARN_REWARDS payload (not the promoted pool)', () => {
    const target = resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [stakingFlag, governanceFlag, earnRewardsFlag(3.2)],
    });
    expect(target?.rate).toEqual({ kind: 'single', value: 3.2 });
  });

  it('reads a low–high range from the EARN_REWARDS payload', () => {
    const target = resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [
        stakingFlag,
        governanceFlag,
        earnRewardsFlag({ min: 2, max: 4 }),
      ],
    });
    expect(target?.rate).toEqual({ kind: 'range', min: 2, max: 4 });
  });

  it('resolves the target with an undefined rate when none is advertised', () => {
    const target = resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [stakingFlag, governanceFlag, earnRewardsFlag()],
    });
    expect(target).toBeDefined();
    expect(target?.rate).toBeUndefined();
  });
});

describe('resolveEarnRewardsTarget — availability guards', () => {
  const flags = [stakingFlag, governanceFlag, earnRewardsFlag(3.2)];

  it('returns undefined when the EARN_REWARDS flag is absent, despite pool + DRep', () => {
    // The gate is single-sourced here: a resolved target always implies the
    // feature is enabled, so no consumer can leak it from the promoted payloads.
    expect(
      resolveEarnRewardsTarget({
        chainId: Cardano.ChainIds.Preprod,
        featureFlags: [stakingFlag, governanceFlag],
      }),
    ).toBeUndefined();
  });

  it('returns undefined when no chainId is given', () => {
    expect(
      resolveEarnRewardsTarget({ chainId: undefined, featureFlags: flags }),
    ).toBeUndefined();
  });

  it('returns undefined for an unknown network magic', () => {
    expect(
      resolveEarnRewardsTarget({
        chainId: {
          networkId: Cardano.NetworkId.Testnet,
          networkMagic: 999_999 as Cardano.NetworkMagic,
        },
        featureFlags: flags,
      }),
    ).toBeUndefined();
  });

  // Cardano.PoolId / DRepID throw on invalid bech32; a bad CMS id must never
  // crash the render-time resolver. It degrades ITS OWN leg to absent — one
  // misconfigured id must not take down the leg that is configured correctly.
  it('degrades a malformed pool id to a dRep-only target', () => {
    const staking = {
      key: FEATURE_FLAG_STAKING_CENTER,
      payload: { promotedPools: { preprod: [{ id: 'not-a-valid-pool' }] } },
    } as FeatureFlag;
    const target = resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [staking, governanceFlag, earnRewardsFlag(3.2)],
    });
    expect(target?.poolId).toBeUndefined();
    expect(target?.dRep).toEqual({
      type: 'specific',
      drepId: Cardano.DRepID(DREP),
    });
  });

  it('degrades a malformed DRep id to a pool-only target', () => {
    const target = resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [
        stakingFlag,
        governanceFlagWith('not-a-valid-drep'),
        earnRewardsFlag(3.2),
      ],
    });
    expect(target?.dRep).toBeUndefined();
    expect(target?.poolId).toBe(Cardano.PoolId(POOL));
  });

  /**
   * The four configuration combos (LW-15293). Each leg resolves independently:
   * an absent pool must not disable vote delegation — the user selects a pool
   * instead — and an absent DRep must not disable staking. Only both absent
   * hides the offer.
   */
  it('resolves a dRep-only target when no promoted pool is configured', () => {
    const target = resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [governanceFlag, earnRewardsFlag(3.2)],
    });
    expect(target?.poolId).toBeUndefined();
    expect(target?.dRep).toEqual({
      type: 'specific',
      drepId: Cardano.DRepID(DREP),
    });
  });

  it('resolves a pool-only target when no promoted DRep is configured', () => {
    const target = resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [stakingFlag, earnRewardsFlag(3.2)],
    });
    expect(target?.poolId).toBe(Cardano.PoolId(POOL));
    expect(target?.dRep).toBeUndefined();
  });

  it('resolves both legs when both are configured', () => {
    const target = resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [stakingFlag, governanceFlag, earnRewardsFlag(3.2)],
    });
    expect(target?.poolId).toBe(Cardano.PoolId(POOL));
    expect(target?.dRep).toBeDefined();
  });

  it('returns undefined when neither leg is configured', () => {
    expect(
      resolveEarnRewardsTarget({
        chainId: Cardano.ChainIds.Preprod,
        featureFlags: [earnRewardsFlag(3.2)],
      }),
    ).toBeUndefined();
  });

  /**
   * The advertised rate belongs to the PROMOTED offer. Once the user selects
   * their own pool the honest figure is that pool's estimate, so a target with
   * no promoted pool carries no advertised rate for any surface to mis-attach.
   */
  it('drops the advertised rate when no promoted pool is configured', () => {
    const target = resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [governanceFlag, earnRewardsFlag(3.2)],
    });
    expect(target?.rate).toBeUndefined();
  });
});

describe('resolveEarnRewardsTarget — DRep option mapping', () => {
  const resolveWithDrep = (drepId: string) =>
    resolveEarnRewardsTarget({
      chainId: Cardano.ChainIds.Preprod,
      featureFlags: [
        stakingFlag,
        governanceFlagWith(drepId),
        earnRewardsFlag(),
      ],
    });

  it('maps a bech32 DRep id to a specific target', () => {
    expect(resolveWithDrep(DREP)?.dRep).toEqual({
      type: 'specific',
      drepId: Cardano.DRepID(DREP),
    });
  });

  // The spec forbids earn-rewards delegating the user's vote to a sentinel, so
  // a misconfigured sentinel payload degrades the vote leg to absent — the
  // pool leg survives — and never casts an abstain / no-confidence vote.
  it.each([
    ['abstain', DREP_ALWAYS_ABSTAIN],
    ['no-confidence', DREP_ALWAYS_NO_CONFIDENCE],
  ])(
    'degrades the vote leg when the promoted DRep is the %s sentinel',
    (_label, sentinel) => {
      const target = resolveWithDrep(sentinel);
      expect(target?.dRep).toBeUndefined();
      expect(target?.poolId).toBe(Cardano.PoolId(POOL));
    },
  );
});
