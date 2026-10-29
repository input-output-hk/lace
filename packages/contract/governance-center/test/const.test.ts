import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  DREP_ALWAYS_ABSTAIN,
  DREP_ALWAYS_NO_CONFIDENCE,
  getDelegationHealth,
  getDelegationStatus,
  isSentinelDrepId,
  describeGovernancePayloadIssues,
  parseGovernanceFeatureFlagPayload,
  pickPromotedInformation,
  promotedNetworkKeyForChainId,
} from '../src/const';

import type { DRepSummary } from '@lace-contract/cardano-context';

describe('governance-center delegation status helpers', () => {
  describe('isSentinelDrepId', () => {
    it('is true for the abstain sentinel', () => {
      expect(isSentinelDrepId(DREP_ALWAYS_ABSTAIN)).toBe(true);
    });

    it('is true for the no-confidence sentinel', () => {
      expect(isSentinelDrepId(DREP_ALWAYS_NO_CONFIDENCE)).toBe(true);
    });

    it('is false for a specific DRep id', () => {
      expect(isSentinelDrepId('drep1specific')).toBe(false);
    });
  });

  describe('getDelegationStatus', () => {
    it('is "not-delegated" when drepId is undefined', () => {
      expect(getDelegationStatus(undefined)).toBe('not-delegated');
    });

    it('is "abstaining" for the abstain sentinel', () => {
      expect(getDelegationStatus(DREP_ALWAYS_ABSTAIN)).toBe('abstaining');
    });

    it('is "no-confidence" for the no-confidence sentinel', () => {
      expect(getDelegationStatus(DREP_ALWAYS_NO_CONFIDENCE)).toBe(
        'no-confidence',
      );
    });

    it('is "delegated" for a specific DRep id', () => {
      expect(getDelegationStatus('drep1specific')).toBe('delegated');
    });
  });
});

/**
 * Two real DReps, the first in both encodings. The parser drops anything
 * that is not a DRep id, so a placeholder like `drep1abc` would be filtered
 * before reaching the behaviour under test — these have to be real.
 */
const CIP129 = 'drep1ygr9tuapcanc3kpeyy4dc3vmrz9cfe5q7v9wj3x9j0ap3tswtre9j';
const CIP105 = 'drep1qe2l8gw8v7ydswfp9twytxcc3wzwdq8npt55f3vnlgv2u8sx3nt';
const DREP_B = 'drep1ytvlwvyjmzfyn56n0zz4f6lj94wxhmsl5zky6knnzrf4jygpyahug';

