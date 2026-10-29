/**
 * The rules below are the ones the contract asserts when a grant is
 * issued, applied here to a requested scope before anything is signed
 * over it. They run without the contract module, so the signer page can
 * hold a scope to them before it asks consent. Each rule is also run
 * against the compiled issue circuit in process, so the mirror and the
 * contract are shown to refuse the same scopes for the same reason.
 */
import {
  GrantScopeInvalidError,
  TokenColor,
  UseCounter,
} from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { jubjub } from '@noble/curves/misc.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { pureCircuits } from '../../src/acc/acc-module';
import { ISSUE_GRANT_CIRCUIT } from '../../src/acc/grant-circuits';
import {
  assertIssueRules,
  circuitScope,
  granteePoint,
} from '../../src/acc/grant-rules';
import { scopeArgs } from '../../src/acc/grants';

import { AccountSim } from './account-sim';

import type { GrantCircuitScope } from '../../src/acc/grant-rules';
import type { GrantScopeInput } from '@lace-contract/passport';

const RECIPIENT_HEX = 'cd'.repeat(32);
const CALLER_HEX = 'ef'.repeat(32);
const NIGHT = TokenColor('00'.repeat(32));
const ZERO32 = new Uint8Array(32);

const GRANTEE_SECRET = 55n;
const granteePk = jubjub.Point.BASE.multiply(GRANTEE_SECRET);

/** The 32-byte compressed form a consumer supplies a grantee key in. */
const GRANTEE_PUBLIC_KEY = HexBytes.fromByteArray(granteePk.toBytes());

/** The identity (0, 1), compressed: y = 1 little-endian with x even. */
const IDENTITY_PUBLIC_KEY = `01${'00'.repeat(31)}`;

const K256_GRANTEE_SECRET = 0x5eed_c0ffeen;

/** The 33-byte SEC1 compressed form an OWS secp256k1 key is supplied in. */
const K256_GRANTEE_PUBLIC_KEY = HexBytes.fromByteArray(
  secp256k1.Point.BASE.multiply(K256_GRANTEE_SECRET).toBytes(true),
);

/** The point (0, -1) of order two, compressed. */
const ORDER_TWO_PUBLIC_KEY =
  '00000000fffffffffe5bfeff02a4bd5305d8a10908d83933487d9d2953a7ed73';

const spendScope: GrantScopeInput = {
  grantee: { scheme: 'jubjub-schnorr', publicKey: GRANTEE_PUBLIC_KEY },
  operations: ['withdraw-unshielded'],
  color: NIGHT,
  recipient: { kind: 'any' },
  maxCoinValue: '300',
  perCallCap: '300',
  cap: '450',
  expiresAt: null,
};

/**
 * One scope per issue rule the contract asserts, each breaking that rule
 * alone over the spend scope, with the message the contract asserts it
 * under. Lace's own message for each rule carries the contract's.
 */
const CONTRACT_RULES: [string, Partial<GrantCircuitScope>, string][] = [
  [
    'an empty scope',
    {
      opWithdrawUnshielded: false,
      color: ZERO32,
      maxCoinValue: 0n,
      perCallCap: 0n,
      cap: 0n,
    },
    'empty scope',
  ],
  [
    'a read-only scope with a caller',
    {
      opWithdrawUnshielded: false,
      read: true,
      readPkHash: new Uint8Array(32).fill(1),
      maxCoinValue: 0n,
      perCallCap: 0n,
      cap: 0n,
      caller: new Uint8Array(32).fill(2),
    },
    'read-only grant cannot restrict caller',
  ],
  [
    'a shielded spend without read',
    { opWithdrawShielded: true },
    'shielded spend requires read',
  ],
  [
    'a per-call cap above the cap',
    { perCallCap: 451n },
    'per-call cap above cap',
  ],
  ['a spend without cap', { cap: 0n, perCallCap: 0n }, 'spend without cap'],
  [
    'a coin bound below the per-call cap',
    { maxCoinValue: 299n },
    'coin bound below per-call cap',
  ],
  [
    'a read grant without a key hash',
    { read: true },
    'read without delegate key',
  ],
  ['a window length', { windowLen: 1n }, 'window bounds reserved'],
  ['a window cap', { windowCap: 1n }, 'window bounds reserved'],
  [
    'a read-only grant carrying object fields',
    {
      opWithdrawUnshielded: false,
      read: true,
      readPkHash: new Uint8Array(32).fill(1),
    },
    'read-only grant carries object fields',
  ],
];

