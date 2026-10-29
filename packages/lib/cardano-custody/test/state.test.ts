import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  addCustodyDevice,
  createInitialCustodyAccountState,
  CUSTODY_LOVELACE_ASSET,
  CUSTODY_MAX_GRANT_BATCH,
  CUSTODY_MAX_GRANTS,
  CUSTODY_MAX_REVOKED,
  findCustodyGrantsHeldByDevices,
  isCustodyGrantExpired,
  isCustodyLovelaceAsset,
  issueCustodyGrant,
  removeCustodyDevice,
  replaceCustodyGrant,
  revokeAllCustodyGrants,
  revokeCustodyGrant,
  sweepCustodyGrants,
} from '../src';
import {
  CUSTODY_MAX_DEVICES,
  CUSTODY_MAX_RECIPIENTS,
  findCustodyGrantViolations,
  findCustodyStateViolations,
} from '../src/state/rules';

import {
  AGENT_KEY,
  EXPIRY,
  fixtureGrants,
  grantedState,
  initialState,
  LOGIC_HASH,
  lovelaceScope,
  NOW,
  OTHER_DEVICE_KEY,
  OWNER_KEY,
  STRANGER_KEY,
  strangerRecipient,
  TOKEN_POLICY,
  tokenScope,
} from './fixtures';

import type {
  CustodyAccountState,
  CustodyGrant,
  CustodyRecipient,
  CustodyResult,
} from '../src';

const keyOf = (byte: number): HexBlob =>
  HexBlob(byte.toString(16).padStart(2, '0').repeat(28));

const recipientOf = (byte: number): CustodyRecipient => ({
  paymentCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash: keyOf(byte),
  },
});

const pointer = (slot: bigint) =>
  ({
    kind: 'pointer',
    slot,
    transactionIndex: 1n,
    certificateIndex: 2n,
  } as const);

const grantOf = (changes: Partial<CustodyGrant> = {}): CustodyGrant => ({
  slot: 0n,
  grantee: AGENT_KEY,
  generation: 0n,
  scope: lovelaceScope(),
  ...changes,
});

const valueOf = <T, E>(result: CustodyResult<T, E>): T => {
  if (!result.ok)
    throw new Error(`Unexpected failure: ${JSON.stringify(result.error)}`);
  return result.value;
};

const slotsUpTo = (count: number): bigint[] =>
  Array.from({ length: count }, (_, index) => BigInt(index));

describe('lovelace asset', () => {
  it('is the empty policy id with the empty asset name', () => {
    expect(isCustodyLovelaceAsset(CUSTODY_LOVELACE_ASSET)).toBe(true);
    expect(isCustodyLovelaceAsset(tokenScope().asset)).toBe(false);
    expect(
      isCustodyLovelaceAsset({
        policyId: TOKEN_POLICY,
        assetName: HexBlob(''),
      }),
    ).toBe(false);
  });
});

