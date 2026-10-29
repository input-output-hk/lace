import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  CUSTODY_MAX_GRANTS,
  CUSTODY_MAX_REVOKED,
  custodyRecipientFromAddress,
  custodyRecipientToAddress,
  decodeCustodyAccountState,
  decodeCustodyGrant,
  decodeCustodyStateDevices,
  decodeCustodyStateLogic,
  encodeCustodyAccountRedeemer,
  encodeCustodyAccountState,
  encodeCustodyGrant,
  encodeCustodyLogicRedeemer,
  encodeCustodyMintRedeemer,
  encodeCustodyStakeRedeemer,
} from '../src';
import { constr, decodeResult, list } from '../src/codecs/plutus-data';
import { encodeRecipient } from '../src/codecs/recipient';
import {
  decodeCustodyAccountRedeemer,
  decodeCustodyMintRedeemer,
} from '../src/codecs/redeemers';
import { isCustodyReserveDatum } from '../src/codecs/reserve';
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
  fromCbor,
  grantedState,
  initialState,
  LOGIC_HASH,
  lovelaceScope,
  OTHER_DEVICE_KEY,
  OWNER_KEY,
  OWNER_TESTNET_REWARD_ACCOUNT,
  PREPROD_ADDRESS,
  strangerRecipient,
  TOKEN_POLICY,
  toCbor,
} from './fixtures';

import type {
  CustodyAccountRedeemer,
  CustodyAccountState,
  CustodyGrant,
  CustodyMintRedeemer,
  CustodyRecipient,
  CustodyScope,
} from '../src';

const decodedState = (data: Cardano.PlutusData): CustodyAccountState => {
  const result = decodeCustodyAccountState(data);
  if (!result.ok) throw new Error(`Not a state: ${result.error.path}`);
  return result.value;
};

const decodedGrant = (data: Cardano.PlutusData): CustodyGrant => {
  const result = decodeCustodyGrant(data);
  if (!result.ok) throw new Error(`Not a grant: ${result.error.path}`);
  return result.value;
};

const recipientOf = (address: string): CustodyRecipient => {
  const result = custodyRecipientFromAddress(
    Cardano.Address.fromString(address)!,
  );
  if (!result.ok) throw new Error(`${address} has no recipient form`);
  return result.value;
};

const bytes = (hex: string): Uint8Array => Buffer.from(hex, 'hex');

/** The fields of a valid state datum, in declaration order. */
const stateFields = (): Cardano.PlutusData[] => [
  bytes(LOGIC_HASH),
  list([bytes(OWNER_KEY)]),
  0n,
  0n,
  list([]),
  0n,
];

/** A valid state datum with one field replaced. */
const stateWith = (index: number, field: Cardano.PlutusData) => {
  const fields = stateFields();
  fields[index] = field;
  return constr(0, fields);
};

/** The datum fields of a scope, as the grant encoder writes them. */
const scopeFields = (scope: CustodyScope): Cardano.PlutusData[] =>
  (
    (
      encodeCustodyGrant({
        ...fixtureGrants[0],
        scope,
      }) as Cardano.ConstrPlutusData
    ).fields.items[3] as Cardano.ConstrPlutusData
  ).fields.items;

/** A valid grant datum with one field replaced. */
const grantWith = (index: number, field: Cardano.PlutusData) => {
  const fields = [
    ...(encodeCustodyGrant(fixtureGrants[0]) as Cardano.ConstrPlutusData).fields
      .items,
  ];
  fields[index] = field;
  return constr(0, fields);
};

/** A grant datum at slot 0 whose scope is the given data. */
const grantWithScope = (scope: Cardano.PlutusData) => grantWith(3, scope);

const failureOf = <T, E>(
  result: { ok: false; error: E } | { ok: true; value: T },
): E | undefined => (result.ok ? undefined : result.error);

