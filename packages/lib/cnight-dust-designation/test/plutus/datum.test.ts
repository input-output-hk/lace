import { Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  dustMappingDatumToCbor,
  encodeCWallet,
  encodeDustMappingDatum,
} from '../../src/plutus/datum';
import { CardanoStakeKeyHash } from '../../src/value-objects/cardano-stake-key-hash.vo';
import { MidnightCoinPubkey } from '../../src/value-objects/midnight-coin-pubkey.vo';

// Known-shape inputs — all-zero for the stake-key hash, sequential
// pattern (0x00..0x1f) for the dust pubkey. Specific patterns chosen
// so byte mismatches are visually obvious in inline-snapshot diffs.
const STAKE_KEY_HASH = CardanoStakeKeyHash(new Uint8Array(28));
const DUST_PUBKEY = MidnightCoinPubkey(
  new Uint8Array([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
    0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
  ]),
);

describe('encodeDustMappingDatum', () => {
  it('produces a Constr 0 with two fields: c_wallet and dust_address', () => {
    const data = encodeDustMappingDatum({
      cWallet: { kind: 'verificationKey', stakeKeyHash: STAKE_KEY_HASH },
      dustAddress: DUST_PUBKEY,
    });

    const constr = data.asConstrPlutusData();
    expect(constr).toBeDefined();
    expect(constr?.getAlternative()).toBe(0n);

    const fields = constr!.getData();
    expect(fields.getLength()).toBe(2);

    // Field 0: c_wallet (Constr 0 with one bytestring)
    const cWallet = fields.get(0).asConstrPlutusData();
    expect(cWallet?.getAlternative()).toBe(0n);
    expect(cWallet!.getData().getLength()).toBe(1);
    expect(cWallet!.getData().get(0).asBoundedBytes()).toEqual(
      new Uint8Array(28),
    );

    // Field 1: dust_address bytestring
    expect(fields.get(1).asBoundedBytes()).toEqual(DUST_PUBKEY);
  });

  it('roundtrips: encode → toCbor → fromCbor → equals', () => {
    const data = encodeDustMappingDatum({
      cWallet: { kind: 'verificationKey', stakeKeyHash: STAKE_KEY_HASH },
      dustAddress: DUST_PUBKEY,
    });
    const decoded = Serialization.PlutusData.fromCbor(data.toCbor());
    expect(decoded.equals(data)).toBe(true);
  });

  it('produces stable CBOR for the canonical "all-zero stake / sequential pubkey" input', () => {
    const cbor = dustMappingDatumToCbor({
      cWallet: { kind: 'verificationKey', stakeKeyHash: STAKE_KEY_HASH },
      dustAddress: DUST_PUBKEY,
    });
    // Inline snapshot — first run captures the cardano-sdk canonical
    // CBOR; reviewer verifies it against the dapp's
    // `serialize(DustMappingDatum, value).toCbor()` output for the
    // same inputs before merging.
    expect(cbor).toMatchInlineSnapshot(
      `"d8799fd8799f581c00000000000000000000000000000000000000000000000000000000ff5820000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1fff"`,
    );
  });

  it('emits the Script (Constr 1) variant for script-credential c_wallet', () => {
    const scriptHash = new Uint8Array(28).fill(0xff);
    const data = encodeCWallet({ kind: 'script', scriptHash });
    expect(data.asConstrPlutusData()?.getAlternative()).toBe(1n);
  });
});