describe('circuitScope', () => {
  it('encodes a spend scope into the circuit fields', () => {
    expect(circuitScope(spendScope)).toEqual({
      opWithdrawUnshielded: true,
      opWithdrawShielded: false,
      opWithdrawShieldedToContract: false,
      read: false,
      color: ZERO32,
      recipientKind: 0n,
      recipient: ZERO32,
      maxCoinValue: 300n,
      perCallCap: 300n,
      cap: 450n,
      expiresAt: 0n,
      rpIdHash: ZERO32,
      readPkHash: ZERO32,
      windowLen: 0n,
      windowCap: 0n,
      caller: undefined,
    });
  });

  it.each([
    ['any', 0n],
    ['user-address', 1n],
    ['coin-public-key', 2n],
    ['contract-address', 3n],
  ] as const)('encodes the %s recipient as kind %s', (kind, expectedKind) => {
    const recipient =
      kind === 'any' ? { kind } : { kind, value: RECIPIENT_HEX };
    const scope = circuitScope({ ...spendScope, recipient });

    expect(scope.recipientKind).toBe(expectedKind);
    expect(HexBytes.fromByteArray(scope.recipient)).toBe(
      kind === 'any' ? '00'.repeat(32) : RECIPIENT_HEX,
    );
  });

  it('encodes every operation flag, the expiry and the caller, with zero window bounds', () => {
    const scope = circuitScope({
      ...spendScope,
      operations: [
        'withdraw-shielded',
        'withdraw-shielded-to-contract',
        'withdraw-unshielded',
      ],
      read: true,
      expiresAt: 1_900_000_000,
      caller: CALLER_HEX,
    });

    expect(scope.opWithdrawUnshielded).toBe(true);
    expect(scope.opWithdrawShielded).toBe(true);
    expect(scope.opWithdrawShieldedToContract).toBe(true);
    expect(scope.read).toBe(true);
    expect(scope.expiresAt).toBe(1_900_000_000n);
    expect(scope.windowLen).toBe(0n);
    expect(scope.windowCap).toBe(0n);
    expect(HexBytes.fromByteArray(scope.caller!)).toBe(CALLER_HEX);
  });

  it('rejects an expiry that is not whole seconds', () => {
    expect(() => circuitScope({ ...spendScope, expiresAt: 1.5 })).toThrow(
      GrantScopeInvalidError,
    );
  });

  it('bounds seconds fields to the contract Uint<64>', () => {
    expect(circuitScope({ ...spendScope, expiresAt: 2 ** 53 }).expiresAt).toBe(
      2n ** 53n,
    );
    expect(() => circuitScope({ ...spendScope, expiresAt: 2 ** 64 })).toThrow(
      new GrantScopeInvalidError('expiresAt exceeds the 64-bit maximum'),
    );
  });

  it('bounds amount fields to the contract Uint<128>', () => {
    const max = (2n ** 128n - 1n).toString();
    const over = (2n ** 128n).toString();

    expect(circuitScope({ ...spendScope, cap: max }).cap).toBe(2n ** 128n - 1n);
    expect(() => circuitScope({ ...spendScope, cap: over })).toThrow(
      new GrantScopeInvalidError('cap exceeds the 128-bit maximum'),
    );
  });

  it('rejects a malformed amount or hex field', () => {
    expect(() => circuitScope({ ...spendScope, cap: '45.0' })).toThrow(
      GrantScopeInvalidError,
    );
    expect(() =>
      circuitScope({ ...spendScope, color: 'ab'.repeat(16) as TokenColor }),
    ).toThrow(GrantScopeInvalidError);
    expect(() =>
      circuitScope({
        ...spendScope,
        recipient: { kind: 'user-address', value: 'CD'.repeat(32) },
      }),
    ).toThrow(GrantScopeInvalidError);
  });
});

