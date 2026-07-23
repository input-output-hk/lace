import { describe, expect, it } from 'vitest';

import {
  DerivationPath,
  HARDENED_OFFSET,
  MAX_PATH_COMPONENT,
  MAX_PATH_COMPONENTS,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp, XFP_LENGTH } from '../src/value-objects/xfp.vo';

describe('RequestId', () => {
  it('wraps a string value', () => {
    expect(RequestId('uuid-1')).toBe('uuid-1');
  });

  it('allows the empty string', () => {
    expect(RequestId('')).toBe('');
  });
});

describe('Xfp', () => {
  it('accepts a 4-byte value', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(Xfp(bytes)).toBe(bytes);
  });

  it('rejects a non-4-byte value by default', () => {
    expect(() => Xfp(new Uint8Array([1, 2, 3]))).toThrow(
      `xfp must be ${XFP_LENGTH} bytes`,
    );
  });

  it('rejects an empty value by default', () => {
    expect(() => Xfp(new Uint8Array(0))).toThrow();
  });

  it('accepts an empty value when allowEmpty is set', () => {
    const empty = new Uint8Array(0);
    expect(Xfp(empty, { allowEmpty: true })).toBe(empty);
  });

  it('still rejects wrong non-empty length when allowEmpty is set', () => {
    expect(() => Xfp(new Uint8Array([1, 2]), { allowEmpty: true })).toThrow();
  });

  it('builds from hex', () => {
    expect([...Xfp.fromHex('01020304')]).toEqual([1, 2, 3, 4]);
  });
});

describe('DerivationPath', () => {
  it('wraps a list of components', () => {
    const path = [
      1852 + HARDENED_OFFSET,
      1815 + HARDENED_OFFSET,
      0 + HARDENED_OFFSET,
    ];
    expect([...DerivationPath(path)]).toEqual(path);
  });

  it('allows an empty path', () => {
    expect([...DerivationPath([])]).toEqual([]);
  });

  it('rejects a path longer than the cap', () => {
    const tooLong = Array.from({ length: MAX_PATH_COMPONENTS + 1 }, () => 0);
    expect(() => DerivationPath(tooLong)).toThrow('derivation path too long');
  });

  it('rejects a component above the 32-bit max', () => {
    expect(() => DerivationPath([MAX_PATH_COMPONENT + 1])).toThrow(
      'derivation path component out of range',
    );
  });

  it('rejects a negative component', () => {
    expect(() => DerivationPath([-1])).toThrow(
      'derivation path component out of range',
    );
  });
});
