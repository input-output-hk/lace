import { Buffer } from 'buffer';

import {
  CardanoSignDataRequest,
  CardanoSignDataSignature,
} from '@keystonehq/bc-ur-registry-cardano';
import { describe, expect, it } from 'vitest';

import {
  KeystoneProtocolError,
  MissingProtocolFieldError,
  UnexpectedUrTypeError,
} from '../src/errors';
import { buildDataSignRequest, parseDataSignResponse } from '../src/flows/data';
import { KeystoneUrType } from '../src/ur-types';
import {
  DerivationPath,
  HARDENED_OFFSET,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

import type { UrResult } from '@lace-lib/ur-transport';

const requestId = RequestId('52090ede-3785-4b64-8b0f-6e73a35b9d7b');
const requestIdBytes = Buffer.from('52090ede37854b648b0f6e73a35b9d7b', 'hex');
const xfp = Xfp.fromHex('73c5da0a');
const signData = Buffer.from(
  '846a5369676e61747572653143a10127404f48656c6c6f2c2043617264616e6f21',
  'hex',
);
const signingKeyPublicKey = new Uint8Array(32).fill(5);
const signatureBytes = Buffer.alloc(64, 6);
const publicKeyBytes = Buffer.alloc(32, 7);

const signingPath = DerivationPath([
  1852 + HARDENED_OFFSET,
  1815 + HARDENED_OFFSET,
  0 + HARDENED_OFFSET,
  0,
  0,
]);

interface DataSignatureOverrides {
  withRequestId?: boolean;
  signature?: Buffer;
  publicKey?: Buffer;
}

const dataSignatureResponse = ({
  withRequestId = true,
  signature = signatureBytes,
  publicKey = publicKeyBytes,
}: DataSignatureOverrides = {}): UrResult => ({
  urType: KeystoneUrType.DataSignResponse,
  cbor: Uint8Array.from(
    new CardanoSignDataSignature(
      signature,
      publicKey,
      withRequestId ? requestIdBytes : undefined,
    ).toCBOR() as Uint8Array,
  ),
});

describe('buildDataSignRequest', () => {
  it('builds a cardano-sign-data-request that decodes back to the inputs', () => {
    const built = buildDataSignRequest({
      requestId,
      signData,
      path: signingPath,
      xfp,
      signingKeyPublicKey,
      origin: 'Lace',
    });
    expect(built.urType).toBe(KeystoneUrType.DataSignRequest);
    const decoded = CardanoSignDataRequest.fromCBOR(Buffer.from(built.cbor));
    expect(decoded.getRequestId()).toEqual(requestIdBytes);
    expect(decoded.getSignData()).toEqual(signData);
    expect(decoded.getDerivationPath()).toBe("1852'/1815'/0'/0/0");
    expect(decoded.getXpub()).toEqual(Buffer.from(signingKeyPublicKey));
    expect(decoded.getOrigin()).toBe('Lace');
  });

  it('rejects a signing key public key of the wrong length', () => {
    expect(() =>
      buildDataSignRequest({
        requestId,
        signData,
        path: signingPath,
        xfp,
        signingKeyPublicKey: new Uint8Array(64),
      }),
    ).toThrow('signing key public key must be 32 bytes');
  });
});

describe('parseDataSignResponse', () => {
  it('parses the echoed request id, signature, and public key', () => {
    const parsed = parseDataSignResponse(dataSignatureResponse());
    expect(parsed.requestId).toBe('52090ede-3785-4b64-8b0f-6e73a35b9d7b');
    expect(Buffer.from(parsed.signature)).toEqual(signatureBytes);
    expect(Buffer.from(parsed.publicKey)).toEqual(publicKeyBytes);
  });

  it('rejects an unexpected UR type', () => {
    expect(() =>
      parseDataSignResponse({
        urType: KeystoneUrType.TxSignResponse,
        cbor: new Uint8Array(0),
      }),
    ).toThrow(UnexpectedUrTypeError);
  });

  it('rejects a response without a request id', () => {
    expect(() =>
      parseDataSignResponse(dataSignatureResponse({ withRequestId: false })),
    ).toThrow(MissingProtocolFieldError);
  });

  it('rejects an empty signature', () => {
    expect(() =>
      parseDataSignResponse(
        dataSignatureResponse({ signature: Buffer.alloc(0) }),
      ),
    ).toThrow(MissingProtocolFieldError);
  });

  it('rejects a signature of the wrong length', () => {
    expect(() =>
      parseDataSignResponse(
        dataSignatureResponse({ signature: Buffer.alloc(63, 6) }),
      ),
    ).toThrow(KeystoneProtocolError);
  });

  it('rejects an empty public key', () => {
    expect(() =>
      parseDataSignResponse(
        dataSignatureResponse({ publicKey: Buffer.alloc(0) }),
      ),
    ).toThrow(MissingProtocolFieldError);
  });

  it('rejects a public key of the wrong length', () => {
    expect(() =>
      parseDataSignResponse(
        dataSignatureResponse({ publicKey: Buffer.alloc(33, 7) }),
      ),
    ).toThrow(KeystoneProtocolError);
  });
});