describe('circuitScope read key', () => {
  const readPublicKey = 'a7'.repeat(32);

  it('hashes the read public key into read_pk_hash with SHA-256', () => {
    const scope = circuitScope({ ...spendScope, read: true, readPublicKey });

    expect(scope.read).toBe(true);
    expect(scope.readPkHash).toEqual(
      sha256(ByteArray.fromHex(HexBytes(readPublicKey))),
    );
  });

  it('leaves read_pk_hash zero without a read public key', () => {
    expect(circuitScope(spendScope).readPkHash).toEqual(ZERO32);
  });

  it('rejects a read public key that is not 32 bytes of lowercase hex', () => {
    expect(() =>
      circuitScope({
        ...spendScope,
        read: true,
        readPublicKey: 'A7'.repeat(32),
      }),
    ).toThrow(GrantScopeInvalidError);
  });

  it('passes the issue rules for a read grant and for shielded operations with read', () => {
    expect(() => {
      assertIssueRules(
        circuitScope({ ...spendScope, read: true, readPublicKey }),
      );
      assertIssueRules(
        circuitScope({
          ...spendScope,
          operations: ['withdraw-shielded', 'withdraw-shielded-to-contract'],
          read: true,
          readPublicKey,
        }),
      );
    }).not.toThrow();
  });
});

describe('assertIssueRules', () => {
  const base = circuitScope(spendScope);

  it('accepts a spend scope the contract would issue', () => {
    expect(() => {
      assertIssueRules(base);
    }).not.toThrow();
  });

  it.each<[string, Partial<GrantCircuitScope>, string]>([
    ...CONTRACT_RULES,
    [
      'a recipient without a kind',
      { recipient: new Uint8Array(32).fill(3) },
      'recipient given without a recipient kind',
    ],
  ])('rejects %s', (_label, changes, reason) => {
    const check = () => {
      assertIssueRules({ ...base, ...changes });
    };

    expect(check).toThrow(GrantScopeInvalidError);
    expect(check).toThrow(reason);
  });
});

describe('assertIssueRules against the issue circuit', () => {
  const base = circuitScope(spendScope);
  let sim: AccountSim;

  /**
   * Submits `issue_grant_with_jubjub` over a circuit scope as given,
   * through the module's gate but past the issue rules, with a fresh
   * grant id and salt so no earlier call's grant is in the way.
   */
  const issue = async (target: AccountSim, scope: GrantCircuitScope) =>
    target.gated({
      circuit: ISSUE_GRANT_CIRCUIT,
      args: [
        crypto.getRandomValues(new Uint8Array(32)),
        ...scopeArgs(scope),
        crypto.getRandomValues(new Uint8Array(32)),
      ],
    });

  beforeAll(async () => {
    sim = await AccountSim.create();
  });

  it('issues the spend scope both accept', async () => {
    const target = sim.fork();

    expect(() => {
      assertIssueRules(base);
    }).not.toThrow();
    await expect(issue(target, base)).resolves.toEqual(UseCounter(1n));
  });

  it.each(CONTRACT_RULES)(
    'refuses %s in the contract and in the mirror',
    async (_label, changes, reason) => {
      const scope = { ...base, ...changes };

      expect(() => {
        assertIssueRules(scope);
      }).toThrow(reason);
      await expect(issue(sim, scope)).rejects.toThrow(reason);
    },
  );

  it('issues a recipient without a kind, which only the mirror refuses', async () => {
    const scope = { ...base, recipient: new Uint8Array(32).fill(3) };
    const target = sim.fork();

    expect(() => {
      assertIssueRules(scope);
    }).toThrow('recipient given without a recipient kind');
    await expect(issue(target, scope)).resolves.toEqual(UseCounter(1n));
  });
});

