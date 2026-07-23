import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

import {
  decodeCardanoCip8SignResponse,
  encodeCardanoMessageSignRequest,
} from '../messages/cardano-cip8-sign';
import { CardanoUrType } from '../ur-types';
import { Xfp } from '../value-objects/xfp.vo';

import type { BuiltRequest } from './account';
import type { SigningPath } from '../messages/cardano-cip8-sign';
import type { RequestId } from '../value-objects/request-id.vo';

/** COSE_Key map label for the OKP public key bytes (-2). */
export const COSE_KEY_X = -2;

/** Number of elements in a COSE_Sign1 structure. */
const COSE_SIGN1_ELEMENTS = 4;

/** Inputs for {@link buildCip8Request}. */
export interface BuildCip8RequestParams {
  messagePayload: Uint8Array;
  signingPath: SigningPath;
  addressBytes?: Uint8Array;
  xfp?: Xfp;
  requestId: RequestId;
  origin?: string;
}

/**
 * Parsed CIP-8 response. signature and key are the raw Ed25519 signature and
 * public key extracted from the COSE_Sign1 and COSE_Key (mirrors the companion
 * cip8_verify). The full COSE structures and signed payload are surfaced so the
 * consuming module can assemble a CardanoSignDataResult.
 */
export interface ParsedCip8Response {
  requestId: RequestId;
  signature: Uint8Array;
  key: Uint8Array;
  coseSign1: Uint8Array;
  coseKey: Uint8Array;
  payload: Uint8Array;
}

const EMPTY_XFP = Xfp(new Uint8Array(0), { allowEmpty: true });

/**
 * Builds a CIP-8 message signing request. An absent xfp is encoded empty
 * ('unspecified'); addressBytes is optional context for the device to display.
 */
export const buildCip8Request = ({
  messagePayload,
  signingPath,
  addressBytes,
  xfp = EMPTY_XFP,
  requestId,
  origin,
}: BuildCip8RequestParams): BuiltRequest => ({
  urType: CardanoUrType.Cip8SignRequest,
  cbor: encodeCardanoMessageSignRequest({
    requestId,
    origin,
    messagePayload,
    xfp,
    requiredSigningPath: signingPath,
    addressBytes,
  }),
});

const readCoseSign1 = (
  coseSign1: Uint8Array,
): { payload: Uint8Array; signature: Uint8Array } => {
  const reader = new Serialization.CborReader(HexBlob.fromBytes(coseSign1));
  const length = reader.readStartArray();
  if (length !== COSE_SIGN1_ELEMENTS) {
    throw new Error(
      `COSE_Sign1 must be an array of ${COSE_SIGN1_ELEMENTS} elements, got ${length}`,
    );
  }
  reader.readByteString();
  reader.skipValue();
  const payload = reader.readByteString();
  const signature = reader.readByteString();
  reader.readEndArray();
  return { payload, signature };
};

const readCoseKeyPublicKey = (coseKey: Uint8Array): Uint8Array => {
  const reader = new Serialization.CborReader(HexBlob.fromBytes(coseKey));
  const count = reader.readStartMap();
  if (count === null) {
    throw new Error('COSE_Key must be a definite-length map');
  }
  let publicKey: Uint8Array | undefined;
  for (let index = 0; index < count; index++) {
    const label = Number(reader.readInt());
    if (label === COSE_KEY_X) {
      publicKey = reader.readByteString();
    } else {
      reader.skipValue();
    }
  }
  reader.readEndMap();
  if (publicKey === undefined) {
    throw new Error(`COSE_Key missing public key (label ${COSE_KEY_X})`);
  }
  return publicKey;
};

/**
 * Parses a CIP-8 response, extracting the raw signature from the COSE_Sign1 and
 * the public key from the COSE_Key. Mirrors the companion cip8_verify
 * reconstruction.
 */
export const parseCip8Response = (cbor: Uint8Array): ParsedCip8Response => {
  const response = decodeCardanoCip8SignResponse(cbor);
  const { payload, signature } = readCoseSign1(response.coseSign1);
  const key = readCoseKeyPublicKey(response.coseKey);
  return {
    requestId: response.requestId,
    signature,
    key,
    coseSign1: response.coseSign1,
    coseKey: response.coseKey,
    payload,
  };
};