describe('findCustodyGrantViolations', () => {
  it('accepts lovelace and token grants with recipients', () => {
    for (const grant of fixtureGrants) {
      expect(findCustodyGrantViolations(grant)).toEqual([]);
    }
    expect(
      findCustodyGrantViolations(
        grantOf({
          slot: 2n ** 32n - 1n,
          generation: 7n,
          scope: {
            ...tokenScope(),
            asset: {
              policyId: TOKEN_POLICY,
              assetName: HexBlob('ab'.repeat(32)),
            },
          },
        }),
      ),
    ).toEqual([]);
  });

  it.each<[string, Partial<CustodyGrant>, unknown]>([
    [
      'a negative slot',
      { slot: -1n },
      { code: 'slot-out-of-range', slot: -1n },
    ],
    [
      'a slot four bytes cannot carry',
      { slot: 2n ** 32n },
      { code: 'slot-out-of-range', slot: 2n ** 32n },
    ],
    [
      'a 27-byte grantee',
      { grantee: HexBlob('cc'.repeat(27)) },
      { code: 'invalid-grantee-key-hash', slot: 0n },
    ],
    [
      'an upper-case grantee',
      { grantee: HexBlob('CC'.repeat(28)) },
      { code: 'invalid-grantee-key-hash', slot: 0n },
    ],
    [
      'a negative generation',
      { generation: -1n },
      { code: 'negative-generation', slot: 0n },
    ],
    [
      'a 27-byte policy id',
      {
        scope: {
          ...tokenScope(),
          asset: { policyId: HexBlob('99'.repeat(27)), assetName: HexBlob('') },
        },
      },
      { code: 'invalid-policy-id', slot: 0n },
    ],
    [
      'a 33-byte asset name',
      {
        scope: {
          ...tokenScope(),
          asset: {
            policyId: TOKEN_POLICY,
            assetName: HexBlob('ab'.repeat(33)),
          },
        },
      },
      { code: 'invalid-asset-name', slot: 0n },
    ],
    [
      'an asset name under the empty policy id',
      {
        scope: {
          ...lovelaceScope(),
          asset: { policyId: HexBlob(''), assetName: HexBlob('ab') },
        },
      },
      { code: 'invalid-asset-name', slot: 0n },
    ],
    [
      'a negative per call cap',
      { scope: { ...lovelaceScope(), perCallCap: -1n } },
      { code: 'negative-cap', field: 'perCallCap', slot: 0n },
    ],
    [
      'a negative cap',
      { scope: { ...lovelaceScope(), cap: -1n } },
      { code: 'negative-cap', field: 'cap', slot: 0n },
    ],
    [
      'a negative lovelace per call cap',
      { scope: { ...tokenScope(), lovelacePerCallCap: -1n } },
      { code: 'negative-cap', field: 'lovelacePerCallCap', slot: 0n },
    ],
    [
      'a negative lovelace cap',
      { scope: { ...tokenScope(), lovelaceCap: -1n } },
      { code: 'negative-cap', field: 'lovelaceCap', slot: 0n },
    ],
    [
      'a lovelace per call cap on a lovelace grant',
      { scope: { ...lovelaceScope(), lovelacePerCallCap: 1n } },
      { code: 'lovelace-grant-lovelace-caps', slot: 0n },
    ],
    [
      'a lovelace cap on a lovelace grant',
      { scope: { ...lovelaceScope(), lovelaceCap: 1n } },
      { code: 'lovelace-grant-lovelace-caps', slot: 0n },
    ],
    [
      'a zero expiry',
      { scope: { ...lovelaceScope(), expiresAt: 0n } },
      { code: 'non-positive-expiry', slot: 0n },
    ],
    [
      'nine recipients',
      {
        scope: lovelaceScope(
          Array.from({ length: CUSTODY_MAX_RECIPIENTS + 1 }, (_, index) =>
            recipientOf(index + 1),
          ),
        ),
      },
      { code: 'recipient-count', count: 9, slot: 0n },
    ],
    [
      'a recipient with a short credential hash',
      {
        scope: lovelaceScope([
          strangerRecipient,
          {
            paymentCredential: {
              type: Cardano.CredentialType.KeyHash,
              hash: HexBlob('ff'),
            },
          },
        ]),
      },
      { code: 'unrepresentable-recipient', recipientIndex: 1, slot: 0n },
    ],
    [
      'a repeated recipient',
      {
        scope: lovelaceScope([
          strangerRecipient,
          recipientOf(1),
          { ...strangerRecipient },
        ]),
      },
      { code: 'duplicate-recipient', recipientIndex: 2, slot: 0n },
    ],
  ])('names %s', (_, changes, violation) => {
    expect(findCustodyGrantViolations(grantOf(changes))).toEqual([violation]);
  });

  it('accepts eight distinct recipients, including the same key with another stake part', () => {
    const recipients = Array.from(
      { length: CUSTODY_MAX_RECIPIENTS - 2 },
      (_, index) => recipientOf(index + 1),
    );
    recipients.push(
      {
        ...recipientOf(1),
        stakeCredential: {
          kind: 'inline',
          credential: recipientOf(2).paymentCredential,
        },
      },
      { ...recipientOf(1), stakeCredential: pointer(1n) },
    );
    expect(
      findCustodyGrantViolations(grantOf({ scope: lovelaceScope(recipients) })),
    ).toEqual([]);
  });

  it('compares pointer recipients by every pointer field', () => {
    const recipients = [
      { ...recipientOf(1), stakeCredential: pointer(1n) },
      { ...recipientOf(1), stakeCredential: pointer(2n) },
      { ...recipientOf(1), stakeCredential: pointer(1n) },
    ];
    expect(
      findCustodyGrantViolations(grantOf({ scope: lovelaceScope(recipients) })),
    ).toEqual([{ code: 'duplicate-recipient', recipientIndex: 2, slot: 0n }]);
  });
});