describe('granteePoint', () => {
  it('reads the compressed key back to its affine point', () => {
    const { x, y } = granteePk.toAffine();

    expect(granteePoint(spendScope.grantee)).toEqual({
      scheme: 'jubjub-schnorr',
      point: { x, y },
    });
  });

  it('rejects a key that is not 32 bytes of lowercase hex', () => {
    for (const publicKey of [
      'ab'.repeat(16),
      GRANTEE_PUBLIC_KEY.toUpperCase(),
    ]) {
      expect(() =>
        granteePoint({ scheme: 'jubjub-schnorr', publicKey }),
      ).toThrow(
        new GrantScopeInvalidError(
          'grantee public key must be 32 bytes as lowercase hex',
        ),
      );
    }
  });

  it('rejects a key that is not a point on the curve', () => {
    expect(() =>
      granteePoint({ scheme: 'jubjub-schnorr', publicKey: 'ff'.repeat(32) }),
    ).toThrow(
      new GrantScopeInvalidError(
        'grantee public key is not a point on the jubjub curve',
      ),
    );
  });

  it('rejects a point of small order, the identity included', () => {
    for (const publicKey of [IDENTITY_PUBLIC_KEY, ORDER_TWO_PUBLIC_KEY]) {
      expect(() =>
        granteePoint({ scheme: 'jubjub-schnorr', publicKey }),
      ).toThrow(
        new GrantScopeInvalidError('grantee public key has small order'),
      );
    }
  });
});

describe('granteePoint for a secp256k1 grantee', () => {
  it('decompresses the key to the point the contract computes for its secret', () => {
    expect(
      granteePoint({
        scheme: 'secp256k1-ecdsa',
        publicKey: K256_GRANTEE_PUBLIC_KEY,
      }),
    ).toEqual({
      scheme: 'secp256k1-ecdsa',
      point: pureCircuits.compute_public_point_with_k256(K256_GRANTEE_SECRET),
    });
  });

  it('reads both parities of the compressed key', () => {
    const even = secp256k1.Point.BASE.multiply(2n);
    const odd = even.negate();

    for (const point of [even, odd]) {
      const { x, y } = point.toAffine();
      expect(
        granteePoint({
          scheme: 'secp256k1-ecdsa',
          publicKey: HexBytes.fromByteArray(point.toBytes(true)),
        }),
      ).toEqual({
        scheme: 'secp256k1-ecdsa',
        point: { x, y, identity: false },
      });
    }
  });

  it('rejects a key that is not a 33-byte compressed point as lowercase hex', () => {
    for (const publicKey of [
      K256_GRANTEE_PUBLIC_KEY.slice(2),
      `04${K256_GRANTEE_PUBLIC_KEY.slice(2)}`,
      K256_GRANTEE_PUBLIC_KEY.toUpperCase(),
      HexBytes.fromByteArray(
        secp256k1.Point.BASE.multiply(K256_GRANTEE_SECRET).toBytes(false),
      ),
    ]) {
      expect(() =>
        granteePoint({ scheme: 'secp256k1-ecdsa', publicKey }),
      ).toThrow(
        new GrantScopeInvalidError(
          'grantee public key must be a 33-byte compressed secp256k1 point as lowercase hex',
        ),
      );
    }
  });

  it('rejects a key that is not a point on the curve', () => {
    for (const publicKey of [
      `02${'00'.repeat(32)}`,
      `03${'00'.repeat(31)}05`,
      `02${'ff'.repeat(32)}`,
    ]) {
      expect(() =>
        granteePoint({ scheme: 'secp256k1-ecdsa', publicKey }),
      ).toThrow(
        new GrantScopeInvalidError(
          'grantee public key is not a point on the secp256k1 curve',
        ),
      );
    }
  });

  it('rejects a scheme a grant cannot name', () => {
    expect(() =>
      granteePoint({
        scheme: 'p256-ecdsa',
        publicKey: K256_GRANTEE_PUBLIC_KEY,
      } as never),
    ).toThrow(
      new GrantScopeInvalidError('unsupported grantee scheme "p256-ecdsa"'),
    );
  });
});
