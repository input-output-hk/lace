import { Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  decodeCardanoCip8SignResponse,
  decodeCardanoMessageSignRequest,
  encodeCardanoCip8SignResponse,
  encodeCardanoMessageSignRequest,
} from '../src/messages/cardano-cip8-sign';
import {
  DerivationPath,
  HARDENED_OFFSET,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

import type {
  CardanoCip8SignResponse,
  CardanoMessageSignRequest,
} from '../src/messages/cardano-cip8-sign';

const path = DerivationPath([
  1852 + HARDENED_OFFSET,
  1815 + HARDENED_OFFSET,
  0 + HARDENED_OFFSET,
  0,
  0,
]);

describe('CardanoMessageSignRequest', () => {
  const base: CardanoMessageSignRequest = {
    requestId: RequestId('msg-1'),
    messagePayload: new Uint8Array([1, 2, 3]),
    xfp: Xfp(new Uint8Array(0), { allowEmpty: true }),
    requiredSigningPath: { index: 0, path },
  };

  it('round-trips a minimal request', () => {
    expect(
      decodeCardanoMessageSignRequest(encodeCardanoMessageSignRequest(base)),
    ).toEqual({ ...base, origin: undefined, addressBytes: undefined });
  });

  it('round-trips with origin, xfp, and address_bytes', () => {
    const request: CardanoMessageSignRequest = {
      ...base,
      origin: 'Lace',
      xfp: Xfp(new Uint8Array([1, 2, 3, 4])),
      addressBytes: new Uint8Array([0x00, 0x11, 0x22]),
    };
    expect(
      decodeCardanoMessageSignRequest(encodeCardanoMessageSignRequest(request)),
    ).toEqual(request);
  });

  it('produces byte-stable output', () => {
    expect([...encodeCardanoMessageSignRequest(base)]).toEqual([
      ...encodeCardanoMessageSignRequest(base),
    ]);
  });

  it('throws when request_id (key 1) is missing', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(2);
    writer.writeInt(3);
    writer.writeByteString(new Uint8Array([1]));
    writer.writeInt(5);
    writer.writeStartMap(2);
    writer.writeInt(1);
    writer.writeInt(0);
    writer.writeInt(2);
    writer.writeStartArray(0);
    expect(() => decodeCardanoMessageSignRequest(writer.encode())).toThrow(
      'missing request_id',
    );
  });

  it('throws when message_payload (key 3) is missing', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(2);
    writer.writeInt(1);
    writer.writeTextString('msg-1');
    writer.writeInt(5);
    writer.writeStartMap(2);
    writer.writeInt(1);
    writer.writeInt(0);
    writer.writeInt(2);
    writer.writeStartArray(0);
    expect(() => decodeCardanoMessageSignRequest(writer.encode())).toThrow(
      'missing message_payload',
    );
  });

  it('throws when required_signing_path (key 5) is missing', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(2);
    writer.writeInt(1);
    writer.writeTextString('msg-1');
    writer.writeInt(3);
    writer.writeByteString(new Uint8Array([1]));
    expect(() => decodeCardanoMessageSignRequest(writer.encode())).toThrow(
      'missing required_signing_path',
    );
  });
});

describe('CardanoCip8SignResponse', () => {
  const response: CardanoCip8SignResponse = {
    requestId: RequestId('msg-1'),
    coseSign1: new Uint8Array([0x84, 0x40, 0xa0, 0x40]),
    coseKey: new Uint8Array([0xa1, 0x01, 0x01]),
  };

  it('round-trips cose_sign1 and cose_key', () => {
    expect(
      decodeCardanoCip8SignResponse(encodeCardanoCip8SignResponse(response)),
    ).toEqual(response);
  });

  it('produces byte-stable output', () => {
    expect([...encodeCardanoCip8SignResponse(response)]).toEqual([
      ...encodeCardanoCip8SignResponse(response),
    ]);
  });

  it('throws when cose_sign1 (key 2) is missing', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(2);
    writer.writeInt(1);
    writer.writeTextString('msg-1');
    writer.writeInt(3);
    writer.writeByteString(new Uint8Array([1]));
    expect(() => decodeCardanoCip8SignResponse(writer.encode())).toThrow(
      'missing cose_sign1',
    );
  });

  it('throws when cose_key (key 3) is missing', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(2);
    writer.writeInt(1);
    writer.writeTextString('msg-1');
    writer.writeInt(2);
    writer.writeByteString(new Uint8Array([1]));
    expect(() => decodeCardanoCip8SignResponse(writer.encode())).toThrow(
      'missing cose_key',
    );
  });
});
