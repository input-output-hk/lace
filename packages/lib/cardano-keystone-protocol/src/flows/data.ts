import { Buffer } from 'buffer';

import {
  CardanoSignDataRequest,
  CardanoSignDataSignature,
} from '@keystonehq/bc-ur-registry-cardano';

import { KeystoneProtocolError, MissingProtocolFieldError } from '../errors';
import { KeystoneUrType } from '../ur-types';
import { DerivationPath } from '../value-objects/derivation-path.vo';
import { RequestId } from '../value-objects/request-id.vo';
import { Xfp } from '../value-objects/xfp.vo';

import { assertUrType, toCborBytes } from './registry-helpers';

import type { BuiltRequest } from './account';
import type { UrResult } from '@lace-lib/ur-transport';

const ED25519_SIGNATURE_LENGTH = 64;
const ED25519_PUBLIC_KEY_LENGTH = 32;

/**
 * Inputs for {@link buildDataSignRequest}. The signData is the CIP-8
 * Sig_structure bytes to sign; the signingKeyPublicKey is the 32-byte raw
 * public key of the key at the requested derivation path, which the device
 * checks against the key it will sign with before signing.
 */
export interface BuildDataSignRequestParams {
  requestId: RequestId;
  signData: Uint8Array;
  path: DerivationPath;
  xfp: Xfp;
  signingKeyPublicKey: Uint8Array;
  origin?: string;
}

/**
 * Parsed CIP-8 data signing response: the raw Ed25519 signature over the
 * requested Sig_structure and the public key of the signing key. Assembling
 * the COSE_Sign1 and COSE_Key structures is the consuming signer module's
 * responsibility.
 */
export interface ParsedDataSignResponse {
  requestId: RequestId;
  signature: Uint8Array;
  publicKey: Uint8Array;
}

/**
 * Builds a cardano-sign-data-request asking the device to sign the given
 * CIP-8 Sig_structure bytes with the key at the given derivation path.
 */
export const buildDataSignRequest = ({
  requestId,
  signData,
  path,
  xfp,
  signingKeyPublicKey,
  origin,
}: BuildDataSignRequestParams): BuiltRequest => {
  if (signingKeyPublicKey.length !== ED25519_PUBLIC_KEY_LENGTH) {
    throw new Error(
      `signing key public key must be ${ED25519_PUBLIC_KEY_LENGTH} bytes, got ${signingKeyPublicKey.length}`,
    );
  }
  const request = CardanoSignDataRequest.constructCardanoSignDataRequest(
    Buffer.from(signData).toString('hex'),
    DerivationPath.toPathString(path),
    Xfp.toHex(xfp),
    Buffer.from(signingKeyPublicKey).toString('hex'),
    requestId,
    origin,
  );
  return { urType: KeystoneUrType.DataSignRequest, cbor: toCborBytes(request) };
};

/**
 * Parses a cardano-sign-data-signature response into the echoed request id,
 * the raw Ed25519 signature, and the signing public key.
 */
export const parseDataSignResponse = (
  response: UrResult,
): ParsedDataSignResponse => {
  assertUrType(KeystoneUrType.DataSignResponse, response);
  const signature = CardanoSignDataSignature.fromCBOR(
    Buffer.from(response.cbor),
  );
  const requestIdBytes: Uint8Array | undefined = signature.getRequestId();
  if (requestIdBytes === undefined || requestIdBytes.length === 0) {
    throw new MissingProtocolFieldError('request id');
  }
  const signatureBytes: Uint8Array | undefined = signature.getSignature();
  if (signatureBytes === undefined || signatureBytes.length === 0) {
    throw new MissingProtocolFieldError('signature');
  }
  if (signatureBytes.length !== ED25519_SIGNATURE_LENGTH) {
    throw new KeystoneProtocolError(
      `signature must be ${ED25519_SIGNATURE_LENGTH} bytes, got ${signatureBytes.length}`,
    );
  }
  const publicKey: Uint8Array | undefined = signature.getPublicKey();
  if (publicKey === undefined || publicKey.length === 0) {
    throw new MissingProtocolFieldError('public key');
  }
  if (publicKey.length !== ED25519_PUBLIC_KEY_LENGTH) {
    throw new KeystoneProtocolError(
      `public key must be ${ED25519_PUBLIC_KEY_LENGTH} bytes, got ${publicKey.length}`,
    );
  }
  return {
    requestId: RequestId.fromBytes(Uint8Array.from(requestIdBytes)),
    signature: Uint8Array.from(signatureBytes),
    publicKey: Uint8Array.from(publicKey),
  };
};