describe('findCustodyStateViolations', () => {
  it('accepts the fixture states and every bound at its limit', () => {
    expect(findCustodyStateViolations(initialState)).toEqual([]);
    expect(findCustodyStateViolations(grantedState)).toEqual([]);
    expect(
      findCustodyStateViolations({
        logic: LOGIC_HASH,
        devices: Array.from({ length: CUSTODY_MAX_DEVICES }, (_, index) =>
          keyOf(index + 1),
        ),
        grantGeneration: 2n ** 32n,
        nextSlot: 2n ** 32n,
        revoked: slotsUpTo(CUSTODY_MAX_REVOKED),
        outstanding: BigInt(CUSTODY_MAX_GRANTS),
      }),
    ).toEqual([]);
  });

  it('holds the validator bounds', () => {
    expect([
      CUSTODY_MAX_DEVICES,
      CUSTODY_MAX_GRANTS,
      CUSTODY_MAX_REVOKED,
      CUSTODY_MAX_RECIPIENTS,
      CUSTODY_MAX_GRANT_BATCH,
    ]).toEqual([8, 16, 32, 8, 8]);
  });

  it.each<[string, CustodyAccountState, unknown[]]>([
    [
      'a 27-byte logic',
      { ...initialState, logic: HexBlob('2c'.repeat(27)) },
      [{ code: 'invalid-logic-hash', logic: '2c'.repeat(27) }],
    ],
    [
      'an upper-case logic',
      { ...initialState, logic: HexBlob(LOGIC_HASH.toUpperCase()) },
      [{ code: 'invalid-logic-hash', logic: LOGIC_HASH.toUpperCase() }],
    ],
    [
      'no device',
      { ...initialState, devices: [] },
      [{ code: 'device-count', count: 0 }],
    ],
    [
      'nine devices',
      {
        ...initialState,
        devices: Array.from({ length: CUSTODY_MAX_DEVICES + 1 }, (_, index) =>
          keyOf(index + 1),
        ),
      },
      [{ code: 'device-count', count: 9 }],
    ],
    [
      'a 27-byte device',
      { ...initialState, devices: [OWNER_KEY, HexBlob('ee'.repeat(27))] },
      [
        {
          code: 'invalid-device-key-hash',
          device: 'ee'.repeat(27),
          deviceIndex: 1,
        },
      ],
    ],
    [
      'a repeated device',
      { ...initialState, devices: [OWNER_KEY, OTHER_DEVICE_KEY, OWNER_KEY] },
      [{ code: 'duplicate-device', device: OWNER_KEY, deviceIndex: 2 }],
    ],
    [
      'a negative grant generation',
      { ...initialState, grantGeneration: -1n },
      [{ code: 'negative-grant-generation' }],
    ],
    [
      'a negative next slot',
      { ...initialState, nextSlot: -1n },
      [{ code: 'negative-next-slot' }],
    ],
    [
      'a negative outstanding count',
      { ...initialState, outstanding: -1n },
      [{ code: 'negative-outstanding' }],
    ],
    [
      'seventeen outstanding grants',
      { ...initialState, nextSlot: 17n, outstanding: 17n },
      [{ code: 'outstanding-count', count: 17n }],
    ],
    [
      'thirty-three revoked slots',
      {
        ...initialState,
        nextSlot: 40n,
        revoked: slotsUpTo(CUSTODY_MAX_REVOKED + 1),
      },
      [{ code: 'revoked-count', count: 33 }],
    ],
  ])('names %s', (_, state, violations) => {
    expect(findCustodyStateViolations(state)).toEqual(violations);
  });
});

