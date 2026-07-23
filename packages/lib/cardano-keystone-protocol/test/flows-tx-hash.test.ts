import { Buffer } from 'buffer';

import {
  CardanoSignTxHashRequest,
  CryptoKeypath,
} from '@keystonehq/bc-ur-registry-cardano';
import { describe, expect, it } from 'vitest';

import {
  MissingProtocolFieldError,
  UnexpectedUrTypeError,
} from '../src/errors';
import {
  ADA_TX_SIZE_LIMIT,
  buildTxHashSignRequest,
  parseTxHashSignResponse,
} from '../src/flows/tx-hash';
import { KeystoneUrType } from '../src/ur-types';
import {
  DerivationPath,
  HARDENED_OFFSET,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

const requestId = RequestId('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
const xfp = Xfp.fromHex('73c5da0a');
const txHash = new Uint8Array(32).fill(1);
const address = 'addr_test1example';

const paymentPath = DerivationPath([
  1852 + HARDENED_OFFSET,
  1815 + HARDENED_OFFSET,
  0 + HARDENED_OFFSET,
  0,
  0,
]);
const stakePath = DerivationPath([
  1852 + HARDENED_OFFSET,
  1815 + HARDENED_OFFSET,
  0 + HARDENED_OFFSET,
  2,
  0,
]);

describe('ADA_TX_SIZE_LIMIT', () => {
  it('is the published firmware parsing limit', () => {
    expect(ADA_TX_SIZE_LIMIT).toBe(2048);
  });
});

describe('buildTxHashSignRequest', () => {
  it('builds a cardano-sign-tx-hash-request that decodes back to the inputs', () => {
    const built = buildTxHashSignRequest({
      requestId,
      txHash,
      paths: [
        { path: paymentPath, xfp },
        { path: stakePath, xfp },
      ],
      addressList: [address],
      origin: 'Lace',
    });
    expect(built.urType).toBe(KeystoneUrType.TxHashSignRequest);
    const decoded = CardanoSignTxHashRequest.fromCBOR(Buffer.from(built.cbor));
    expect(decoded.getRequestId()?.toString('hex')).toBe(
      '9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d',
    );
    expect(decoded.getTxHash()).toBe('01'.repeat(32));
    expect(decoded.getOrigin()).toBe('Lace');
    expect(decoded.getAddressList()).toEqual([address]);
    const [paymentKeypath, stakeKeypath] = decoded
      .getPaths()
      .map(item => CryptoKeypath.fromDataItem(item as never));
    expect(paymentKeypath.getPath()).toBe("1852'/1815'/0'/0/0");
    expect(stakeKeypath.getPath()).toBe("1852'/1815'/0'/2/0");
    expect(paymentKeypath.getSourceFingerprint()?.toString('hex')).toBe(
      '73c5da0a',
    );
  });

  it('rejects a transaction hash of the wrong length', () => {
    expect(() =>
      buildTxHashSignRequest({
        requestId,
        txHash: new Uint8Array(31),
        paths: [{ path: paymentPath, xfp }],
        addressList: [address],
      }),
    ).toThrow('transaction hash must be 32 bytes');
  });

  it('rejects an empty signer path list', () => {
    expect(() =>
      buildTxHashSignRequest({
        requestId,
        txHash,
        paths: [],
        addressList: [address],
      }),
    ).toThrow('at least one signer path is required');
  });
});

describe('parseTxHashSignResponse', () => {
  it('returns the reply body as the raw witness set bytes', () => {
    const witnessSet = Buffer.from('a1008182582001584002', 'hex');
    const parsed = parseTxHashSignResponse({
      urType: KeystoneUrType.TxSignResponse,
      cbor: Uint8Array.from(witnessSet),
    });
    expect(Buffer.from(parsed.witnessSet).toString('hex')).toBe(
      'a1008182582001584002',
    );
  });

  it('rejects an unexpected UR type', () => {
    expect(() =>
      parseTxHashSignResponse({
        urType: KeystoneUrType.DataSignResponse,
        cbor: new Uint8Array([0xa0]),
      }),
    ).toThrow(UnexpectedUrTypeError);
  });

  it('rejects an empty reply body', () => {
    expect(() =>
      parseTxHashSignResponse({
        urType: KeystoneUrType.TxSignResponse,
        cbor: new Uint8Array(0),
      }),
    ).toThrow(MissingProtocolFieldError);
  });
});