describe('parseGovernanceFeatureFlagPayload', () => {
  it('returns the promotedDreps map from a valid payload', () => {
    const promotedDreps = { mainnet: [{ id: CIP129 }] };
    expect(
      parseGovernanceFeatureFlagPayload({ payload: { promotedDreps } }),
    ).toEqual({ promotedDreps });
  });

  it('returns {} when the flag is missing', () => {
    expect(parseGovernanceFeatureFlagPayload(undefined)).toEqual({});
  });

  it('returns {} when the payload is absent or not an object', () => {
    expect(parseGovernanceFeatureFlagPayload({})).toEqual({});
    expect(parseGovernanceFeatureFlagPayload({ payload: 'nope' })).toEqual({});
  });

  it('returns {} when promotedDreps is missing or malformed', () => {
    expect(parseGovernanceFeatureFlagPayload({ payload: {} })).toEqual({});
    expect(
      parseGovernanceFeatureFlagPayload({ payload: { promotedDreps: 1 } }),
    ).toEqual({});
  });

  it('returns the blockedDreps map from a valid payload', () => {
    const blockedDreps = { mainnet: [CIP129] };
    expect(
      parseGovernanceFeatureFlagPayload({ payload: { blockedDreps } }),
    ).toEqual({ blockedDreps });
  });

  it('drops blockedDreps when it is not a per-network record', () => {
    expect(
      parseGovernanceFeatureFlagPayload({ payload: { blockedDreps: 1 } }),
    ).toEqual({});
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: { blockedDreps: ['drep1abc'] },
      }),
    ).toEqual({});
  });

  // Safe to drop only because describeGovernancePayloadIssues reports the key
  // first: dropping it silently is the failure this pair exists to remove.
  it('drops a network key that is not a known network', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: {
          blockedDreps: { mainnet: [CIP129], preprd: [DREP_B] },
          promotedDreps: { typo: [{ id: CIP129 }] },
        },
      }),
    ).toEqual({ blockedDreps: { mainnet: [CIP129] }, promotedDreps: {} });
  });

  it('drops malformed network entries and non-string ids from blockedDreps', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: {
          blockedDreps: { mainnet: CIP129, preprod: [DREP_B, 5] },
        },
      }),
    ).toEqual({ blockedDreps: { preprod: [DREP_B] } });
  });

  it('canonicalises blocked ids, so a hand-pasted id still matches', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: { blockedDreps: { mainnet: [CIP129.toUpperCase()] } },
      }),
    ).toEqual({ blockedDreps: { mainnet: [CIP129] } });
  });

  it('drops a promoted entry blocked under a different case', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: {
          blockedDreps: { mainnet: [CIP129.toUpperCase()] },
          promotedDreps: { mainnet: [{ id: CIP129 }] },
        },
      }),
    ).toEqual({
      blockedDreps: { mainnet: [CIP129] },
      promotedDreps: { mainnet: [] },
    });
  });

  // Both directions: with the blocked id in CIP-105 the promoted CIP-129 is
  // already canonical, so only the blocked-side reduction is exercised. The
  // reverse is what pins the promoted-side one.
  it.each([
    ['blocked in CIP-105, promoted in CIP-129', CIP105, CIP129],
    ['blocked in CIP-129, promoted in CIP-105', CIP129, CIP105],
  ])('blocks a DRep configured %s', (_label, blockedId, promotedId) => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: {
          promotedDreps: { mainnet: [{ id: promotedId }] },
          blockedDreps: { mainnet: [blockedId] },
        },
      }),
    ).toEqual({
      promotedDreps: { mainnet: [] },
      blockedDreps: { mainnet: [CIP129] },
    });
  });

  it('rewrites a promoted id into the encoding the directory carries', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: { promotedDreps: { mainnet: [{ id: CIP105 }] } },
      }),
    ).toEqual({ promotedDreps: { mainnet: [{ id: CIP129 }] } });
  });

  it('keeps one card per DRep when both encodings name it', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: {
          promotedDreps: { mainnet: [{ id: CIP129 }, { id: CIP105 }] },
        },
      }),
    ).toEqual({ promotedDreps: { mainnet: [{ id: CIP129 }] } });
  });

  it('drops a promoted entry whose id is not a string, so it cannot shadow the one behind it', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: { promotedDreps: { mainnet: [{ id: 42 }, { id: CIP105 }] } },
      }),
    ).toEqual({ promotedDreps: { mainnet: [{ id: CIP129 }] } });
  });

  // A hand-typed id is the likely ops mistake, and the earn-rewards target
  // reads only the first slot, so leaving it there suppressed the whole
  // vote-delegation offer.
  it('drops a promoted entry whose id is a mistyped string', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: {
          promotedDreps: {
            mainnet: [{ id: 'drep1notarealid' }, { id: CIP105 }],
          },
        },
      }),
    ).toEqual({ promotedDreps: { mainnet: [{ id: CIP129 }] } });
  });

  // Under `in` these passed as known networks and then resolved to an
  // Object.prototype method where a list was expected, which threw inside a
  // parser one caller runs during render and another inside an epic with no
  // error boundary. Built via JSON.parse so the key is a real own property.
  it.each(['constructor', 'toString', '__proto__'])(
    'drops a network key named after the Object.prototype member %s',
    key => {
      const payload = JSON.parse(
        `{"promotedDreps":{"${key}":[{"id":"${CIP129}"}]},` +
          `"blockedDreps":{"${key}":["${CIP129}"]}}`,
      ) as unknown;
      expect(parseGovernanceFeatureFlagPayload({ payload })).toEqual({
        promotedDreps: {},
        blockedDreps: {},
      });
    },
  );

  it('degrades a non-array promoted network entry to nothing configured', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: { promotedDreps: { mainnet: { id: CIP129 } } },
      }),
    ).toEqual({ promotedDreps: { mainnet: [] } });
  });

  // The shape that used to throw: a non-string id needs the same network to
  // carry a block list before the comparison is reached at all.
  it('handles a non-string promoted id on a network that also has a block list', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: {
          promotedDreps: { mainnet: [{ id: 42 }, { id: CIP129 }] },
          blockedDreps: { mainnet: [CIP129] },
        },
      }),
    ).toEqual({
      promotedDreps: { mainnet: [] },
      blockedDreps: { mainnet: [CIP129] },
    });
  });

  it('drops a promoted entry configured in upper case against a lower-case block list', () => {
    expect(
      parseGovernanceFeatureFlagPayload({
        payload: {
          promotedDreps: { mainnet: [{ id: CIP129.toUpperCase() }] },
          blockedDreps: { mainnet: [CIP129] },
        },
      }),
    ).toEqual({
      promotedDreps: { mainnet: [] },
      blockedDreps: { mainnet: [CIP129] },
    });
  });

  it('drops a promoted entry whose id is blocked on the same network', () => {
    const payload = {
      promotedDreps: {
        mainnet: [{ id: CIP129 }, { id: DREP_B }],
        preprod: [{ id: CIP129 }],
      },
      blockedDreps: { mainnet: [CIP129] },
    };
    expect(parseGovernanceFeatureFlagPayload({ payload })).toEqual({
      // Blocked beats promoted per network: the mainnet entry goes, the
      // preprod one (not blocked there) stays.
      promotedDreps: {
        mainnet: [{ id: DREP_B }],
        preprod: [{ id: CIP129 }],
      },
      blockedDreps: { mainnet: [CIP129] },
    });
  });
});