describe('isCustodyGrantExpired', () => {
  const grant = grantOf();

  it('is expired from the instant the grant names', () => {
    expect(isCustodyGrantExpired(grant, Number(EXPIRY) - 1)).toBe(false);
    expect(isCustodyGrantExpired(grant, Number(EXPIRY) - 0.5)).toBe(false);
    expect(isCustodyGrantExpired(grant, Number(EXPIRY))).toBe(true);
    expect(isCustodyGrantExpired(grant, Number(EXPIRY) + 1)).toBe(true);
  });

  it('counts a non-finite clock as expired instead of throwing', () => {
    for (const now of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(isCustodyGrantExpired(grant, now)).toBe(true);
    }
  });
});

describe('findCustodyGrantsHeldByDevices', () => {
  it('lists grants whose grantee is a listed device', () => {
    const grants = [
      ...fixtureGrants,
      grantOf({ slot: 9n, grantee: OTHER_DEVICE_KEY }),
    ];
    expect(
      findCustodyGrantsHeldByDevices(
        { ...grantedState, devices: [OWNER_KEY, AGENT_KEY] },
        grants,
      ),
    ).toEqual(fixtureGrants);
    expect(findCustodyGrantsHeldByDevices(grantedState, grants)).toEqual([]);
  });
});

describe('createInitialCustodyAccountState', () => {
  it('lists only the creator under the logic, with generation zero and zero counters', () => {
    expect(createInitialCustodyAccountState(OWNER_KEY, LOGIC_HASH)).toEqual({
      ok: true,
      value: {
        logic: LOGIC_HASH,
        devices: [OWNER_KEY],
        grantGeneration: 0n,
        nextSlot: 0n,
        revoked: [],
        outstanding: 0n,
      },
    });
  });

  it('refuses a creator key hash that is not 28 bytes', () => {
    expect(createInitialCustodyAccountState('aa', LOGIC_HASH)).toEqual({
      ok: false,
      error: { code: 'invalid-device-key-hash', device: 'aa' },
    });
  });

  it('refuses a logic hash that is not 28 bytes', () => {
    expect(createInitialCustodyAccountState(OWNER_KEY, 'cc')).toEqual({
      ok: false,
      error: { code: 'invalid-logic-hash', logic: 'cc' },
    });
  });
});

