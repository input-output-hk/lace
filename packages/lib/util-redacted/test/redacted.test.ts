import { describe, expect, it } from 'vitest';

import { filterRedacted, make, unsafeWipe, value } from '../src/redacted';

describe('Redacted', () => {
  it('redacts JSON serialization and filtering', () => {
    const secret = make(new Uint8Array([1, 2, 3]));
    const payload = { secret, nested: [secret], ok: 'value' };

    expect(JSON.stringify(secret)).toBe('"[REDACTED]"');
    expect(filterRedacted(payload)).toEqual({
      secret: '[REDACTED]',
      nested: ['[REDACTED]'],
      ok: 'value',
    });
  });

  it('wipes typed arrays in-place', () => {
    const secret = make(new Uint8Array([5, 6, 7]));

    unsafeWipe(secret);

    expect(Array.from(secret)).toEqual([0, 0, 0]);
  });

  it('unwraps redacted values after clone boundaries', () => {
    const secret = make({ payload: 'sensitive' });
    const clone = Object.assign({}, secret) as Record<string, unknown>;

    expect(value(clone as typeof secret)).toEqual({
      _tag: 'Redacted',
      __redacted: true,
      payload: 'sensitive',
    });
    expect(filterRedacted(clone)).toBe('[REDACTED]');
  });
});