describe('describeGovernancePayloadIssues', () => {
  const REAL_ID = 'drep1ygr9tuapcanc3kpeyy4dc3vmrz9cfe5q7v9wj3x9j0ap3tswtre9j';

  it.each([
    ['no payload', undefined],
    ['a payload carrying neither key', { other: 1 }],
    ['an empty block list', { blockedDreps: { mainnet: [] } }],
    ['a usable block list', { blockedDreps: { mainnet: [REAL_ID] } }],
    // The parser reads a null section as nothing configured, so reporting
    // it would be an alarm about a payload that works.
    ['a null section', { blockedDreps: null }],
  ])('reports nothing for %s', (_label, payload) => {
    expect(describeGovernancePayloadIssues(payload)).toEqual([]);
  });

  it('reports a payload that is not an object', () => {
    expect(describeGovernancePayloadIssues('nope')).toEqual([
      'payload is not an object',
    ]);
  });

  // The likeliest real mistake: ops hand-type the key, and a typo reads as
  // "this network is deliberately unconfigured" everywhere else.
  it('reports every problem it finds, not just the first', () => {
    expect(
      describeGovernancePayloadIssues({
        blockedDreps: { mainet: [REAL_ID], preprod: 42, preview: ['nope'] },
      }),
    ).toEqual([
      'blockedDreps.mainet is not a known network',
      'blockedDreps.preprod is not an array',
      'blockedDreps.preview[0] is not a DRep id',
    ]);
  });

  // The parser drops these keys, so the validator has to name them or the
  // drop is the silent degradation it exists to end. Built via JSON.parse so
  // the key is a real own property, which `in` cannot tell from an inherited
  // one.
  it.each(['constructor', 'toString', '__proto__'])(
    'reports a network key named after the Object.prototype member %s',
    key => {
      const payload = JSON.parse(
        `{"blockedDreps":{"${key}":["${REAL_ID}"]}}`,
      ) as unknown;
      expect(describeGovernancePayloadIssues(payload)).toEqual([
        `blockedDreps.${key} is not a known network`,
      ]);
    },
  );

  it('reports a section that is not an object', () => {
    expect(
      describeGovernancePayloadIssues({ blockedDreps: ['drep1abc'] }),
    ).toEqual(['blockedDreps is not an object']);
  });

  it('checks promotedDreps on the same terms', () => {
    expect(
      describeGovernancePayloadIssues({
        promotedDreps: { mainnet: [{ id: 'drep1notarealid' }] },
      }),
    ).toEqual(['promotedDreps.mainnet[0] is not a DRep id']);
  });
});

