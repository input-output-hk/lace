import { describe, expect, it } from 'vitest';

import { GrantLimitReachedError, GrantScopeInvalidError } from '../src/errors';
import {
  GRANTEE_SCHEMES,
  isGranteeKey,
  isGranteeScheme,
  isSealableX25519Key,
  MAX_GRANTS,
  validateGrantScope,
} from '../src/grants';
import { TokenColor } from '../src/value-objects';

import type {
  GrantGrantee,
  GrantScopeContext,
  GrantScopeInput,
} from '../src/grants';

const nowSeconds = 1_800_000_000;
const context: GrantScopeContext = { nowSeconds, grantCount: 0 };

/** RFC 7748 section 6.1, Alice's public key: canonical and of large order. */
const READ_PUBLIC_KEY =
  '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a';

const LOW_ORDER_KEYS = [
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0100000000000000000000000000000000000000000000000000000000000000',
  'e0eb7a7c3b41b8ae1656e3faf19fc46ada098deb9c32b1fd866205165f49b800',
  '5f9c95bca3508c24b1d0b1559c83ef5b04445cc4581c8e86d8224eddd09f1157',
  'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'cdeb7a7c3b41b8ae1656e3faf19fc46ada098deb9c32b1fd866205165f49b880',
  '4c9c95bca3508c24b1d0b1559c83ef5b04445cc4581c8e86d8224eddd09f11d7',
  'd9ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  'daffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  'dbffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
];

const spendScope: GrantScopeInput = {
  grantee: { scheme: 'jubjub-schnorr', publicKey: 'ab'.repeat(32) },
  operations: ['withdraw-unshielded'],
  color: TokenColor('00'.repeat(32)),
  recipient: { kind: 'any' },
  maxCoinValue: '1000',
  perCallCap: '100',
  cap: '500',
  expiresAt: nowSeconds + 3600,
};

