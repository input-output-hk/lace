import { Buffer } from 'buffer';

import {
  CardanoSignRequest,
  CardanoSignature,
} from '@keystonehq/bc-ur-registry-cardano';
import { describe, expect, it } from 'vitest';

import {
  MissingProtocolFieldError,
  UnexpectedUrTypeError,
} from '../src/errors';
import { buildTxSignRequest, parseTxSignResponse } from '../src/flows/tx';
import { KeystoneUrType } from '../src/ur-types';
import {
  DerivationPath,
  HARDENED_OFFSET,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

import type { TxExtraSigner, TxSigningInput } from '../src/flows/tx';
import type { UrResult } from '@lace-lib/ur-transport';

const requestId = RequestId('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
const xfp = Xfp.fromHex('73c5da0a');
const signData = Buffer.from('84a30081a0f5f6', 'hex');
const transactionHash = new Uint8Array(32).fill(1);
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

const utxo = (amount: bigint | string): TxSigningInput => ({
  transactionHash,
  index: 0,
  amount,
  address,
  path: paymentPath,
  xfp,
});

const extraSigner: TxExtraSigner = {
  keyHash: new Uint8Array(28).fill(3),
  path: stakePath,
  xfp,
};

const signatureResponse = (
  withRequestId = true,
  witnessSet: Buffer = Buffer.from('a1008182582001584002', 'hex'),
): UrResult => ({
  urType: KeystoneUrType.TxSignResponse,
  cbor: Uint8Array.from(
    new CardanoSignature(
      witnessSet,
      withRequestId
        ? Buffer.from('9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d', 'hex')
        : undefined,
    ).toCBOR() as Uint8Array,
  ),
});

describe('buildTxSignRequest', () => {
  it('builds a cardano-sign-request that decodes back to the inputs', () => {
    const built = buildTxSignRequest({
      requestId,
      signData,
      utxos: [utxo(10_000_000n)],
      extraSigners: [extraSigner],
      origin: 'Lace',
    });
    expect(built.urType).toBe(KeystoneUrType.TxSignRequest);
    const decoded = CardanoSignRequest.fromCBOR(Buffer.from(built.cbor));
    expect(decoded.getRequestId()?.toString('hex')).toBe(
      '9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d',
    );
    expect(decoded.getSignData()).toEqual(signData);
    expect(decoded.getOrigin()).toBe('Lace');
    const [decodedUtxo] = decoded.getUtxos();
    expect(decodedUtxo.getTransactionHash()).toEqual(
      Buffer.from(transactionHash),
    );
    expect(decodedUtxo.getIndex()).toBe(0);
    expect(decodedUtxo.getAmount()).toBe('10000000');
    expect(decodedUtxo.getAddress()).toBe(address);
    expect(decodedUtxo.getKeyPath()).toBe("1852'/1815'/0'/0/0");
    const [decodedSigner] = decoded.getAdditionalSigners();
    expect(decodedSigner.getKeyHash()).toEqual(
      Buffer.from(extraSigner.keyHash),
    );
    expect(decodedSigner.getKeyPath()).toBe("1852'/1815'/0'/2/0");
  });

  it('accepts the amount as a lovelace string', () => {
    const built = buildTxSignRequest({
      requestId,
      signData,
      utxos: [utxo('42')],
      extraSigners: [],
    });
    const decoded = CardanoSignRequest.fromCBOR(Buffer.from(built.cbor));
    expect(decoded.getUtxos()[0].getAmount()).toBe('42');
  });

  it('rejects a non-numeric amount string', () => {
    expect(() =>
      buildTxSignRequest({
        requestId,
        signData,
        utxos: [utxo('12.5')],
        extraSigners: [],
      }),
    ).toThrow('amount must be a non-negative lovelace value');
  });

  it('rejects a negative bigint amount', () => {
    expect(() =>
      buildTxSignRequest({
        requestId,
        signData,
        utxos: [utxo(-1n)],
        extraSigners: [],
      }),
    ).toThrow('amount must be a non-negative lovelace value');
  });

  it('rejects a transaction hash of the wrong length', () => {
    expect(() =>
      buildTxSignRequest({
        requestId,
        signData,
        utxos: [{ ...utxo('42'), transactionHash: new Uint8Array(31) }],
        extraSigners: [],
      }),
    ).toThrow('transaction hash must be 32 bytes');
  });
});

describe('parseTxSignResponse', () => {
  it('parses the echoed request id and witness set bytes', () => {
    const parsed = parseTxSignResponse(signatureResponse());
    expect(parsed.requestId).toBe('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
    expect(Buffer.from(parsed.witnessSet).toString('hex')).toBe(
      'a1008182582001584002',
    );
  });

  it('rejects an unexpected UR type', () => {
    expect(() =>
      parseTxSignResponse({
        urType: KeystoneUrType.DataSignResponse,
        cbor: new Uint8Array(0),
      }),
    ).toThrow(UnexpectedUrTypeError);
  });

  it('rejects a response without a request id', () => {
    expect(() => parseTxSignResponse(signatureResponse(false))).toThrow(
      MissingProtocolFieldError,
    );
  });

  it('rejects a response with an empty witness set', () => {
    expect(() =>
      parseTxSignResponse(signatureResponse(true, Buffer.alloc(0))),
    ).toThrow(MissingProtocolFieldError);
  });
});
