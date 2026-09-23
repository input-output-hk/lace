import { Serialization } from '@cardano-sdk/core';
import {
  CardanoDustNetwork,
  CardanoStakeKeyHash,
  MidnightCoinPubkey,
  dustMappingDatumToCbor,
  getDustGeneratorPaymentAddress,
  getDustMappingNftAssetId,
} from '@lace-lib/cnight-dust-designation';
import { describe, expect, it } from 'vitest';

import { findRegistrationUtxo } from '../../../src/store/night-designation/registration-utxo';

import type { Cardano } from '@cardano-sdk/core';

const network = CardanoDustNetwork.testnet;
const nftAssetId = getDustMappingNftAssetId(network);
const scriptAddress = getDustGeneratorPaymentAddress(network);

const stakeKeyHash = CardanoStakeKeyHash(new Uint8Array(28).fill(0xab));
const otherStakeKeyHash = CardanoStakeKeyHash(new Uint8Array(28).fill(0x11));
const dustPubkey = MidnightCoinPubkey(new Uint8Array(32).fill(0xef));

// A UTxO at the dust-generator script address, mirroring a real registration:
// mapping NFT (quantity 1) + an inline DustMappingDatum bound to a stake key.
const makeScriptUtxo = ({
  txId = '99'.repeat(32),
  boundStakeKeyHash = stakeKeyHash,
  nftQuantity = 1n,
  withDatum = true,
  datum,
}: {
  txId?: string;
  boundStakeKeyHash?: CardanoStakeKeyHash;
  nftQuantity?: bigint;
  withDatum?: boolean;
  datum?: Cardano.PlutusData;
} = {}): Cardano.Utxo => [
  { txId: txId as Cardano.TransactionId, index: 0, address: scriptAddress },
  {
    address: scriptAddress,
    value: { coins: 3_000_000n, assets: new Map([[nftAssetId, nftQuantity]]) },
    ...(withDatum
      ? {
          datum:
            datum ??
            Serialization.PlutusData.fromCbor(
              dustMappingDatumToCbor({
                cWallet: {
                  kind: 'verificationKey',
                  stakeKeyHash: boundStakeKeyHash,
                },
                dustAddress: dustPubkey,
              }),
            ).toCore(),
        }
      : {}),
  },
];

const find = (scriptUtxos: Cardano.Utxo[]) =>
  findRegistrationUtxo(scriptUtxos, nftAssetId, stakeKeyHash);

describe('findRegistrationUtxo', () => {
  it('returns the registration bound to the account stake key, ignoring decoys', () => {
    // The script address accumulates every account's mapping UTxO, so a decoy
    // bound to a different stake key must be skipped.
    const decoy = makeScriptUtxo({
      txId: 'aa'.repeat(32),
      boundStakeKeyHash: otherStakeKeyHash,
    });

    const result = find([decoy, makeScriptUtxo({ txId: '99'.repeat(32) })]);

    expect(result?.utxo[0].txId).toBe('99'.repeat(32));
    expect(result && MidnightCoinPubkey.toHex(result.datum.dustAddress)).toBe(
      MidnightCoinPubkey.toHex(dustPubkey),
    );
  });

  it('returns undefined when no UTxO is bound to the account stake key', () => {
    expect(
      find([makeScriptUtxo({ boundStakeKeyHash: otherStakeKeyHash })]),
    ).toBeUndefined();
  });

  it('ignores a matching datum that lacks the mapping NFT', () => {
    expect(find([makeScriptUtxo({ nftQuantity: 0n })])).toBeUndefined();
  });

  it('ignores a mapping-NFT UTxO with no inline datum (datum-by-hash)', () => {
    expect(find([makeScriptUtxo({ withDatum: false })])).toBeUndefined();
  });

  it('ignores a mapping-NFT UTxO whose inline datum is not a DustMappingDatum', () => {
    // NFT present + an inline datum decodeDustMappingDatum rejects (a bare
    // integer, not a Constr) — the `!datum` guard must skip it. This is the
    // "NFT gate disambiguates a stray output" safety net.
    expect(find([makeScriptUtxo({ datum: 42n })])).toBeUndefined();
  });

  it('skips a datum that cannot be re-encoded and still finds the registration behind it', () => {
    // Every account's marker sits at this one address, so a datum the
    // serializer throws on must not abort the scan — that would block this
    // account's designation for good, retry included.
    const malformed = makeScriptUtxo({
      txId: 'cc'.repeat(32),
      datum: { cbor: 'd8799f' } as unknown as Cardano.PlutusData,
    });

    expect(
      find([malformed, makeScriptUtxo({ txId: '99'.repeat(32) })])?.utxo[0]
        .txId,
    ).toBe('99'.repeat(32));
  });

  it('returns undefined for an empty script address', () => {
    expect(find([])).toBeUndefined();
  });
});
