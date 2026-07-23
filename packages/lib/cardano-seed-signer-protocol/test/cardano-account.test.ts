import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DEVICE_LABEL,
  PURPOSE_CIP1852,
  decodeCardanoAccountRequest,
  decodeCardanoAccountResponse,
  encodeCardanoAccountRequest,
  encodeCardanoAccountResponse,
} from '../src/messages/cardano-account';
import {
  DerivationPath,
  HARDENED_OFFSET,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

import type {
  CardanoAccountRequest,
  CardanoAccountResponse,
} from '../src/messages/cardano-account';

const accountPath = (account: number): DerivationPath =>
  DerivationPath([
    PURPOSE_CIP1852 + HARDENED_OFFSET,
    1815 + HARDENED_OFFSET,
    account + HARDENED_OFFSET,
  ]);

describe('CardanoAccountRequest', () => {
  it('round-trips without origin', () => {
    const request: CardanoAccountRequest = {
      requestId: RequestId('req-1'),
      accountIndices: [0, 1],
      keyPurpose: PURPOSE_CIP1852,
    };
    const decoded = decodeCardanoAccountRequest(
      encodeCardanoAccountRequest(request),
    );
    expect(decoded).toEqual({ ...request, origin: undefined });
  });

  it('round-trips with origin', () => {
    const request: CardanoAccountRequest = {
      requestId: RequestId('req-2'),
      accountIndices: [3],
      keyPurpose: PURPOSE_CIP1852,
      origin: 'Lace',
    };
    expect(
      decodeCardanoAccountRequest(encodeCardanoAccountRequest(request)),
    ).toEqual(request);
  });

  it('produces byte-stable output', () => {
    const request: CardanoAccountRequest = {
      requestId: RequestId('req-3'),
      accountIndices: [0],
      keyPurpose: PURPOSE_CIP1852,
    };
    const first = encodeCardanoAccountRequest(request);
    const second = encodeCardanoAccountRequest(request);
    expect([...first]).toEqual([...second]);
  });

  it('defaults key_purpose to CIP-1852 when absent', () => {
    const encoded = encodeCardanoAccountRequest({
      requestId: RequestId('req-4'),
      accountIndices: [0],
      keyPurpose: PURPOSE_CIP1852,
    });
    expect(decodeCardanoAccountRequest(encoded).keyPurpose).toBe(
      PURPOSE_CIP1852,
    );
  });

  it('throws on empty account_indices', () => {
    const encoded = encodeCardanoAccountRequest({
      requestId: RequestId('req-5'),
      accountIndices: [],
      keyPurpose: PURPOSE_CIP1852,
    });
    expect(() => decodeCardanoAccountRequest(encoded)).toThrow(
      'account_indices',
    );
  });
});

describe('CardanoAccountResponse', () => {
  const xpub = new Uint8Array(64).fill(7);

  const response: CardanoAccountResponse = {
    requestId: RequestId('req-1'),
    masterFingerprint: Xfp(new Uint8Array([0xde, 0xad, 0xbe, 0xef])),
    keys: [
      { accountIndex: 0, xpub, path: accountPath(0) },
      { accountIndex: 1, xpub, path: accountPath(1) },
    ],
    deviceLabel: DEFAULT_DEVICE_LABEL,
  };

  it('round-trips a multi-account response', () => {
    expect(
      decodeCardanoAccountResponse(encodeCardanoAccountResponse(response)),
    ).toEqual(response);
  });

  it('produces byte-stable output', () => {
    expect([...encodeCardanoAccountResponse(response)]).toEqual([
      ...encodeCardanoAccountResponse(response),
    ]);
  });

  it('rejects a master fingerprint that is not 4 bytes', () => {
    expect(() =>
      decodeCardanoAccountResponse(
        encodeCardanoAccountResponse({
          ...response,
          masterFingerprint: new Uint8Array([1, 2, 3]) as never,
        }),
      ),
    ).toThrow('xfp must be 4 bytes');
  });

  it('rejects an xpub that is not 64 bytes', () => {
    expect(() =>
      decodeCardanoAccountResponse(
        encodeCardanoAccountResponse({
          ...response,
          keys: [
            { accountIndex: 0, xpub: new Uint8Array(32), path: accountPath(0) },
          ],
        }),
      ),
    ).toThrow('xpub must be 64 bytes');
  });

  it('rejects a negative account index on encode', () => {
    expect(() =>
      encodeCardanoAccountResponse({
        ...response,
        keys: [
          { accountIndex: -1, xpub: new Uint8Array(64), path: accountPath(0) },
        ],
      }),
    ).toThrow('expected a CBOR uint, got: -1');
  });
});

describe('encodeCardanoAccountRequest uint validation', () => {
  const base = {
    requestId: RequestId('req-uint'),
    keyPurpose: PURPOSE_CIP1852,
  };

  it('rejects a negative account index', () => {
    expect(() =>
      encodeCardanoAccountRequest({ ...base, accountIndices: [-1] }),
    ).toThrow('expected a CBOR uint, got: -1');
  });

  it('rejects a non-integer account index', () => {
    expect(() =>
      encodeCardanoAccountRequest({ ...base, accountIndices: [0.5] }),
    ).toThrow('expected a CBOR uint, got: 0.5');
  });

  it('rejects a negative key purpose', () => {
    expect(() =>
      encodeCardanoAccountRequest({
        ...base,
        accountIndices: [0],
        keyPurpose: -1852,
      }),
    ).toThrow('expected a CBOR uint, got: -1852');
  });
});