describe('issueCustodyGrant', () => {
  // The fixture grants belong to AGENT_KEY, which can hold no other.
  const request = { grantee: STRANGER_KEY, scope: lovelaceScope(), now: NOW };

  it('takes the next slot under the current generation and counts the grant outstanding', () => {
    expect(issueCustodyGrant(grantedState, request, fixtureGrants)).toEqual({
      ok: true,
      value: {
        state: { ...grantedState, nextSlot: 4n, outstanding: 4n },
        grant: {
          slot: 3n,
          grantee: STRANGER_KEY,
          generation: 0n,
          scope: request.scope,
        },
      },
    });
  });

  it('issues under a bumped generation and keeps the revoked list', () => {
    const state: CustodyAccountState = {
      ...revokeAllCustodyGrants(grantedState),
      revoked: [7n],
    };
    const issued = valueOf(issueCustodyGrant(state, request, fixtureGrants));
    expect(issued.grant).toMatchObject({ slot: 3n, generation: 1n });
    expect(issued.state.revoked).toEqual([7n]);
  });

  it('refuses a grantee that holds a current grant', () => {
    expect(
      issueCustodyGrant(
        grantedState,
        { ...request, grantee: AGENT_KEY },
        fixtureGrants,
      ),
    ).toEqual({
      ok: false,
      error: { code: 'grantee-has-grant', grantee: AGENT_KEY, slot: 0n },
    });
  });

  it('counts an in-flight grant of a newer generation as held', () => {
    expect(
      issueCustodyGrant(grantedState, { ...request, grantee: AGENT_KEY }, [
        grantOf({ slot: 5n, generation: 1n }),
      ]),
    ).toMatchObject({
      ok: false,
      error: { code: 'grantee-has-grant', slot: 5n },
    });
  });

  it('issues to a grantee whose grants are revoked, superseded or expired', () => {
    const agent = { ...request, grantee: AGENT_KEY };
    const revoked = { ...grantedState, revoked: [0n, 1n, 2n] };
    expect(issueCustodyGrant(revoked, agent, fixtureGrants).ok).toBe(true);
    const bumped = revokeAllCustodyGrants(grantedState);
    expect(issueCustodyGrant(bumped, agent, fixtureGrants).ok).toBe(true);
    const expired = fixtureGrants.map(grant => ({
      ...grant,
      scope: { ...grant.scope, expiresAt: BigInt(NOW) },
    }));
    expect(issueCustodyGrant(grantedState, agent, expired).ok).toBe(true);
  });

  it('refuses a seventeenth outstanding grant, dead or alive', () => {
    const full = { ...grantedState, nextSlot: 20n, outstanding: 16n };
    expect(issueCustodyGrant(full, request, [])).toEqual({
      ok: false,
      error: { code: 'grant-limit', limit: CUSTODY_MAX_GRANTS },
    });
  });

  it('refuses once every slot a token name can carry is issued', () => {
    const exhausted = { ...grantedState, nextSlot: 2n ** 32n };
    expect(issueCustodyGrant(exhausted, request, [])).toEqual({
      ok: false,
      error: { code: 'slot-space-exhausted', nextSlot: 2n ** 32n },
    });
  });

  it('refuses a grant that breaks an authoring rule', () => {
    expect(
      issueCustodyGrant(
        initialState,
        { ...request, scope: { ...lovelaceScope(), lovelaceCap: 1n } },
        [],
      ),
    ).toEqual({
      ok: false,
      error: {
        code: 'invalid-grant',
        violations: [{ code: 'lovelace-grant-lovelace-caps', slot: 0n }],
      },
    });
    expect(
      issueCustodyGrant(
        initialState,
        { ...request, grantee: HexBlob('cc') },
        [],
      ),
    ).toMatchObject({ ok: false, error: { code: 'invalid-grant' } });
  });

  it('refuses a grant that has already expired', () => {
    expect(
      issueCustodyGrant(initialState, { ...request, now: Number(EXPIRY) }, []),
    ).toEqual({
      ok: false,
      error: { code: 'grant-expired', slot: 0n, expiresAt: EXPIRY },
    });
  });

  it('refuses a non-finite clock', () => {
    for (const now of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(issueCustodyGrant(initialState, { ...request, now }, [])).toEqual({
        ok: false,
        error: { code: 'invalid-now', now },
      });
    }
  });

  it('refuses to grant to a listed device', () => {
    expect(
      issueCustodyGrant(initialState, { ...request, grantee: OWNER_KEY }, []),
    ).toEqual({
      ok: false,
      error: { code: 'grantee-is-device', grantee: OWNER_KEY },
    });
  });
});

describe('revokeCustodyGrant', () => {
  it('appends the slot to the revoked list', () => {
    const state = { ...grantedState, revoked: [1n] };
    expect(revokeCustodyGrant(state, 2n, fixtureGrants)).toEqual({
      ok: true,
      value: { ...state, revoked: [1n, 2n] },
    });
  });

  it('revokes an expired grant, which a sweep then needs no time for', () => {
    const expired = fixtureGrants.map(grant => ({
      ...grant,
      scope: { ...grant.scope, expiresAt: 1n },
    }));
    expect(revokeCustodyGrant(grantedState, 0n, expired)).toMatchObject({
      ok: true,
      value: { revoked: [0n] },
    });
  });

  it('refuses a slot without a grant', () => {
    expect(revokeCustodyGrant(grantedState, 3n, fixtureGrants)).toEqual({
      ok: false,
      error: { code: 'grant-not-found', slot: 3n },
    });
  });

  it.each<[string, CustodyAccountState, CustodyGrant]>([
    ['revoked', { ...grantedState, revoked: [0n] }, fixtureGrants[0]],
    ['superseded', revokeAllCustodyGrants(grantedState), fixtureGrants[0]],
    ['future-generation', grantedState, grantOf({ generation: 1n })],
  ])('refuses a grant whose liveness is %s', (liveness, state, grant) => {
    expect(revokeCustodyGrant(state, 0n, [grant])).toEqual({
      ok: false,
      error: { code: 'grant-not-current', slot: 0n, liveness },
    });
  });

  it('refuses when the revoked list is full', () => {
    const state = {
      ...grantedState,
      nextSlot: 40n,
      revoked: slotsUpTo(CUSTODY_MAX_REVOKED).map(slot => slot + 3n),
    };
    expect(revokeCustodyGrant(state, 0n, fixtureGrants)).toEqual({
      ok: false,
      error: { code: 'revoked-list-full', limit: CUSTODY_MAX_REVOKED },
    });
  });
});

