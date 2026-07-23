import { describe, expect, it } from 'vitest';

import {
  DerivationPath,
  HARDENED_OFFSET,
  MAX_PATH_COMPONENT,
} from '../src/value-objects/derivation-path.vo';
import {
  REQUEST_ID_LENGTH,
  RequestId,
} from '../src/value-objects/request-id.vo';
import { XFP_LENGTH, Xfp } from '../src/value-objects/xfp.vo';

describe('RequestId', () => {
  it('wraps a UUID string', () => {
    expect(RequestId('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')).toBe(
      '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    );
  });

  it('rejects a non-UUID string', () => {
    expect(() => RequestId('not-a-uuid')).toThrow(
      'request id must be a UUID string',
    );
  });

  it('rejects the empty string', () => {
    expect(() => RequestId('')).toThrow('request id must be a UUID string');
  });

  it('builds from the 16 wire bytes', () => {
    const bytes = new Uint8Array([
      0x9b, 0x1d, 0xeb, 0x4d, 0x3b, 0x7d, 0x4b, 0xad, 0x9b, 0xdd, 0x2b, 0x0d,
      0x7b, 0x3d, 0xcb, 0x6d,
    ]);
    expect(RequestId.fromBytes(bytes)).toBe(
      '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    );
  });

  it('rejects wire bytes of the wrong length', () => {
    expect(() => RequestId.fromBytes(new Uint8Array(4))).toThrow(
      `request id must be ${REQUEST_ID_LENGTH} bytes`,
    );
  });
});

describe('Xfp', () => {
  it('accepts a 4-byte value', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(Xfp(bytes)).toBe(bytes);
  });

  it('rejects a non-4-byte value', () => {
    expect(() => Xfp(new Uint8Array([1, 2, 3]))).toThrow(
      `xfp must be ${XFP_LENGTH} bytes`,
    );
  });

  it('rejects an empty value', () => {
    expect(() => Xfp(new Uint8Array(0))).toThrow();
  });

  it('builds from hex', () => {
    expect([...Xfp.fromHex('01020304')]).toEqual([1, 2, 3, 4]);
  });

  it('formats as hex', () => {
    expect(Xfp.toHex(Xfp(new Uint8Array([0x73, 0xc5, 0xda, 0x0a])))).toBe(
      '73c5da0a',
    );
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

  it('rejects a non-integer component', () => {
    expect(() => DerivationPath([1.5])).toThrow(
      'derivation path component out of range',
    );
  });

  it('formats a path with hardened and soft components', () => {
    const path = DerivationPath([
      1852 + HARDENED_OFFSET,
      1815 + HARDENED_OFFSET,
      0 + HARDENED_OFFSET,
      0,
      5,
    ]);
    expect(DerivationPath.toPathString(path)).toBe("m/1852'/1815'/0'/0/5");
  });

  it('formats an empty path as m', () => {
    expect(DerivationPath.toPathString(DerivationPath([]))).toBe('m');
  });
});
