import { describe, expect, it } from 'vitest';

import { dustMappingDatumToCbor } from '../../src/plutus/datum';
import {
  datumMatchesStakeKey,
  decodeDustMappingDatum,
} from '../../src/plutus/datum-decode';
import { CardanoStakeKeyHash } from '../../src/value-objects/cardano-stake-key-hash.vo';
import { MidnightCoinPubkey } from '../../src/value-objects/midnight-coin-pubkey.vo';

const STAKE_KEY_HASH = CardanoStakeKeyHash(new Uint8Array(28).fill(0xab));
const DUST_PUBKEY = MidnightCoinPubkey(new Uint8Array(32).fill(0xef));

describe('decodeDustMappingDatum', () => {
  it('roundtrips a verification-key c_wallet datum', () => {
    const cbor = dustMappingDatumToCbor({
      cWallet: { kind: 'verificationKey', stakeKeyHash: STAKE_KEY_HASH },
      dustAddress: DUST_PUBKEY,
    });
    const decoded = decodeDustMappingDatum(cbor);
    expect(decoded).toBeDefined();
    if (!decoded) return;
    expect(decoded.cWallet.kind).toBe('verificationKey');
    if (decoded.cWallet.kind !== 'verificationKey') return;
    expect(Array.from(decoded.cWallet.stakeKeyHash)).toEqual(
      Array.from(STAKE_KEY_HASH),
    );
    expect(Array.from(decoded.dustAddress)).toEqual(Array.from(DUST_PUBKEY));
  });

  it('roundtrips a script-credential c_wallet datum', () => {
    const scriptHash = new Uint8Array(28).fill(0xff);
    const cbor = dustMappingDatumToCbor({
      cWallet: { kind: 'script', scriptHash },
      dustAddress: DUST_PUBKEY,
    });
    const decoded = decodeDustMappingDatum(cbor);
    expect(decoded?.cWallet.kind).toBe('script');
  });

  it('returns undefined for garbage CBOR', () => {
    expect(decodeDustMappingDatum('deadbeef')).toBeUndefined();
    expect(decodeDustMappingDatum('')).toBeUndefined();
    expect(decodeDustMappingDatum('not-hex')).toBeUndefined();
  });
});

describe('datumMatchesStakeKey', () => {
  it('matches when the datum carries the same stake-key-hash', () => {
    const cbor = dustMappingDatumToCbor({
      cWallet: { kind: 'verificationKey', stakeKeyHash: STAKE_KEY_HASH },
      dustAddress: DUST_PUBKEY,
    });
    const decoded = decodeDustMappingDatum(cbor)!;
    expect(datumMatchesStakeKey(decoded, STAKE_KEY_HASH)).toBe(true);
  });

  it('does not match when the stake-key-hash differs by one byte', () => {
    const cbor = dustMappingDatumToCbor({
      cWallet: { kind: 'verificationKey', stakeKeyHash: STAKE_KEY_HASH },
      dustAddress: DUST_PUBKEY,
    });
    const decoded = decodeDustMappingDatum(cbor)!;
    const different = new Uint8Array(28).fill(0xab);
    different[0] = 0x00; // flip one byte
    expect(datumMatchesStakeKey(decoded, CardanoStakeKeyHash(different))).toBe(
      false,
    );
  });

  it('does not match a script-credential c_wallet', () => {
    const scriptHash = new Uint8Array(28).fill(0xab); // same bytes, but wrong variant
    const cbor = dustMappingDatumToCbor({
      cWallet: { kind: 'script', scriptHash },
      dustAddress: DUST_PUBKEY,
    });
    const decoded = decodeDustMappingDatum(cbor)!;
    expect(datumMatchesStakeKey(decoded, STAKE_KEY_HASH)).toBe(false);
  });
});