describe('replaceCustodyGrant', () => {
  const toppedUp = { ...tokenScope([strangerRecipient]), cap: 500n };

  it('revokes the old slot and issues the new grant in the next slot', () => {
    expect(
      replaceCustodyGrant(
        grantedState,
        { slot: 1n, grantee: AGENT_KEY, scope: toppedUp, now: NOW },
        [fixtureGrants[1]],
      ),
    ).toEqual({
      ok: true,
      value: {
        state: {
          ...grantedState,
          nextSlot: 4n,
          outstanding: 4n,
          revoked: [1n],
        },
        grant: {
          slot: 3n,
          grantee: AGENT_KEY,
          generation: 0n,
          scope: toppedUp,
        },
      },
    });
  });

  it('moves a grant to a key that holds no current grant', () => {
    const replaced = valueOf(
      replaceCustodyGrant(
        grantedState,
        { slot: 1n, grantee: STRANGER_KEY, scope: toppedUp, now: NOW },
        fixtureGrants,
      ),
    );
    expect(replaced.grant.grantee).toBe(STRANGER_KEY);
  });

  it('refuses to move a grant to a key that holds another current grant', () => {
    const grants = [
      fixtureGrants[0],
      grantOf({ slot: 1n, grantee: STRANGER_KEY }),
    ];
    expect(
      replaceCustodyGrant(
        grantedState,
        { slot: 1n, grantee: AGENT_KEY, scope: toppedUp, now: NOW },
        grants,
      ),
    ).toEqual({
      ok: false,
      error: { code: 'grantee-has-grant', grantee: AGENT_KEY, slot: 0n },
    });
  });

  it('checks the old grant like a revoke and the new one like an issue', () => {
    const request = { slot: 1n, grantee: AGENT_KEY, scope: toppedUp, now: NOW };
    const grants = [fixtureGrants[1]];
    expect(
      replaceCustodyGrant({ ...grantedState, revoked: [1n] }, request, grants),
    ).toMatchObject({ ok: false, error: { code: 'grant-not-current' } });
    expect(
      replaceCustodyGrant(grantedState, { ...request, slot: 5n }, grants),
    ).toMatchObject({ ok: false, error: { code: 'grant-not-found' } });
    expect(
      replaceCustodyGrant(
        { ...grantedState, outstanding: 16n },
        request,
        grants,
      ),
    ).toMatchObject({ ok: false, error: { code: 'grant-limit' } });
    expect(
      replaceCustodyGrant(
        grantedState,
        { ...request, grantee: OWNER_KEY },
        grants,
      ),
    ).toEqual({
      ok: false,
      error: { code: 'grantee-is-device', grantee: OWNER_KEY },
    });
    expect(
      replaceCustodyGrant(
        grantedState,
        { ...request, now: Number(EXPIRY) + 1 },
        grants,
      ),
    ).toMatchObject({ ok: false, error: { code: 'grant-expired' } });
    expect(
      replaceCustodyGrant(
        grantedState,
        { ...request, scope: { ...toppedUp, cap: -1n } },
        grants,
      ),
    ).toMatchObject({ ok: false, error: { code: 'invalid-grant' } });
  });
});

