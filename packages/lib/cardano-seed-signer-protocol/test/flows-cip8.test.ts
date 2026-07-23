import { Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  COSE_KEY_X,
  buildCip8Request,
  parseCip8Response,
} from '../src/flows/cip8';
import {
  decodeCardanoMessageSignRequest,
  encodeCardanoCip8SignResponse,
} from '../src/messages/cardano-cip8-sign';
import { CardanoUrType } from '../src/ur-types';
import {
  DerivationPath,
  HARDENED_OFFSET,
  ROLE_PAYMENT,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

import type { SigningPath } from '../src/messages/cardano-cip8-sign';

const requestId = RequestId('cip8-1');
const messagePayload = new Uint8Array([0x68, 0x69]);
const signingPath: SigningPath = {
  index: 0,
  path: DerivationPath([
    1852 + HARDENED_OFFSET,
    1815 + HARDENED_OFFSET,
    HARDENED_OFFSET,
    ROLE_PAYMENT,
    0,
  ]),
};

const ALGORITHM_EDDSA = -8;
const signatureBytes = new Uint8Array(64).fill(0xab);
const publicKeyBytes = new Uint8Array(32).fill(0xcd);
const addressBytes = new Uint8Array([0x01, 0x02, 0x03]);

const buildCoseSign1 = (payload: Uint8Array): Uint8Array => {
  const protectedWriter = new Serialization.CborWriter();
  protectedWriter.writeStartMap(1);
  protectedWriter.writeInt(1);
  protectedWriter.writeInt(ALGORITHM_EDDSA);
  const protectedHeaders = protectedWriter.encode();

  const writer = new Serialization.CborWriter();
  writer.writeStartArray(4);
  writer.writeByteString(protectedHeaders);
  writer.writeStartMap(1);
  writer.writeTextString('hashed');
  writer.writeBoolean(false);
  writer.writeByteString(payload);
  writer.writeByteString(signatureBytes);
  return writer.encode();
};

const buildCoseKey = (): Uint8Array => {
  const writer = new Serialization.CborWriter();
  writer.writeStartMap(2);
  writer.writeInt(1);
  writer.writeInt(1);
  writer.writeInt(COSE_KEY_X);
  writer.writeByteString(publicKeyBytes);
  return writer.encode();
};

describe('buildCip8Request', () => {
  it('assembles a cardano-cip8-sig-req that decodes back', () => {
    const built = buildCip8Request({
      messagePayload,
      signingPath,
      addressBytes,
      xfp: Xfp(new Uint8Array([1, 2, 3, 4])),
      requestId,
      origin: 'Lace',
    });
    expect(built.urType).toBe(CardanoUrType.Cip8SignRequest);
    expect(decodeCardanoMessageSignRequest(built.cbor)).toEqual({
      requestId,
      origin: 'Lace',
      messagePayload,
      xfp: Xfp(new Uint8Array([1, 2, 3, 4])),
      requiredSigningPath: signingPath,
      addressBytes,
    });
  });

  it('encodes an empty xfp when none is supplied', () => {
    const built = buildCip8Request({ messagePayload, signingPath, requestId });
    const decoded = decodeCardanoMessageSignRequest(built.cbor);
    expect(decoded.xfp).toEqual(Xfp(new Uint8Array(0), { allowEmpty: true }));
    expect(decoded.addressBytes).toBeUndefined();
  });
});

describe('parseCip8Response', () => {
  it('extracts signature and public key from COSE_Sign1 + COSE_Key', () => {
    const coseSign1 = buildCoseSign1(messagePayload);
    const coseKey = buildCoseKey();
    const cbor = encodeCardanoCip8SignResponse({
      requestId,
      coseSign1,
      coseKey,
    });
    const parsed = parseCip8Response(cbor);
    expect(parsed.requestId).toEqual(requestId);
    expect([...parsed.signature]).toEqual([...signatureBytes]);
    expect([...parsed.key]).toEqual([...publicKeyBytes]);
    expect([...parsed.payload]).toEqual([...messagePayload]);
    expect([...parsed.coseSign1]).toEqual([...coseSign1]);
    expect([...parsed.coseKey]).toEqual([...coseKey]);
  });

  it('throws when COSE_Key lacks the public key label', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartMap(1);
    writer.writeInt(1);
    writer.writeInt(1);
    const cbor = encodeCardanoCip8SignResponse({
      requestId,
      coseSign1: buildCoseSign1(messagePayload),
      coseKey: writer.encode(),
    });
    expect(() => parseCip8Response(cbor)).toThrow('missing public key');
  });

  it('throws when COSE_Sign1 has the wrong element count', () => {
    const writer = new Serialization.CborWriter();
    writer.writeStartArray(2);
    writer.writeByteString(new Uint8Array(0));
    writer.writeByteString(new Uint8Array(0));
    const cbor = encodeCardanoCip8SignResponse({
      requestId,
      coseSign1: writer.encode(),
      coseKey: buildCoseKey(),
    });
    expect(() => parseCip8Response(cbor)).toThrow(
      'COSE_Sign1 must be an array',
    );
  });
});