describe('promotedNetworkKeyForChainId', () => {
  it('maps each known Cardano network', () => {
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Mainnet)).toBe(
      'mainnet',
    );
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Preprod)).toBe(
      'preprod',
    );
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Preview)).toBe(
      'preview',
    );
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Sanchonet)).toBe(
      'sanchonet',
    );
  });

  it('returns undefined for an unknown network magic', () => {
    expect(
      promotedNetworkKeyForChainId({
        networkId: 0,
        networkMagic: 999999,
      } as Cardano.ChainId),
    ).toBeUndefined();
  });
});

describe('pickPromotedInformation', () => {
  const info = { en: 'English', es: 'Spanish', ja: 'Japanese' };

  it('returns undefined when no information provided', () => {
    expect(pickPromotedInformation(undefined, 'en')).toBeUndefined();
  });

  it('returns the exact language match', () => {
    expect(pickPromotedInformation(info, 'es')).toBe('Spanish');
  });

  it('falls back to the 2-letter prefix', () => {
    expect(pickPromotedInformation(info, 'ja-JP')).toBe('Japanese');
  });

  it('falls back to English when the language is missing', () => {
    expect(pickPromotedInformation(info, 'fr')).toBe('English');
  });

  it('falls back to the first available when English is missing', () => {
    expect(pickPromotedInformation({ es: 'Spanish' }, 'fr')).toBe('Spanish');
  });
});

describe('getDelegationHealth', () => {
  const makeDRep = (overrides: Partial<DRepSummary> = {}): DRepSummary =>
    ({
      drepId: 'drep1aaa',
      cip105DrepId: 'drep1cip105',
      hex: '22aa',
      isActive: true,
      retired: false,
      expired: false,
      amount: '1',
      hasScript: false,
      ...overrides,
    } as DRepSummary);

  const dReps = [makeDRep()];

  it('returns not-delegated when drepId is undefined', () => {
    expect(
      getDelegationHealth({ drepId: undefined, dReps, listReady: true }),
    ).toBe('not-delegated');
  });

  it('returns delegated for sentinel drep ids regardless of the list', () => {
    expect(
      getDelegationHealth({
        drepId: 'drep_always_abstain',
        dReps: [],
        listReady: false,
      }),
    ).toBe('delegated');
    expect(
      getDelegationHealth({
        drepId: 'drep_always_no_confidence',
        dReps: [],
        listReady: false,
      }),
    ).toBe('delegated');
  });

  it('returns unknown for a specific drep before the list is ready', () => {
    expect(
      getDelegationHealth({ drepId: 'drep1aaa', dReps: [], listReady: false }),
    ).toBe('unknown');
  });

  it('returns delegated for an active listed drep', () => {
    expect(
      getDelegationHealth({ drepId: 'drep1aaa', dReps, listReady: true }),
    ).toBe('delegated');
  });

  it('returns drep-problem when the drep is retired', () => {
    expect(
      getDelegationHealth({
        drepId: 'drep1aaa',
        dReps: [makeDRep({ retired: true, isActive: false })],
        listReady: true,
      }),
    ).toBe('drep-problem');
  });

  it('returns drep-problem when the drep is expired', () => {
    expect(
      getDelegationHealth({
        drepId: 'drep1aaa',
        dReps: [makeDRep({ expired: true, isActive: false })],
        listReady: true,
      }),
    ).toBe('drep-problem');
  });

  it('returns drep-problem when the drep is absent from the ready list', () => {
    expect(
      getDelegationHealth({ drepId: 'drep1zzz', dReps, listReady: true }),
    ).toBe('drep-problem');
  });
});