describe('revokeAllCustodyGrants', () => {
  it('moves the generation on and clears the revoked list', () => {
    expect(
      revokeAllCustodyGrants({
        ...grantedState,
        grantGeneration: 4n,
        revoked: [1n],
      }),
    ).toEqual({ ...grantedState, grantGeneration: 5n, revoked: [] });
  });
});

describe('sweepCustodyGrants', () => {
  it('burns revoked grants and prunes exactly their slots', () => {
    const state = { ...grantedState, revoked: [0n, 2n, 1n] };
    expect(
      sweepCustodyGrants(state, [fixtureGrants[0], fixtureGrants[1]], NOW),
    ).toEqual({
      ok: true,
      value: { state: { ...grantedState, revoked: [2n], outstanding: 1n } },
    });
  });

  it('burns superseded grants without touching the revoked list', () => {
    const state = { ...revokeAllCustodyGrants(grantedState), revoked: [9n] };
    expect(sweepCustodyGrants(state, fixtureGrants, NOW)).toEqual({
      ok: true,
      value: { state: { ...state, outstanding: 0n } },
    });
  });

  it('names the latest expiry among grants dead by expiry alone', () => {
    const state = { ...grantedState, revoked: [2n] };
    const grants = [
      fixtureGrants[2],
      grantOf({ slot: 0n, scope: { ...lovelaceScope(), expiresAt: 10n } }),
      grantOf({ slot: 1n, scope: { ...lovelaceScope(), expiresAt: 30n } }),
    ];
    expect(sweepCustodyGrants(state, grants, NOW)).toEqual({
      ok: true,
      value: {
        state: { ...grantedState, outstanding: 0n },
        startsAfter: 30n,
      },
    });
  });

  it('refuses a grant that expires at the current instant', () => {
    const expiring = grantOf({ scope: { ...lovelaceScope(), expiresAt: 5n } });
    expect(sweepCustodyGrants(grantedState, [expiring], 5)).toEqual({
      ok: false,
      error: { code: 'grant-not-dead', slot: 0n, liveness: 'expired' },
    });
    expect(sweepCustodyGrants(grantedState, [expiring], 6)).toMatchObject({
      ok: true,
      value: { startsAfter: 5n },
    });
  });

  it.each<[string, CustodyGrant, string]>([
    ['current', fixtureGrants[0], 'current'],
    [
      'of a future generation',
      grantOf({ generation: 1n }),
      'future-generation',
    ],
  ])('refuses a grant that is %s', (_, grant, liveness) => {
    expect(sweepCustodyGrants(grantedState, [grant], NOW)).toEqual({
      ok: false,
      error: { code: 'grant-not-dead', slot: 0n, liveness },
    });
  });

  it('sweeps at most eight grants at once', () => {
    const state = revokeAllCustodyGrants({
      ...grantedState,
      nextSlot: 9n,
      outstanding: 9n,
    });
    const grants = slotsUpTo(CUSTODY_MAX_GRANT_BATCH + 1).map(slot =>
      grantOf({ slot }),
    );
    expect(
      sweepCustodyGrants(state, grants.slice(0, CUSTODY_MAX_GRANT_BATCH), NOW),
    ).toMatchObject({ ok: true, value: { state: { outstanding: 1n } } });
    expect(sweepCustodyGrants(state, grants, NOW)).toEqual({
      ok: false,
      error: {
        code: 'sweep-batch-limit',
        count: 9,
        limit: CUSTODY_MAX_GRANT_BATCH,
      },
    });
  });

  it('refuses nothing to sweep, a slot twice and a broken clock', () => {
    const state = revokeAllCustodyGrants(grantedState);
    expect(sweepCustodyGrants(state, [], NOW)).toEqual({
      ok: false,
      error: { code: 'sweep-empty' },
    });
    expect(
      sweepCustodyGrants(state, [fixtureGrants[0], fixtureGrants[0]], NOW),
    ).toEqual({
      ok: false,
      error: { code: 'duplicate-grant-slot', slot: 0n },
    });
    expect(sweepCustodyGrants(state, fixtureGrants, Number.NaN)).toEqual({
      ok: false,
      error: { code: 'invalid-now', now: Number.NaN },
    });
  });
});

