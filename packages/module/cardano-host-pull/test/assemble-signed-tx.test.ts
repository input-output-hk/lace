import { Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { assembleSignedTx } from '../src/assemble-signed-tx';

import {
  extractVkeys,
  hostWitnessSetCbor,
  PK_HOST,
  PK_ORIG,
  SIG_HOST,
  SIG_ORIG,
  SIG_ORIG_STALE,
  unsignedTx,
} from './tx-fixtures';

const parses = (cbor: string): boolean => {
  Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor));
  return true;
};

describe('assembleSignedTx', () => {
  it('assembles a parseable signed tx from the host witness set', () => {
    const result = assembleSignedTx(
      unsignedTx([]),
      hostWitnessSetCbor([[PK_HOST, SIG_HOST]]),
    );

    expect(result.signatureCount).toBe(1);
    expect(parses(String(result.serializedTx))).toBe(true);
    expect(extractVkeys(String(result.serializedTx)).get(PK_HOST)).toBe(
      SIG_HOST,
    );
  });

  it('merges a pre-existing vkey with the host signatures', () => {
    const result = assembleSignedTx(
      unsignedTx([[PK_ORIG, SIG_ORIG]]),
      hostWitnessSetCbor([[PK_HOST, SIG_HOST]]),
    );

    expect(result.signatureCount).toBe(2);
    const merged = extractVkeys(String(result.serializedTx));
    expect(merged.get(PK_ORIG)).toBe(SIG_ORIG);
    expect(merged.get(PK_HOST)).toBe(SIG_HOST);
  });

  it('lets the host signature win on a same-pubkey collision', () => {
    const result = assembleSignedTx(
      unsignedTx([[PK_HOST, SIG_ORIG_STALE]]),
      hostWitnessSetCbor([[PK_HOST, SIG_HOST]]),
    );

    expect(result.signatureCount).toBe(1);
    expect(extractVkeys(String(result.serializedTx)).get(PK_HOST)).toBe(
      SIG_HOST,
    );
  });
});
