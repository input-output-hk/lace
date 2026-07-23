import { Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  TX_HASH_LENGTH,
  decodeCardanoSignRequest,
  decodeCardanoTxSignResponse,
  encodeCardanoSignRequest,
  encodeCardanoTxSignResponse,
} from '../src/messages/cardano-tx-sign';
import {
  DerivationPath,
  HARDENED_OFFSET,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

import type {
  CardanoSignRequest,
  CardanoTxSignResponse,
} from '../src/messages/cardano-tx-sign';

const xfp = Xfp(new Uint8Array([1, 2, 3, 4]));
const txHash = new Uint8Array(TX_HASH_LENGTH).fill(9);
const path = DerivationPath([
  1852 + HARDENED_OFFSET,
  1815 + HARDENED_OFFSET,
  0 + HARDENED_OFFSET,
  0,
  0,
]);

const baseRequest: CardanoSignRequest = {
  requestId: RequestId('tx-1'),
  signData: new Uint8Array([0xa0]),
  inputs: [{ txHash, index: 0, xfp, path }],
  changeOutputs: [
    { index: 1, path, xfp: Xfp(new Uint8Array(0), { allowEmpty: true }) },
  ],
  extraSigners: [{ xfp, path }],
  network: 1,
};

describe('CardanoSignRequest', () => {
  it('round-trips without origin', () => {
    const decoded = decodeCardanoSignRequest(
      encodeCardanoSignRequest(baseRequest),
    );
    expect(decoded).toEqual({ ...baseRequest, origin: undefined });
  });

  it('round-trips with origin and empty arrays', () => {
    const request: CardanoSignRequest = {
      ...baseRequest,
      origin: 'Lace',
      inputs: [],
      changeOutputs: [],
      extraSigners: [],
    };
    expect(decodeCardanoSignRequest(encodeCardanoSignRequest(request))).toEqual(
      request,
    );
  });

  it('round-trips a collateral return path (key 8)', () => {
    const request: CardanoSignRequest = {
      ...baseRequest,
      collateralReturnPath: { xfp, path },
    };
    expect(decodeCardanoSignRequest(encodeCardanoSignRequest(request))).toEqual(
      { ...request, origin: undefined },
    );
  });

  it('decodes a request without key 8 to an undefined collateral return path', () => {
    const decoded = decodeCardanoSignRequest(
      encodeCardanoSignRequest(baseRequest),
    );
    expect(decoded.collateralReturnPath).toBeUndefined();
  });

  it('rejects a collateral return path with an empty xfp', () => {
    const request: CardanoSignRequest = {
      ...baseRequest,
      collateralReturnPath: {
        xfp: Xfp(new Uint8Array(0), { allowEmpty: true }),
        path,
      },
    };
    expect(() =>
      decodeCardanoSignRequest(encodeCardanoSignRequest(request)),
    ).toThrow(/xfp/);
  });

  it('round-trips a change output with a 4-byte xfp', () => {
    const request: CardanoSignRequest = {
      ...baseRequest,
      changeOutputs: [{ index: 0, path, xfp }],
    };
    expect(decodeCardanoSignRequest(encodeCardanoSignRequest(request))).toEqual(
      { ...request, origin: undefined },
    );
  });

  it('produces byte-stable output', () => {
    expect([...encodeCardanoSignRequest(baseRequest)]).toEqual([
      ...encodeCardanoSignRequest(baseRequest),
    ]);
  });

  it('rejects a tx_hash that is not 32 bytes', () => {
    const request: CardanoSignRequest = {
      ...baseRequest,
      inputs: [{ txHash: new Uint8Array(16), index: 0, xfp, path }],
    };
    expect(() =>
      decodeCardanoSignRequest(encodeCardanoSignRequest(request)),
    ).toThrow('tx_hash must be 32 bytes');
  });

  it('rejects a tx_hash that is not 32 bytes at encode time', () => {
    const request: CardanoSignRequest = {
      ...baseRequest,
      inputs: [{ txHash: new Uint8Array(31), index: 0, xfp, path }],
    };
    expect(() => encodeCardanoSignRequest(request)).toThrow(
      'tx_hash must be 32 bytes, got 31',
    );
  });

  it('throws when request_id (key 1) is missing', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(2);
    writer.writeInt(3);
    writer.writeByteString(new Uint8Array([0xa0]));
    writer.writeInt(7);
    writer.writeInt(1);
    expect(() => decodeCardanoSignRequest(writer.encode())).toThrow(
      'missing request_id',
    );
  });

  it('throws when sign_data (key 3) is missing', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(2);
    writer.writeInt(1);
    writer.writeTextString('tx-1');
    writer.writeInt(7);
    writer.writeInt(1);
    expect(() => decodeCardanoSignRequest(writer.encode())).toThrow(
      'missing sign_data',
    );
  });

  it('throws when network (key 7) is missing', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(2);
    writer.writeInt(1);
    writer.writeTextString('tx-1');
    writer.writeInt(3);
    writer.writeByteString(new Uint8Array([0xa0]));
    expect(() => decodeCardanoSignRequest(writer.encode())).toThrow(
      'missing network',
    );
  });
});

describe('CardanoTxSignResponse', () => {
  const response: CardanoTxSignResponse = {
    requestId: RequestId('tx-1'),
    vkeyWitnessSet: new Uint8Array([0xd9, 0x01, 0x02, 0x80]),
  };

  it('round-trips the vkey witness set as opaque bytes', () => {
    expect(
      decodeCardanoTxSignResponse(encodeCardanoTxSignResponse(response)),
    ).toEqual(response);
  });

  it('preserves a tag-258 set payload byte-for-byte', () => {
    const inner = new Serialization.CborWriter();
    inner.writeTag(Serialization.CborTag.Set);
    inner.writeStartArray(0);
    const vkeyWitnessSet = inner.encode();
    const decoded = decodeCardanoTxSignResponse(
      encodeCardanoTxSignResponse({
        requestId: RequestId('tx-2'),
        vkeyWitnessSet,
      }),
    );
    expect([...decoded.vkeyWitnessSet]).toEqual([...vkeyWitnessSet]);
  });

  it('throws when vkey_witness_set (key 2) is missing', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(1);
    writer.writeInt(1);
    writer.writeTextString('tx-1');
    expect(() => decodeCardanoTxSignResponse(writer.encode())).toThrow(
      'missing vkey_witness_set',
    );
  });
});
