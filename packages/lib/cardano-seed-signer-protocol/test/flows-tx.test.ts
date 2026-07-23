import { Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { buildTxSignRequest, parseTxSignResponse } from '../src/flows/tx';
import {
  TX_HASH_LENGTH,
  decodeCardanoSignRequest,
  encodeCardanoTxSignResponse,
} from '../src/messages/cardano-tx-sign';
import { CardanoUrType } from '../src/ur-types';
import {
  DerivationPath,
  HARDENED_OFFSET,
  ROLE_PAYMENT,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

import type {
  Ed25519PublicKeyHex,
  Ed25519SignatureHex,
} from '@cardano-sdk/crypto';

const requestId = RequestId('tx-1');
const xfp = Xfp(new Uint8Array([1, 2, 3, 4]));
const txHash = new Uint8Array(TX_HASH_LENGTH).fill(9);
const path = DerivationPath([
  1852 + HARDENED_OFFSET,
  1815 + HARDENED_OFFSET,
  HARDENED_OFFSET,
  ROLE_PAYMENT,
  0,
]);

const vkey =
  '1cad3e5e9e7e6a4a9e0c3b3f5d6c7a8b9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b' as Ed25519PublicKeyHex;
const signature = 'a'.repeat(128) as Ed25519SignatureHex;

const encodeVkeyWitnessSet = (
  entries: Array<[Ed25519PublicKeyHex, Ed25519SignatureHex]>,
  tagged: boolean,
): Uint8Array => {
  const writer = new Serialization.CborWriter();
  if (tagged) {
    writer.writeTag(Serialization.CborTag.Set);
  }
  writer.writeStartArray(entries.length);
  for (const entry of entries) {
    const witnessCbor = Serialization.VkeyWitness.fromCore(entry).toCbor();
    writer.writeEncodedValue(Buffer.from(witnessCbor, 'hex'));
  }
  return writer.encode();
};

describe('buildTxSignRequest', () => {
  it('assembles a cardano-tx-sig-req from resolved inputs', () => {
    const built = buildTxSignRequest({
      serializedTxBody: new Uint8Array([0xa0]),
      signingInputs: [{ txHash, index: 0, xfp, path }],
      changeOutputs: [{ index: 1, path, xfp }],
      extraSigners: [{ xfp, path }],
      network: 1,
      requestId,
      origin: 'Lace',
    });
    expect(built.urType).toBe(CardanoUrType.TxSignRequest);
    const decoded = decodeCardanoSignRequest(built.cbor);
    expect(decoded).toEqual({
      requestId,
      origin: 'Lace',
      signData: new Uint8Array([0xa0]),
      inputs: [{ txHash, index: 0, xfp, path }],
      changeOutputs: [{ index: 1, path, xfp }],
      extraSigners: [{ xfp, path }],
      network: 1,
    });
  });

  it('carries the collateral return path through to the request', () => {
    const built = buildTxSignRequest({
      serializedTxBody: new Uint8Array([0xa0]),
      signingInputs: [{ txHash, index: 0, xfp, path }],
      changeOutputs: [],
      extraSigners: [],
      network: 1,
      requestId,
      collateralReturnPath: { xfp, path },
    });
    const decoded = decodeCardanoSignRequest(built.cbor);
    expect(decoded.collateralReturnPath).toEqual({ xfp, path });
  });
});

describe('parseTxSignResponse', () => {
  it('decodes a tag-258 vkey witness set into witnesses', () => {
    const vkeyWitnessSet = encodeVkeyWitnessSet([[vkey, signature]], true);
    const cbor = encodeCardanoTxSignResponse({ requestId, vkeyWitnessSet });
    const parsed = parseTxSignResponse(cbor);
    expect(parsed.requestId).toEqual(requestId);
    expect(parsed.witnesses).toEqual([{ vkey, signature }]);
    expect([...parsed.vkeyWitnessSet]).toEqual([...vkeyWitnessSet]);
  });

  it('decodes a plain (untagged) array witness set', () => {
    const vkeyWitnessSet = encodeVkeyWitnessSet([[vkey, signature]], false);
    const cbor = encodeCardanoTxSignResponse({ requestId, vkeyWitnessSet });
    expect(parseTxSignResponse(cbor).witnesses).toEqual([{ vkey, signature }]);
  });

  it('yields witnesses usable with @cardano-sdk/core VkeyWitness', () => {
    const vkeyWitnessSet = encodeVkeyWitnessSet([[vkey, signature]], true);
    const cbor = encodeCardanoTxSignResponse({ requestId, vkeyWitnessSet });
    const [witness] = parseTxSignResponse(cbor).witnesses;
    const reencoded = Serialization.VkeyWitness.fromCore([
      witness.vkey,
      witness.signature,
    ]).toCbor();
    expect(Serialization.VkeyWitness.fromCbor(reencoded).toCore()).toEqual([
      vkey,
      signature,
    ]);
  });

  it('parses an empty witness set', () => {
    const vkeyWitnessSet = encodeVkeyWitnessSet([], true);
    const cbor = encodeCardanoTxSignResponse({ requestId, vkeyWitnessSet });
    expect(parseTxSignResponse(cbor).witnesses).toEqual([]);
  });

  it('rejects a witness set carrying an unexpected tag', () => {
    const writer = new Serialization.CborWriter();
    writer.writeTag(24);
    writer.writeStartArray(0);
    const cbor = encodeCardanoTxSignResponse({
      requestId,
      vkeyWitnessSet: writer.encode(),
    });
    expect(() => parseTxSignResponse(cbor)).toThrow('unexpected tag');
  });
});