describe('addCustodyDevice', () => {
  it('appends a new device', () => {
    expect(
      addCustodyDevice(grantedState, OTHER_DEVICE_KEY, fixtureGrants),
    ).toEqual({
      ok: true,
      value: { ...grantedState, devices: [OWNER_KEY, OTHER_DEVICE_KEY] },
    });
  });

  it('lists the grantee of grants that are no longer current', () => {
    const revoked = { ...grantedState, revoked: [0n, 1n, 2n] };
    expect(addCustodyDevice(revoked, AGENT_KEY, fixtureGrants).ok).toBe(true);
    const bumped = revokeAllCustodyGrants(grantedState);
    expect(addCustodyDevice(bumped, AGENT_KEY, fixtureGrants).ok).toBe(true);
  });

  it.each<{
    name: string;
    state: CustodyAccountState;
    device: string;
    error: unknown;
  }>([
    {
      name: 'a 27-byte key hash',
      state: initialState,
      device: 'ee'.repeat(27),
      error: { code: 'invalid-device-key-hash', device: 'ee'.repeat(27) },
    },
    {
      name: 'an upper-case key hash',
      state: initialState,
      device: 'EE'.repeat(28),
      error: { code: 'invalid-device-key-hash', device: 'EE'.repeat(28) },
    },
    {
      name: 'a listed device',
      state: initialState,
      device: OWNER_KEY,
      error: { code: 'device-already-listed', device: OWNER_KEY },
    },
    {
      name: 'a ninth device',
      state: {
        ...initialState,
        devices: Array.from({ length: CUSTODY_MAX_DEVICES }, (_, index) =>
          keyOf(index + 1),
        ),
      },
      device: OTHER_DEVICE_KEY,
      error: { code: 'device-limit', limit: CUSTODY_MAX_DEVICES },
    },
    {
      name: 'the grantee of current grants, even expired ones',
      state: { ...grantedState, revoked: [1n] },
      device: AGENT_KEY,
      error: {
        code: 'device-is-grantee',
        device: AGENT_KEY,
        slots: [0n, 2n],
      },
    },
  ])('refuses $name', ({ state, device, error }) => {
    const expired = fixtureGrants.map(grant => ({
      ...grant,
      scope: { ...grant.scope, expiresAt: 1n },
    }));
    expect(addCustodyDevice(state, device, expired)).toEqual({
      ok: false,
      error,
    });
  });
});

describe('removeCustodyDevice', () => {
  const twoDevices: CustodyAccountState = {
    ...grantedState,
    devices: [OWNER_KEY, OTHER_DEVICE_KEY],
  };

  it('removes a listed device and leaves the grant bookkeeping alone', () => {
    expect(removeCustodyDevice(twoDevices, OWNER_KEY)).toEqual({
      ok: true,
      value: { ...grantedState, devices: [OTHER_DEVICE_KEY] },
    });
  });

  it('removes a device that breaks an authoring rule', () => {
    const shortDevice = HexBlob('ee'.repeat(27));
    expect(
      removeCustodyDevice(
        { ...initialState, devices: [OWNER_KEY, shortDevice] },
        shortDevice,
      ),
    ).toEqual({
      ok: true,
      value: initialState,
    });
  });

  it('refuses a device that is not listed', () => {
    expect(removeCustodyDevice(twoDevices, AGENT_KEY)).toEqual({
      ok: false,
      error: { code: 'device-not-listed', device: AGENT_KEY },
    });
  });

  it('refuses to remove the last device, or the last one that can sign', () => {
    expect(removeCustodyDevice(initialState, OWNER_KEY)).toEqual({
      ok: false,
      error: { code: 'last-device', device: OWNER_KEY },
    });
    expect(
      removeCustodyDevice(
        { ...initialState, devices: [OWNER_KEY, HexBlob('ee'.repeat(27))] },
        OWNER_KEY,
      ),
    ).toEqual({ ok: false, error: { code: 'last-device', device: OWNER_KEY } });
  });
});
