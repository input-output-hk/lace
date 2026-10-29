import { describe, expect, it } from 'vitest';

import {
  DREP_ALWAYS_ABSTAIN,
  DREP_ALWAYS_NO_CONFIDENCE,
  isDrepId,
  isSentinelDrepId,
  toCanonicalDrepId,
} from '../src/drep';

/** One real DRep, in both encodings and both cases. */
const CIP129 = 'drep1ygr9tuapcanc3kpeyy4dc3vmrz9cfe5q7v9wj3x9j0ap3tswtre9j';
const CIP105 = 'drep1qe2l8gw8v7ydswfp9twytxcc3wzwdq8npt55f3vnlgv2u8sx3nt';

describe('isSentinelDrepId', () => {
  it('is true for the abstain sentinel', () => {
    expect(isSentinelDrepId(DREP_ALWAYS_ABSTAIN)).toBe(true);
  });

  it('is true for the no-confidence sentinel', () => {
    expect(isSentinelDrepId(DREP_ALWAYS_NO_CONFIDENCE)).toBe(true);
  });

  it('is false for a specific bech32 DRep id', () => {
    expect(isSentinelDrepId('drep1specific')).toBe(false);
  });
});

describe('isDrepId', () => {
  it.each([
    ['CIP-129', 'drep1ygr9tuapcanc3kpeyy4dc3vmrz9cfe5q7v9wj3x9j0ap3tswtre9j'],
    ['CIP-105', 'drep1qe2l8gw8v7ydswfp9twytxcc3wzwdq8npt55f3vnlgv2u8sx3nt'],
    [
      'a script DRep',
      'drep_script1536pmhp8hjl4zkf6cjpqhx4tkf55cpzl0lzhkt5td6ek6la3ym8',
    ],
  ])('accepts a real id in %s form', (_label, id) => {
    expect(isDrepId(id)).toBe(true);
  });

  it.each([
    ['a mistyped id', 'drep1notarealid'],
    ['a stake address', 'addr1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'],
    ['an empty string', ''],
    ['the abstain sentinel', DREP_ALWAYS_ABSTAIN],
  ])('rejects %s', (_label, id) => {
    expect(isDrepId(id)).toBe(false);
  });

  // Whatever reports an unusable config id and whatever drops it must agree,
  // so this is the reducer's question, not bech32's. Testing the parse alone
  // answered differently in both of these cases.
  it('accepts a mixed-case id, which bech32 permits', () => {
    expect(isDrepId(`Drep1${CIP129.slice(5)}`)).toBe(true);
  });

  it.each([
    [
      'committee-hot',
      'drep1qgr9tuapcanc3kpeyy4dc3vmrz9cfe5q7v9wj3x9j0ap3tsumjezj',
    ],
    [
      'committee-cold',
      'drep1zgr9tuapcanc3kpeyy4dc3vmrz9cfe5q7v9wj3x9j0ap3ts4nwe4j',
    ],
  ])(
    'rejects a CIP-129 id whose header names a %s credential',
    (_label, id) => {
      expect(isDrepId(id)).toBe(false);
    },
  );
});

describe('toCanonicalDrepId', () => {
  it.each([
    ['CIP-105', CIP105],
    ['CIP-129', CIP129],
    ['upper-case CIP-105', CIP105.toUpperCase()],
    // Mixed case is the only form the lower-casing is load-bearing for:
    // bech32 permits all-upper, so the SDK parses that without help.
    ['mixed-case CIP-105', `Drep1${CIP105.slice(5)}`],
    ['mixed-case CIP-129', `Drep1${CIP129.slice(5)}`],
  ])('maps one DRep written as %s onto a single id', (_label, id) => {
    expect(toCanonicalDrepId(id)).toBe(CIP129);
  });

  // A script DRep is a different credential over the same hash, so it must
  // reduce to its own id — and reduce, not pass through: an unconverted
  // script id would match no directory row and silently block nobody.
  it('reduces a script DRep to its own canonical id', () => {
    expect(
      toCanonicalDrepId(
        'drep_script1qe2l8gw8v7ydswfp9twytxcc3wzwdq8npt55f3vnlgv2ugjme02',
      ),
    ).toBe('drep1yvr9tuapcanc3kpeyy4dc3vmrz9cfe5q7v9wj3x9j0ap3tsweng94');
  });

  it.each([
    ['a mistyped id', 'drep1notarealid'],
    ['a pool id', 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy'],
    ['an empty string', ''],
    ['the abstain sentinel', DREP_ALWAYS_ABSTAIN],
    ['the no-confidence sentinel', DREP_ALWAYS_NO_CONFIDENCE],
  ])('returns undefined for %s', (_label, id) => {
    expect(toCanonicalDrepId(id)).toBeUndefined();
  });

  // Callers feed it straight from an untyped feature-flag payload, so a
  // non-string must come back undefined rather than raising.
  it.each([[42], [null], [undefined], [{}], [[]], [true]])(
    'returns undefined for the non-string %p',
    value => {
      expect(toCanonicalDrepId(value)).toBeUndefined();
    },
  );
});