describe('account state codec', () => {
  // Vectors pinned upstream in offchain/test/data.test.ts.
  it('encodes a fresh state as constructor 0 with the logic first and fields in declaration order', () => {
    const cbor = toCbor(encodeCustodyAccountState(initialState));
    expect(cbor).toBe(`d8799f581c${LOGIC_HASH}9f581c${OWNER_KEY}ff00008000ff`);
    expect(cbor).toHaveLength(70 * 2);
  });

  it('encodes counters and revoked slots, and round trips them through CBOR', () => {
    const state: CustodyAccountState = {
      ...grantedState,
      grantGeneration: 2n,
      revoked: [1n, 40n],
    };
    const cbor = toCbor(encodeCustodyAccountState(state));
    expect(cbor).toBe(
      `d8799f581c${LOGIC_HASH}9f581c${OWNER_KEY}ff02039f011828ff03ff`,
    );
    expect(decodedState(fromCbor(cbor))).toEqual(state);
  });

  it('builds fresh data, so an edited decoded state encodes the edit', () => {
    const original = toCbor(
      encodeCustodyAccountState({ ...grantedState, revoked: [1n] }),
    );
    const decoded = decodedState(fromCbor(original));
    const edited: CustodyAccountState = {
      ...decoded,
      devices: [...decoded.devices, OTHER_DEVICE_KEY],
      revoked: [],
    };
    const encoded = encodeCustodyAccountState(edited);
    expect(
      JSON.stringify(encoded, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ).not.toContain('"cbor"');
    expect(toCbor(encoded)).not.toBe(original);
    expect(decodedState(fromCbor(toCbor(encoded)))).toEqual(edited);
  });

  it('encodes the largest well-formed state with 32-bit counters in 449 bytes', () => {
    const counter = 2n ** 32n - 1n;
    const state: CustodyAccountState = {
      logic: LOGIC_HASH,
      devices: Array.from({ length: CUSTODY_MAX_DEVICES }, (_, index) =>
        HexBlob((index + 1).toString(16).padStart(2, '0').repeat(28)),
      ),
      grantGeneration: counter,
      nextSlot: counter,
      revoked: Array.from({ length: CUSTODY_MAX_REVOKED }, () => counter),
      outstanding: BigInt(CUSTODY_MAX_GRANTS),
    };
    expect(findCustodyStateViolations(state)).toEqual([]);
    expect(toCbor(encodeCustodyAccountState(state))).toHaveLength(449 * 2);
  });

  it('decodes values that break authoring rules, which the violations then mark', () => {
    const state: CustodyAccountState = {
      logic: HexBlob('bb'.repeat(27)),
      devices: [HexBlob('aa'.repeat(27))],
      grantGeneration: -1n,
      nextSlot: -2n,
      revoked: [-3n, 2n ** 70n],
      outstanding: 17n,
    };
    expect(
      decodedState(fromCbor(toCbor(encodeCustodyAccountState(state)))),
    ).toEqual(state);
  });

  it.each([
    ['not a constructor', 0n, ''],
    ['another constructor', constr(1, stateFields()), ''],
    [
      'the five fields of a state without a logic',
      constr(0, [list([bytes(OWNER_KEY)]), 0n, 0n, list([]), 0n]),
      '',
    ],
    ['seven fields', constr(0, [...stateFields(), 0n]), ''],
    ['a logic that is not bytes', stateWith(0, list([])), 'logic'],
    ['devices that are not a list', stateWith(1, 0n), 'devices'],
    ['a device that is not bytes', stateWith(1, list([0n])), 'devices[0]'],
    [
      'a generation that is not an integer',
      stateWith(2, bytes('00')),
      'grantGeneration',
    ],
    ['a next slot that is not an integer', stateWith(3, list([])), 'nextSlot'],
    ['revoked slots that are not a list', stateWith(4, 0n), 'revoked'],
    [
      'a revoked slot that is not an integer',
      stateWith(4, list([1n, list([])])),
      'revoked[1]',
    ],
    [
      'an outstanding count that is not an integer',
      stateWith(5, bytes('00')),
      'outstanding',
    ],
  ])('refuses a state with %s', (_, data, path) => {
    expect(failureOf(decodeCustodyAccountState(data))).toMatchObject({
      code: 'malformed-data',
      path,
    });
  });
});

describe('decodeCustodyStateLogic', () => {
  it('reads the logic of a state', () => {
    expect(
      decodeCustodyStateLogic(
        fromCbor(toCbor(encodeCustodyAccountState(grantedState))),
      ),
    ).toEqual({ ok: true, value: LOGIC_HASH });
  });

  it('reads the first field whatever follows it', () => {
    const otherLogic = HexBlob('69'.repeat(28));
    for (const fields of [
      [bytes(otherLogic)],
      [bytes(otherLogic), 7n],
      [bytes(otherLogic), 7n, list([]), bytes('ab'), 1n, 2n, 3n],
    ]) {
      expect(decodeCustodyStateLogic(constr(0, fields))).toEqual({
        ok: true,
        value: otherLogic,
      });
    }
  });

  it.each([
    ['not a constructor', 0n, ''],
    ['another constructor', constr(1, stateFields()), ''],
    ['no field', constr(0), ''],
    ['a logic that is not bytes', constr(0, [0n]), 'logic'],
    [
      'the device list a state without a logic starts with',
      constr(0, [list([bytes(OWNER_KEY)]), 0n, 0n, list([]), 0n]),
      'logic',
    ],
  ])('refuses %s', (_, data, path) => {
    expect(failureOf(decodeCustodyStateLogic(data))).toMatchObject({
      code: 'malformed-data',
      path,
    });
  });
});

describe('decodeCustodyStateDevices', () => {
  it('reads the devices of a state', () => {
    expect(
      decodeCustodyStateDevices(
        fromCbor(
          toCbor(
            encodeCustodyAccountState({
              ...grantedState,
              devices: [OWNER_KEY, OTHER_DEVICE_KEY],
            }),
          ),
        ),
      ),
    ).toEqual({ ok: true, value: [OWNER_KEY, OTHER_DEVICE_KEY] });
  });

  it('reads the second field whatever surrounds it', () => {
    for (const fields of [
      [bytes(LOGIC_HASH), list([bytes(OWNER_KEY)])],
      [0n, list([bytes(OWNER_KEY)]), list([]), 0n],
      [...stateFields(), bytes('00')],
    ]) {
      expect(decodeCustodyStateDevices(constr(0, fields))).toEqual({
        ok: true,
        value: [OWNER_KEY],
      });
    }
  });

  it.each([
    ['not a constructor', 0n, ''],
    ['another constructor', constr(1, stateFields()), ''],
    ['no field', constr(0), ''],
    ['a logic alone', constr(0, [bytes(LOGIC_HASH)]), ''],
    ['devices that are not a list', stateWith(1, 0n), 'devices'],
    ['a device that is not bytes', stateWith(1, list([0n])), 'devices[0]'],
    [
      'the generation a state without a logic keeps second',
      constr(0, [list([bytes(OWNER_KEY)]), 0n, 0n, list([]), 0n]),
      'devices',
    ],
  ])('refuses %s', (_, data, path) => {
    expect(failureOf(decodeCustodyStateDevices(data))).toMatchObject({
      code: 'malformed-data',
      path,
    });
  });
});

describe('grant codec', () => {
  it('encodes the slot, the grantee, the generation and the scope in order', () => {
    const cbor = toCbor(encodeCustodyGrant(fixtureGrants[0]));
    expect(cbor).toBe(
      `d8799f00581c${AGENT_KEY}00d8799fd8799f4040ff1a009896801a00e4e1c000001b000001a3185c500080ffff`,
    );
    expect(cbor).toHaveLength(68 * 2);
    expect(
      toCbor(
        encodeCustodyGrant({ ...fixtureGrants[0], slot: 7n, generation: 3n }),
      ).startsWith(`d8799f07581c${AGENT_KEY}03d8799f`),
    ).toBe(true);
  });

  it('encodes lovelace as the empty asset class', () => {
    expect(
      toCbor(constr(0, scopeFields(lovelaceScope()))).startsWith(
        'd8799fd8799f4040ff',
      ),
    ).toBe(true);
  });

  it('encodes the lovelace per call cap before the lovelace cap', () => {
    const scope = {
      ...lovelaceScope(),
      lovelacePerCallCap: 1n,
      lovelaceCap: 2n,
    };
    expect(toCbor(constr(0, scopeFields(scope)))).toBe(
      'd8799fd8799f4040ff1a009896801a00e4e1c001021b000001a3185c500080ff',
    );
  });

  it('round trips every fixture grant through CBOR', () => {
    for (const grant of fixtureGrants) {
      expect(decodedGrant(fromCbor(toCbor(encodeCustodyGrant(grant))))).toEqual(
        grant,
      );
    }
  });

  it('round trips every recipient form', () => {
    const grant: CustodyGrant = {
      ...fixtureGrants[0],
      scope: lovelaceScope([
        strangerRecipient,
        recipientOf(PREPROD_ADDRESS),
        {
          paymentCredential: {
            type: Cardano.CredentialType.ScriptHash,
            hash: HexBlob('12'.repeat(28)),
          },
          stakeCredential: {
            kind: 'pointer',
            slot: 12_345n,
            transactionIndex: 6n,
            certificateIndex: 7n,
          },
        },
      ]),
    };
    expect(decodedGrant(fromCbor(toCbor(encodeCustodyGrant(grant))))).toEqual(
      grant,
    );
  });

  it('decodes values that break authoring rules, which the violations then mark', () => {
    const grant: CustodyGrant = {
      slot: -1n,
      grantee: HexBlob(''),
      generation: -1n,
      scope: { ...lovelaceScope(), lovelaceCap: 5n },
    };
    expect(decodedGrant(encodeCustodyGrant(grant))).toEqual(grant);
  });

  it('encodes a token grant with eight base-address recipients and 64-bit caps in 803 bytes', () => {
    const counter = 2n ** 32n - 1n;
    const keyHash = (byte: number) =>
      HexBlob(byte.toString(16).padStart(2, '0').repeat(28));
    const grant: CustodyGrant = {
      slot: counter,
      grantee: AGENT_KEY,
      generation: counter,
      scope: {
        asset: { policyId: TOKEN_POLICY, assetName: HexBlob('ee'.repeat(32)) },
        perCallCap: counter * counter,
        cap: counter * counter,
        lovelacePerCallCap: counter * counter,
        lovelaceCap: counter * counter,
        expiresAt: EXPIRY,
        recipients: Array.from({ length: CUSTODY_MAX_RECIPIENTS }, (_, index) =>
          recipientOf(
            Cardano.BaseAddress.fromCredentials(
              Cardano.NetworkId.Testnet,
              {
                type: Cardano.CredentialType.KeyHash,
                hash: Hash28ByteBase16(keyHash(index + 1)),
              },
              {
                type: Cardano.CredentialType.KeyHash,
                hash: Hash28ByteBase16(keyHash(index + 9)),
              },
            )
              .toAddress()
              .toBech32(),
          ),
        ),
      },
    };
    expect(findCustodyGrantViolations(grant)).toEqual([]);
    expect(toCbor(encodeCustodyGrant(grant))).toHaveLength(803 * 2);
  });

  it('refuses a scope with six fields', () => {
    const sixFields = fromCbor(
      'd8799fd8799f4040ff1a009896801a00e4e1c0021b000001a3185c500080ff',
    );
    expect(decodeCustodyGrant(grantWithScope(sixFields))).toEqual({
      ok: false,
      error: {
        code: 'malformed-data',
        path: 'scope',
        expected: 'a scope as constructor 0 with 7 fields',
      },
    });
  });

  it.each([
    ['not a constructor', 0n, ''],
    ['another constructor', constr(1, [0n, bytes(AGENT_KEY), 0n, 0n]), ''],
    ['two fields', constr(0, [0n, bytes(AGENT_KEY)]), ''],
    [
      'three fields of a slot, a grantee and a scope',
      constr(0, [
        0n,
        bytes(AGENT_KEY),
        constr(0, scopeFields(lovelaceScope())),
      ]),
      '',
    ],
    ['a slot that is not an integer', grantWith(0, bytes('00')), 'slot'],
    ['a grantee that is not bytes', grantWith(1, constr(0)), 'grantee'],
    [
      'a generation that is not an integer',
      grantWith(2, list([])),
      'generation',
    ],
    ['a scope that is not a constructor', grantWith(3, 0n), 'scope'],
  ])('refuses a grant with %s', (_, data, path) => {
    expect(failureOf(decodeCustodyGrant(data))).toMatchObject({
      code: 'malformed-data',
      path,
    });
  });

  it('names the failing field of a nested scope', () => {
    const validFields = scopeFields(lovelaceScope());
    const cases: [number, Cardano.PlutusData, string][] = [
      [0, constr(0, [bytes(''), 0n]), 'scope.asset.assetName'],
      [0, constr(0, [0n, bytes('')]), 'scope.asset.policyId'],
      [1, bytes(''), 'scope.perCallCap'],
      [2, bytes(''), 'scope.cap'],
      [3, bytes(''), 'scope.lovelacePerCallCap'],
      [4, bytes(''), 'scope.lovelaceCap'],
      [5, bytes(''), 'scope.expiresAt'],
      [6, 0n, 'scope.recipients'],
    ];
    for (const [index, field, path] of cases) {
      const fields = [...validFields];
      fields[index] = field;
      expect(
        failureOf(decodeCustodyGrant(grantWithScope(constr(0, fields)))),
      ).toMatchObject({ path });
    }
  });

  it('lets errors other than a shape mismatch through', () => {
    expect(() =>
      decodeResult(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
  });
});

describe('encoding hex fields', () => {
  it.each<[string, CustodyAccountState]>([
    [
      'a logic that is not hex',
      { ...initialState, logic: 'zz'.repeat(28) as HexBlob },
    ],
    ['a logic of an odd length', { ...initialState, logic: HexBlob('abc') }],
    [
      'a device that is not hex',
      { ...initialState, devices: ['zz'.repeat(28) as HexBlob] },
    ],
    [
      'a device of an odd length',
      { ...initialState, devices: [HexBlob('abc')] },
    ],
  ])('refuses a state with %s instead of encoding other bytes', (_, state) => {
    expect(() => encodeCustodyAccountState(state)).toThrow(
      'expected hex of whole bytes',
    );
  });

  it.each<[string, CustodyGrant]>([
    [
      'an asset name of an odd length',
      {
        ...fixtureGrants[0],
        scope: {
          ...lovelaceScope(),
          asset: { policyId: TOKEN_POLICY, assetName: HexBlob('abc') },
        },
      },
    ],
    [
      'a recipient credential hash that is not hex',
      {
        ...fixtureGrants[0],
        scope: lovelaceScope([
          {
            paymentCredential: {
              type: Cardano.CredentialType.KeyHash,
              hash: 'zz'.repeat(28) as HexBlob,
            },
          },
        ]),
      },
    ],
    [
      'a grantee that is not hex',
      { ...fixtureGrants[0], grantee: 'zz'.repeat(28) as HexBlob },
    ],
  ])('refuses a grant with %s instead of encoding other bytes', (_, grant) => {
    expect(() => encodeCustodyGrant(grant)).toThrow(
      'expected hex of whole bytes',
    );
  });

  it('encodes upper-case hex as the bytes it names', () => {
    const upperCase = HexBlob(OWNER_KEY.toUpperCase());
    expect(
      toCbor(
        encodeCustodyAccountState({ ...initialState, devices: [upperCase] }),
      ),
    ).toBe(toCbor(encodeCustodyAccountState(initialState)));
  });
});

describe('recipient codec', () => {
  const recipientDecodeFailure = (data: Cardano.PlutusData) => {
    const fields = scopeFields(lovelaceScope());
    fields[6] = list([data]);
    return failureOf(decodeCustodyGrant(grantWithScope(constr(0, fields))));
  };
  const hash = bytes('ff'.repeat(28));

  it('encodes key and script credentials without a network id', () => {
    expect(
      toCbor(encodeRecipient(recipientOf(PREPROD_ADDRESS))).startsWith(
        'd8799fd87a9f581c',
      ),
    ).toBe(true);
    expect(
      toCbor(encodeRecipient(strangerRecipient)).endsWith('d87a80ff'),
    ).toBe(true);
  });

  it.each([
    [
      'an address constructor other than 0',
      constr(1, [constr(0, [hash]), constr(1)]),
      'scope.recipients[0]',
    ],
    // Upstream reads any non-zero credential index as a script credential.
    [
      'a credential constructor other than 0 or 1',
      constr(0, [constr(2, [hash]), constr(1)]),
      'scope.recipients[0].paymentCredential',
    ],
    [
      'a credential that is not a constructor',
      constr(0, [hash, constr(1)]),
      'scope.recipients[0].paymentCredential',
    ],
    [
      'a credential with two fields',
      constr(0, [constr(0, [hash, hash]), constr(1)]),
      'scope.recipients[0].paymentCredential',
    ],
    [
      'a credential hash that is not bytes',
      constr(0, [constr(0, [0n]), constr(1)]),
      'scope.recipients[0].paymentCredential.hash',
    ],
    [
      'an option constructor other than 0 or 1',
      constr(0, [constr(0, [hash]), constr(2)]),
      'scope.recipients[0].stakeCredential',
    ],
    [
      'None with a field',
      constr(0, [constr(0, [hash]), constr(1, [0n])]),
      'scope.recipients[0].stakeCredential',
    ],
    [
      'Some without a field',
      constr(0, [constr(0, [hash]), constr(0)]),
      'scope.recipients[0].stakeCredential',
    ],
    [
      'a stake credential constructor other than 0 or 1',
      constr(0, [constr(0, [hash]), constr(0, [constr(2, [])])]),
      'scope.recipients[0].stakeCredential',
    ],
    [
      'an inline stake credential with two fields',
      constr(0, [
        constr(0, [hash]),
        constr(0, [constr(0, [constr(0, [hash]), 0n])]),
      ]),
      'scope.recipients[0].stakeCredential',
    ],
    [
      'a pointer with two fields',
      constr(0, [constr(0, [hash]), constr(0, [constr(1, [0n, 0n])])]),
      'scope.recipients[0].stakeCredential',
    ],
    [
      'a pointer slot that is not an integer',
      constr(0, [constr(0, [hash]), constr(0, [constr(1, [hash, 0n, 0n])])]),
      'scope.recipients[0].stakeCredential.slot',
    ],
    [
      'a pointer transaction index that is not an integer',
      constr(0, [constr(0, [hash]), constr(0, [constr(1, [0n, hash, 0n])])]),
      'scope.recipients[0].stakeCredential.transactionIndex',
    ],
    [
      'a pointer certificate index that is not an integer',
      constr(0, [constr(0, [hash]), constr(0, [constr(1, [0n, 0n, hash])])]),
      'scope.recipients[0].stakeCredential.certificateIndex',
    ],
  ])('refuses %s', (_, data, path) => {
    expect(recipientDecodeFailure(data)).toMatchObject({
      code: 'malformed-data',
      path,
    });
  });

  it('converts base, enterprise and pointer addresses on the requested network', () => {
    const pointer = Cardano.PointerAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      {
        type: Cardano.CredentialType.KeyHash,
        hash: OWNER_KEY as string as Cardano.Credential['hash'],
      },
      {
        slot: 12_345n,
        txIndex: Cardano.TxIndex(6),
        certIndex: Cardano.CertIndex(7),
      },
    ).toAddress();
    const enterprise = Cardano.EnterpriseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      {
        type: Cardano.CredentialType.KeyHash,
        hash: OWNER_KEY as string as Cardano.Credential['hash'],
      },
    ).toAddress();
    for (const address of [
      Cardano.Address.fromBech32(PREPROD_ADDRESS),
      enterprise,
      pointer,
    ]) {
      const recipient = custodyRecipientFromAddress(address);
      expect(recipient.ok).toBe(true);
      if (!recipient.ok) continue;
      const testnet = custodyRecipientToAddress(
        recipient.value,
        Cardano.NetworkId.Testnet,
      );
      expect(testnet.ok && testnet.value.toBytes()).toBe(address.toBytes());
      const mainnet = custodyRecipientToAddress(
        recipient.value,
        Cardano.NetworkId.Mainnet,
      );
      expect(mainnet.ok && mainnet.value.getNetworkId()).toBe(
        Cardano.NetworkId.Mainnet,
      );
      expect(mainnet.ok && custodyRecipientFromAddress(mainnet.value)).toEqual(
        recipient,
      );
    }
  });

  it('renders a pointer recipient whose payment credential is a script', () => {
    const recipient: CustodyRecipient = {
      paymentCredential: {
        type: Cardano.CredentialType.ScriptHash,
        hash: OWNER_KEY,
      },
      stakeCredential: {
        kind: 'pointer',
        slot: 12_345n,
        transactionIndex: 6n,
        certificateIndex: 7n,
      },
    };
    const address = custodyRecipientToAddress(
      recipient,
      Cardano.NetworkId.Testnet,
    );
    expect(address.ok && address.value.getType()).toBe(
      Cardano.AddressType.PointerScript,
    );
    expect(
      address.ok &&
        custodyRecipientFromAddress(
          Cardano.Address.fromBech32(address.value.toBech32()),
        ),
    ).toEqual({ ok: true, value: recipient });
  });

  it('has no recipient form for reward and Byron addresses', () => {
    const reward = Cardano.Address.fromBech32(OWNER_TESTNET_REWARD_ACCOUNT);
    expect(custodyRecipientFromAddress(reward)).toEqual({
      ok: false,
      error: {
        code: 'unsupported-recipient-address',
        addressType: Cardano.AddressType.RewardScript,
      },
    });
    const byron = Cardano.Address.fromBase58(
      'Ae2tdPwUPEZFRbyhz3cpfC2CumGzNkFBN2L42rcUc2yjQpEkxDbkPodpMAi',
    );
    expect(custodyRecipientFromAddress(byron)).toMatchObject({
      ok: false,
      error: { addressType: Cardano.AddressType.Byron },
    });
  });

  it('refuses to render a recipient Cardano cannot encode', () => {
    const shortHash = HexBlob('aa'.repeat(27));
    const unrepresentable: CustodyRecipient[] = [
      {
        paymentCredential: {
          type: Cardano.CredentialType.KeyHash,
          hash: shortHash,
        },
      },
      {
        paymentCredential: strangerRecipient.paymentCredential,
        stakeCredential: {
          kind: 'inline',
          credential: { type: Cardano.CredentialType.KeyHash, hash: shortHash },
        },
      },
      {
        paymentCredential: strangerRecipient.paymentCredential,
        stakeCredential: {
          kind: 'pointer',
          slot: -1n,
          transactionIndex: 0n,
          certificateIndex: 0n,
        },
      },
      {
        paymentCredential: strangerRecipient.paymentCredential,
        stakeCredential: {
          kind: 'pointer',
          slot: 0n,
          transactionIndex: 2n ** 53n,
          certificateIndex: 0n,
        },
      },
      {
        paymentCredential: strangerRecipient.paymentCredential,
        stakeCredential: {
          kind: 'pointer',
          slot: 0n,
          transactionIndex: 0n,
          certificateIndex: -1n,
        },
      },
    ];
    for (const recipient of unrepresentable) {
      expect(
        custodyRecipientToAddress(recipient, Cardano.NetworkId.Testnet),
      ).toEqual({
        ok: false,
        error: { code: 'unrepresentable-recipient', recipient },
      });
    }
  });
});

describe('redeemer codecs', () => {
  const accountRedeemers: [CustodyAccountRedeemer['kind'], string][] = [
    ['device', 'd87980'],
    ['spendWithGrant', 'd87a80'],
    ['sweepGrant', 'd87b80'],
    ['fund', 'd87c80'],
  ];
  const mintRedeemers: [CustodyMintRedeemer['kind'], string][] = [
    ['createAccount', 'd87980'],
    ['issueGrants', 'd87a80'],
    ['burnGrants', 'd87b80'],
  ];

  it.each(accountRedeemers)(
    'encodes and decodes the %s account redeemer as %s',
    (kind, cbor) => {
      expect(toCbor(encodeCustodyAccountRedeemer({ kind }))).toBe(cbor);
      expect(decodeCustodyAccountRedeemer(fromCbor(cbor))).toEqual({
        ok: true,
        value: { kind },
      });
    },
  );

  it.each([
    ['constructor 4', constr(4)],
    ['Device with a field', constr(0, [0n])],
    ['SpendWithGrant with a slot', fromCbor('d87a9f01ff')],
    ['SweepGrant with a field', constr(2, [0n])],
    ['Fund with a field', constr(3, [0n])],
    ['an integer', 0n],
  ])('refuses an account redeemer that is %s', (_, data) => {
    expect(failureOf(decodeCustodyAccountRedeemer(data))).toMatchObject({
      code: 'malformed-data',
      path: '',
    });
  });

  it.each(mintRedeemers)(
    'encodes and decodes the %s mint redeemer as %s',
    (kind, cbor) => {
      expect(toCbor(encodeCustodyMintRedeemer({ kind }))).toBe(cbor);
      expect(decodeCustodyMintRedeemer(fromCbor(cbor))).toEqual({
        ok: true,
        value: { kind },
      });
    },
  );

  it.each([
    ['constructor 3', constr(3)],
    ['CreateAccount with a field', constr(0, [0n])],
    ['IssueGrants with a field', constr(1, [0n])],
    ['BurnGrants with a field', constr(2, [0n])],
    ['an integer', 0n],
  ])('refuses a mint redeemer that is %s', (_, data) => {
    expect(failureOf(decodeCustodyMintRedeemer(data))).toMatchObject({
      code: 'malformed-data',
      path: '',
    });
  });

  it('encodes Operate as constructor 0 with no fields', () => {
    expect(toCbor(encodeCustodyStakeRedeemer())).toBe('d87980');
  });

  it('encodes Run as constructor 0 with no fields', () => {
    expect(toCbor(encodeCustodyLogicRedeemer())).toBe('d87980');
  });
});

describe('isCustodyReserveDatum', () => {
  it('recognises the reserve datum d87980, built or read from chain', () => {
    expect(isCustodyReserveDatum(constr(0))).toBe(true);
    expect(isCustodyReserveDatum(fromCbor('d87980'))).toBe(true);
  });

  it.each([
    [
      'constructor 0 spelled with an indefinite field list',
      fromCbor('d8799fff'),
    ],
    ['another constructor', constr(1)],
    ['constructor 0 with a field', constr(0, [0n])],
    ['an integer', 0n],
    ['bytes', bytes('d87980')],
  ])('refuses %s', (_, datum) => {
    expect(isCustodyReserveDatum(datum)).toBe(false);
  });
});