describe('validateGrantScope', () => {
  it('accepts a spend scope', () => {
    expect(() => {
      validateGrantScope(spendScope, context);
    }).not.toThrow();
  });

  it('accepts a grant that never expires', () => {
    expect(() => {
      validateGrantScope({ ...spendScope, expiresAt: null }, context);
    }).not.toThrow();
  });

  it('accepts a cap equal to the per-call cap', () => {
    expect(() => {
      validateGrantScope({ ...spendScope, cap: '100' }, context);
    }).not.toThrow();
  });

  it('accepts a read grant with an rp id and a canonical read public key', () => {
    expect(() => {
      validateGrantScope(
        {
          ...spendScope,
          read: true,
          rpId: 'lace.io',
          readPublicKey: READ_PUBLIC_KEY,
        },
        context,
      );
    }).not.toThrow();
  });

  it('accepts shielded operations together with read', () => {
    expect(() => {
      validateGrantScope(
        {
          ...spendScope,
          operations: ['withdraw-shielded', 'withdraw-shielded-to-contract'],
          read: true,
          rpId: 'lace.io',
          readPublicKey: READ_PUBLIC_KEY,
        },
        context,
      );
    }).not.toThrow();
  });

  it('rejects a read grant without a read public key', () => {
    expect(() => {
      validateGrantScope(
        { ...spendScope, read: true, rpId: 'lace.io' },
        context,
      );
    }).toThrow(
      new GrantScopeInvalidError(
        'A read grant requires the read public key the viewing secret is sealed to',
      ),
    );
  });

  it('rejects a read public key on a grant that does not read', () => {
    expect(() => {
      validateGrantScope(
        { ...spendScope, readPublicKey: READ_PUBLIC_KEY },
        context,
      );
    }).toThrow(
      new GrantScopeInvalidError(
        'A read public key is only given with a read grant',
      ),
    );
  });

  it.each(['ab'.repeat(31), 'AB'.repeat(32), 'zz'.repeat(32)])(
    'rejects a read public key that is not 32 bytes of lowercase hex: %s',
    readPublicKey => {
      expect(() => {
        validateGrantScope(
          { ...spendScope, read: true, rpId: 'lace.io', readPublicKey },
          context,
        );
      }).toThrow(
        new GrantScopeInvalidError(
          'read public key must be 32 bytes as lowercase hex',
        ),
      );
    },
  );

  it.each(LOW_ORDER_KEYS)('rejects the small-order read key %s', key => {
    expect(() => {
      validateGrantScope(
        { ...spendScope, read: true, rpId: 'lace.io', readPublicKey: key },
        context,
      );
    }).toThrow(new GrantScopeInvalidError('read public key has small order'));
  });

  it.each([
    `${READ_PUBLIC_KEY.slice(0, 62)}ea`,
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'efffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  ])('rejects the non-canonical read key encoding %s', key => {
    expect(() => {
      validateGrantScope(
        { ...spendScope, read: true, rpId: 'lace.io', readPublicKey: key },
        context,
      );
    }).toThrow(
      new GrantScopeInvalidError(
        'read public key is not a canonical X25519 encoding',
      ),
    );
  });

  it('rejects a cap below the per-call cap', () => {
    expect(() => {
      validateGrantScope({ ...spendScope, cap: '99' }, context);
    }).toThrow(GrantScopeInvalidError);
  });

  it('rejects an expiry in the past', () => {
    expect(() => {
      validateGrantScope({ ...spendScope, expiresAt: nowSeconds - 1 }, context);
    }).toThrow(GrantScopeInvalidError);
  });

  it('rejects an expiry at the current second', () => {
    expect(() => {
      validateGrantScope({ ...spendScope, expiresAt: nowSeconds }, context);
    }).toThrow(GrantScopeInvalidError);
  });

  it('rejects a read grant without an rp id', () => {
    expect(() => {
      validateGrantScope(
        { ...spendScope, read: true, readPublicKey: READ_PUBLIC_KEY },
        context,
      );
    }).toThrow(new GrantScopeInvalidError('A read grant requires an rp id'));
  });

  it('rejects a grant with no operation', () => {
    expect(() => {
      validateGrantScope({ ...spendScope, operations: [] }, context);
    }).toThrow(GrantScopeInvalidError);
  });

  it('rejects an amount that is not a decimal integer', () => {
    expect(() => {
      validateGrantScope({ ...spendScope, perCallCap: '-1' }, context);
    }).toThrow(GrantScopeInvalidError);
  });

  it('rejects an amount above the 128-bit maximum', () => {
    expect(() => {
      validateGrantScope(
        { ...spendScope, cap: (2n ** 128n).toString() },
        context,
      );
    }).toThrow(GrantScopeInvalidError);
  });

  it('accepts the largest 128-bit amount', () => {
    expect(() => {
      validateGrantScope(
        { ...spendScope, cap: (2n ** 128n - 1n).toString() },
        context,
      );
    }).not.toThrow();
  });

  it.each([
    ['a fractional expiry', { expiresAt: nowSeconds + 0.5 }],
    ['a NaN expiry', { expiresAt: Number.NaN }],
    ['an infinite expiry', { expiresAt: Number.POSITIVE_INFINITY }],
    [
      'a short grantee key',
      { grantee: { scheme: 'jubjub-schnorr' as const, publicKey: 'ab' } },
    ],
    [
      'an uppercase grantee key',
      {
        grantee: {
          scheme: 'jubjub-schnorr' as const,
          publicKey: 'AB'.repeat(32),
        },
      },
    ],
    [
      'a malformed pinned recipient',
      { recipient: { kind: 'user-address' as const, value: 'zz' } },
    ],
    ['a malformed caller', { caller: 'ab' }],
  ])('rejects %s', (_name, override) => {
    expect(() => {
      validateGrantScope({ ...spendScope, ...override }, context);
    }).toThrow(GrantScopeInvalidError);
  });

  it.each([
    ['an even', '02'],
    ['an odd', '03'],
  ])('accepts a secp256k1 grantee key with %s prefix', (_name, prefix) => {
    expect(() => {
      validateGrantScope(
        {
          ...spendScope,
          grantee: {
            scheme: 'secp256k1-ecdsa',
            publicKey: `${prefix}${'ab'.repeat(32)}`,
          },
        },
        context,
      );
    }).not.toThrow();
  });

  it.each<[string, GrantGrantee]>([
    [
      'a 32-byte secp256k1 grantee key',
      { scheme: 'secp256k1-ecdsa', publicKey: 'ab'.repeat(32) },
    ],
    ...['00', '01', '04', '12', 'ff'].map((prefix): [string, GrantGrantee] => [
      `a 33-byte secp256k1 grantee key prefixed ${prefix}`,
      { scheme: 'secp256k1-ecdsa', publicKey: `${prefix}${'ab'.repeat(32)}` },
    ]),
    [
      'an uppercase secp256k1 grantee key',
      { scheme: 'secp256k1-ecdsa', publicKey: `02${'AB'.repeat(32)}` },
    ],
    [
      'a 33-byte jubjub grantee key',
      { scheme: 'jubjub-schnorr', publicKey: `02${'ab'.repeat(32)}` },
    ],
  ])('rejects %s', (_name, grantee) => {
    expect(() => {
      validateGrantScope({ ...spendScope, grantee }, context);
    }).toThrow(GrantScopeInvalidError);
  });

  it('rejects a grantee scheme a grant cannot name', () => {
    const grantee = {
      scheme: 'p256-ecdsa',
      publicKey: 'ab'.repeat(32),
    } as unknown as GrantGrantee;
    expect(() => {
      validateGrantScope({ ...spendScope, grantee }, context);
    }).toThrow(GrantScopeInvalidError);
  });

  it('accepts a pinned recipient and a caller of 32 bytes', () => {
    expect(() => {
      validateGrantScope(
        {
          ...spendScope,
          recipient: { kind: 'contract-address', value: 'cd'.repeat(32) },
          caller: 'ef'.repeat(32),
        },
        context,
      );
    }).not.toThrow();
  });

  it('rejects a rolling window, which the contract reserves', () => {
    expect(() => {
      validateGrantScope(
        {
          ...spendScope,
          window: { lengthSeconds: 86_400, cap: '200' },
        } as GrantScopeInput,
        context,
      );
    }).toThrow('the contract reserves the window bounds');
  });

  it('accepts a grant when one slot is still free', () => {
    expect(() => {
      validateGrantScope(spendScope, {
        nowSeconds,
        grantCount: MAX_GRANTS - 1,
      });
    }).not.toThrow();
  });

  it('rejects a grant when the contract holds the maximum', () => {
    expect(() => {
      validateGrantScope(spendScope, { nowSeconds, grantCount: MAX_GRANTS });
    }).toThrow(GrantLimitReachedError);
  });
});

