import {
  createReader,
  createWriter,
  forEachMapEntry,
  readUint,
} from '@lace-lib/ur-transport';

import { RequestId } from '../value-objects/request-id.vo';

import { checkXfp, readPath, writePath } from './cbor-helpers';

import type { DerivationPath } from '../value-objects/derivation-path.vo';
import type { Xfp } from '../value-objects/xfp.vo';
import type { CborReader, CborWriter } from '@lace-lib/ur-transport';

/** A derivation path for message signing. CDDL: {1: index uint, 2: [*path uint]}. */
export interface SigningPath {
  index: number;
  path: DerivationPath;
}

/**
 * CIP-8 message signing request. xfp may be empty (unspecified).
 *
 * UR type: cardano-cip8-sig-req. CDDL:
 *   {1: request_id(tstr), ?2: origin(tstr), 3: message_payload(bstr), 4: xfp(bstr 4),
 *    5: SigningPath, ?6: address_bytes(bstr)}
 */
export interface CardanoMessageSignRequest {
  requestId: RequestId;
  origin?: string;
  messagePayload: Uint8Array;
  xfp: Xfp;
  requiredSigningPath: SigningPath;
  addressBytes?: Uint8Array;
}

/**
 * Device reply carrying the COSE_Sign1 and COSE_Key.
 *
 * UR type: cardano-cip8-sig-res. CDDL:
 *   {1: request_id(tstr), 2: cose_sign1(bstr), 3: cose_key(bstr)}
 */
export interface CardanoCip8SignResponse {
  requestId: RequestId;
  coseSign1: Uint8Array;
  coseKey: Uint8Array;
}

const writeSigningPath = (
  writer: CborWriter,
  signingPath: SigningPath,
): void => {
  writer.writeStartMap(2);
  writer.writeInt(1);
  writer.writeInt(signingPath.index);
  writer.writeInt(2);
  writePath(writer, signingPath.path);
};

const readSigningPath = (reader: CborReader): SigningPath => {
  let index: number | undefined;
  let path: DerivationPath | undefined;
  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        index = readUint(reader);
        break;
      case 2:
        path = readPath(reader);
        break;
      default:
        reader.skipValue();
    }
  });
  if (index === undefined || path === undefined) {
    throw new Error('SigningPath missing required field (keys 1, 2)');
  }
  return { index, path };
};

export const encodeCardanoMessageSignRequest = (
  request: CardanoMessageSignRequest,
): Uint8Array => {
  const writer = createWriter();
  const numberEntries =
    4 +
    (request.origin !== undefined ? 1 : 0) +
    (request.addressBytes !== undefined ? 1 : 0);
  writer.writeStartMap(numberEntries);
  writer.writeInt(1);
  writer.writeTextString(request.requestId);
  if (request.origin !== undefined) {
    writer.writeInt(2);
    writer.writeTextString(request.origin);
  }
  writer.writeInt(3);
  writer.writeByteString(request.messagePayload);
  writer.writeInt(4);
  writer.writeByteString(request.xfp);
  writer.writeInt(5);
  writeSigningPath(writer, request.requiredSigningPath);
  if (request.addressBytes !== undefined) {
    writer.writeInt(6);
    writer.writeByteString(request.addressBytes);
  }
  return writer.encode();
};

export const decodeCardanoMessageSignRequest = (
  data: Uint8Array,
): CardanoMessageSignRequest => {
  const reader = createReader(data);
  let requestId: string | undefined;
  let origin: string | undefined;
  let messagePayload: Uint8Array | undefined;
  let requiredSigningPath: SigningPath | undefined;
  let addressBytes: Uint8Array | undefined;
  let xfp: Uint8Array = new Uint8Array(0);

  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        requestId = reader.readTextString();
        break;
      case 2:
        origin = reader.readTextString();
        break;
      case 3:
        messagePayload = reader.readByteString();
        break;
      case 4:
        xfp = reader.readByteString();
        break;
      case 5:
        requiredSigningPath = readSigningPath(reader);
        break;
      case 6:
        addressBytes = reader.readByteString();
        break;
      default:
        reader.skipValue();
    }
  });

  if (requestId === undefined) {
    throw new Error('cardano-cip8-sig-req missing request_id (key 1)');
  }
  if (messagePayload === undefined) {
    throw new Error('cardano-cip8-sig-req missing message_payload (key 3)');
  }
  if (requiredSigningPath === undefined) {
    throw new Error(
      'cardano-cip8-sig-req missing required_signing_path (key 5)',
    );
  }

  return {
    requestId: RequestId(requestId),
    origin,
    messagePayload,
    xfp: checkXfp(xfp, { allowEmpty: true }),
    requiredSigningPath,
    addressBytes,
  };
};

export const encodeCardanoCip8SignResponse = (
  response: CardanoCip8SignResponse,
): Uint8Array => {
  const writer = createWriter();
  writer.writeStartMap(3);
  writer.writeInt(1);
  writer.writeTextString(response.requestId);
  writer.writeInt(2);
  writer.writeByteString(response.coseSign1);
  writer.writeInt(3);
  writer.writeByteString(response.coseKey);
  return writer.encode();
};

export const decodeCardanoCip8SignResponse = (
  data: Uint8Array,
): CardanoCip8SignResponse => {
  const reader = createReader(data);
  let requestId = '';
  let coseSign1: Uint8Array | undefined;
  let coseKey: Uint8Array | undefined;
  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        requestId = reader.readTextString();
        break;
      case 2:
        coseSign1 = reader.readByteString();
        break;
      case 3:
        coseKey = reader.readByteString();
        break;
      default:
        reader.skipValue();
    }
  });
  if (coseSign1 === undefined) {
    throw new Error('cardano-cip8-sig-res missing cose_sign1 (key 2)');
  }
  if (coseKey === undefined) {
    throw new Error('cardano-cip8-sig-res missing cose_key (key 3)');
  }
  return { requestId: RequestId(requestId), coseSign1, coseKey };
};
