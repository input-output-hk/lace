import { describe, expect, it } from 'vitest';

import {
  dustActionBurnCbor,
  dustActionCreateCbor,
  dustMappingDatumToCbor,
} from '../../src/plutus/index';
import { CardanoStakeKeyHash } from '../../src/value-objects/cardano-stake-key-hash.vo';
import { MidnightCoinPubkey } from '../../src/value-objects/midnight-coin-pubkey.vo';

// =====================================================================
// Byte-compare against a second canonical CBOR encoder.
// =====================================================================
// The cnight_generates_dust validator's script address IS the hash
// of the script CBOR; the script verifies inline datums + redeemers
// against canonical Plutus-data encoding. Any drift between our
// Carbon-local `Serialization.PlutusData`-based encoder and the
// reference dApp's `@blaze-cardano/data` `serialize().toCbor()`
// would cause:
//
//   - Same script address (we ship the verbatim CBOR from the
//     validator repo), but
//   - Different datum bytes for the same Plutus-data value, which
//     breaks recognition of our designations by the rest of the
//     ecosystem (the reference dApp scanning the script address,
//     the Midnight indexer matching dust_address to recipients, etc).
//
// The validator repo (midnightntwrk/midnight-reserve-contracts) is
// the source of truth for the schema — the type definitions live in
// `validators/cnight_generates_dust.ak` (`DustMappingDatum`) — but
// it doesn't ship a TS encoder. The reference dApp
// (midnightntwrk/midnight-cnight-to-dust-dapp) is one available
// second canonical encoder; we use its `@blaze-cardano/data` output
// here as a cross-encoder check, not as a source-of-truth
// declaration.
//
// Reproduction:
//
//   1. Clone https://github.com/midnightntwrk/midnight-cnight-to-dust-dapp
//      and cp `dust-encode-fixtures.mjs` (the sibling Node ESM
//      script in this directory) into the dapp repo root. It
//      constructs the schema verbatim from the dApp's compiled
//      blueprint and emits CBOR via `@blaze-cardano/data`'s
//      `serialize().toCbor()`. The dApp's blueprint mirrors the
//      validator repo's `DustMappingDatum` type 1:1.
//   2. From inside the dapp dir: `node dust-encode-fixtures.mjs`
//   3. Paste the output as the constants below.
//
// If this test fails after a validator-repo redeploy, either the
// on-chain schema has changed (refresh the script CBOR blobs in
// `scripts/{testnet,mainnet}.ts` AND these fixtures together) or
// the reference dApp drifted from the validator's schema (rare —
// they're compiled from the same source).
// =====================================================================

// Canonical Aiken-emit-canon test vectors. Same inputs the dapp's
// fixture script produced; same inputs our existing inline-snapshot
// tests use.
const STAKE_KEY_HASH_ALL_ZERO = CardanoStakeKeyHash(new Uint8Array(28));
const STAKE_KEY_HASH_ALL_AB = CardanoStakeKeyHash(
  new Uint8Array(28).fill(0xab),
);
const DUST_PUBKEY_SEQUENTIAL = MidnightCoinPubkey(
  new Uint8Array(Array.from({ length: 32 }, (_, index) => index)),
);
const DUST_PUBKEY_ALL_ZERO = MidnightCoinPubkey(new Uint8Array(32));
const DUST_PUBKEY_ALL_EF = MidnightCoinPubkey(new Uint8Array(32).fill(0xef));
const SCRIPT_HASH_ALL_FF = new Uint8Array(28).fill(0xff);

// =====================================================================
// Dapp-produced CBOR fixtures.
// =====================================================================
// Captured from
// `cd <midnight-cnight-to-dust-dapp checkout> && node dust-encode-fixtures.mjs`
// — see the reproduction-instructions block above. DO NOT edit by
// hand; refresh by re-running the script.
const DAPP_FIXTURES = {
  dustActionCreate: 'd87980',
  dustActionBurn: 'd87a80',
  datumVkAllZeroStakeSequentialDust:
    'd8799fd8799f581c00000000000000000000000000000000000000000000000000000000ff5820000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1fff',
  datumScriptCredAllFFAllZeroDust:
    'd8799fd87a9f581cffffffffffffffffffffffffffffffffffffffffffffffffffffffffff58200000000000000000000000000000000000000000000000000000000000000000ff',
  datumVkAsymStakeAsymDust:
    'd8799fd8799f581cababababababababababababababababababababababababababababff5820efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefff',
} as const;

describe('CBOR byte-compare vs upstream dapp encoder', () => {
  describe('DustAction redeemers', () => {
    it('Create matches dapp output byte-for-byte', () => {
      expect(dustActionCreateCbor().toString()).toBe(
        DAPP_FIXTURES.dustActionCreate,
      );
    });

    it('Burn matches dapp output byte-for-byte', () => {
      expect(dustActionBurnCbor().toString()).toBe(
        DAPP_FIXTURES.dustActionBurn,
      );
    });
  });

  describe('DustMappingDatum', () => {
    it('VerificationKey c_wallet + all-zero stake + sequential dust pubkey', () => {
      const cbor = dustMappingDatumToCbor({
        cWallet: {
          kind: 'verificationKey',
          stakeKeyHash: STAKE_KEY_HASH_ALL_ZERO,
        },
        dustAddress: DUST_PUBKEY_SEQUENTIAL,
      });
      expect(cbor.toString()).toBe(
        DAPP_FIXTURES.datumVkAllZeroStakeSequentialDust,
      );
    });

    it('Script c_wallet (Constr 1 variant) + all-FF script hash + all-zero dust pubkey', () => {
      const cbor = dustMappingDatumToCbor({
        cWallet: { kind: 'script', scriptHash: SCRIPT_HASH_ALL_FF },
        dustAddress: DUST_PUBKEY_ALL_ZERO,
      });
      expect(cbor.toString()).toBe(
        DAPP_FIXTURES.datumScriptCredAllFFAllZeroDust,
      );
    });

    it('Asymmetric stake hash + dust pubkey — catches byte-order drift', () => {
      const cbor = dustMappingDatumToCbor({
        cWallet: {
          kind: 'verificationKey',
          stakeKeyHash: STAKE_KEY_HASH_ALL_AB,
        },
        dustAddress: DUST_PUBKEY_ALL_EF,
      });
      expect(cbor.toString()).toBe(DAPP_FIXTURES.datumVkAsymStakeAsymDust);
    });
  });
});