describe('isSealableX25519Key', () => {
  it('accepts a canonical key of large order', () => {
    expect(isSealableX25519Key(READ_PUBLIC_KEY)).toBe(true);
  });

  it.each(LOW_ORDER_KEYS)('refuses the small-order key %s', key => {
    expect(isSealableX25519Key(key)).toBe(false);
  });

  it.each([
    `${READ_PUBLIC_KEY.slice(0, 62)}ea`,
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'efffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  ])('refuses the non-canonical encoding %s', key => {
    expect(isSealableX25519Key(key)).toBe(false);
  });

  it.each(['ab'.repeat(31), 'AB'.repeat(32), 'zz'.repeat(32), ''])(
    'refuses hex that is not 32 lowercase bytes: %s',
    key => {
      expect(isSealableX25519Key(key)).toBe(false);
    },
  );
});

describe('GRANTEE_SCHEMES', () => {
  it('lists the jubjub and secp256k1 schemes', () => {
    expect(GRANTEE_SCHEMES).toEqual(['jubjub-schnorr', 'secp256k1-ecdsa']);
  });
});

describe('isGranteeScheme', () => {
  it.each(GRANTEE_SCHEMES)('accepts %s', scheme => {
    expect(isGranteeScheme(scheme)).toBe(true);
  });

  it.each(['p256-ecdsa', 'JUBJUB-SCHNORR', '', 7, undefined])(
    'refuses %j',
    value => {
      expect(isGranteeScheme(value)).toBe(false);
    },
  );
});

describe('isGranteeKey', () => {
  it.each([
    ['jubjub-schnorr', 'ab'.repeat(32)],
    ['secp256k1-ecdsa', `02${'ab'.repeat(32)}`],
    ['secp256k1-ecdsa', `03${'ab'.repeat(32)}`],
  ] as const)('accepts a %s key %s', (scheme, key) => {
    expect(isGranteeKey(scheme, key)).toBe(true);
  });

  it.each([
    ['jubjub-schnorr', `02${'ab'.repeat(32)}`],
    ['jubjub-schnorr', 'AB'.repeat(32)],
    ['secp256k1-ecdsa', 'ab'.repeat(32)],
    ['secp256k1-ecdsa', `04${'ab'.repeat(32)}`],
    ['secp256k1-ecdsa', `02${'AB'.repeat(32)}`],
    ['secp256k1-ecdsa', 7],
  ] as const)('refuses a %s key %j', (scheme, key) => {
    expect(isGranteeKey(scheme, key)).toBe(false);
  });
});
