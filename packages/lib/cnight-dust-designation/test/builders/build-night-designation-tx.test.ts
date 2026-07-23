import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { buildNightDesignationTxBlueprint } from '../../src/builders/build-night-designation-tx';
import { LOVELACE_FOR_REGISTRATION } from '../../src/constants';
import { getDustGeneratorPaymentAddress } from '../../src/plutus/script-address';
import { CardanoPaymentKeyHash } from '../../src/value-objects/cardano-payment-key-hash.vo';
import { CardanoStakeKeyHash } from '../../src/value-objects/cardano-stake-key-hash.vo';
import { MidnightCoinPubkey } from '../../src/value-objects/midnight-coin-pubkey.vo';
import { CardanoDustNetwork } from '../../src/value-objects/network-id.vo';

import type { BuildNightDesignationTxParams } from '../../src/builders/types';

const PLACEHOLDER_ADDRESS = getDustGeneratorPaymentAddress(
  CardanoDustNetwork.testnet,
);

// =====================================================================
// buildNightDesignationTxBlueprint structural tests.
// =====================================================================
// The Phase 1 lib returns a blueprint — coin selection, fee, ex-units,
// and balancing happen in Phase 2. Tests here verify the blueprint
// shape for each action variant + the negative paths from the test
// plan's edge case matrix.
// =====================================================================

const stakeKeyHash = CardanoStakeKeyHash(new Uint8Array(28).fill(0xab));
const paymentKeyHash = CardanoPaymentKeyHash(new Uint8Array(28).fill(0xcd));
const dustPubkey = MidnightCoinPubkey(new Uint8Array(32).fill(0xef));

const makeUtxo = (txId: string, index: number): Cardano.Utxo =>
  [
    { txId: Cardano.TransactionId(txId), index },
    {
      address: PLACEHOLDER_ADDRESS,
      value: { coins: 5_000_000n },
    },
  ] as unknown as Cardano.Utxo;

const cnightUtxos = [makeUtxo('0'.repeat(64), 0), makeUtxo('1'.repeat(64), 1)];

const registrationUtxo = makeUtxo('a'.repeat(64), 0);

// Conway baseline coinsPerUtxoByte at the time this test was written
// (mainnet protocol parameter 4310). The dynamic min-utxo
// computation yields LOVELACE_FOR_REGISTRATION's existing value at
// this coin-per-byte rate for the cnight script-output shape.
const DEFAULT_COINS_PER_UTXO_BYTE = 4310;

const baseParams = (
  overrides: Partial<BuildNightDesignationTxParams> = {},
): BuildNightDesignationTxParams => ({
  network: CardanoDustNetwork.testnet,
  cnightUtxos,
  stakeKeyHash,
  paymentKeyHash,
  action: { kind: 'register', dustPubkey },
  coinsPerUtxoByte: DEFAULT_COINS_PER_UTXO_BYTE,
  ...overrides,
});

describe('buildNightDesignationTxBlueprint — register', () => {
  it('returns ok with the expected blueprint shape', () => {
    const result = buildNightDesignationTxBlueprint(baseParams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const bp = result.value;
    expect(bp.network).toBe(CardanoDustNetwork.testnet);
    expect(bp.forcedInputs).toEqual(cnightUtxos);
    expect(bp.scriptOutput).not.toBeNull();
    expect(bp.scriptOutput?.lovelace).toBe(LOVELACE_FOR_REGISTRATION);
    expect(bp.scriptOutput?.nftQuantity).toBe(1n);
    expect(bp.scriptOutput?.inlineDatumCbor.length).toBeGreaterThan(0);

    expect(bp.mint).not.toBeNull();
    expect(bp.mint?.quantity).toBe(1n);
    expect(bp.mint?.assetName.toString()).toBe('');

    expect(bp.spendRedeemer).toBeNull();
    expect(bp.withdrawal).toBeNull();

    expect(bp.requiredSigners.paymentKeyHash).toBe(paymentKeyHash);
    expect(bp.requiredSigners.stakeKeyHash).toBe(stakeKeyHash);
  });

  it('mint policy id equals NFT asset policy id', () => {
    const result = buildNightDesignationTxBlueprint(baseParams());
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.mint?.policyId.toString()).toBe(
      Cardano.AssetId.getPolicyId(
        result.value.dustMappingNftAssetId,
      ).toString(),
    );
  });
});

describe('buildNightDesignationTxBlueprint — update', () => {
  it('forces both cNIGHT and registration UTxO as inputs', () => {
    const result = buildNightDesignationTxBlueprint(
      baseParams({
        action: {
          kind: 'update',
          dustPubkey,
          registrationUtxo,
          scriptWithdrawableLovelace: 1_234_567n,
        },
      }),
    );
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.forcedInputs).toHaveLength(cnightUtxos.length + 1);
    expect(result.value.forcedInputs.at(-1)).toBe(registrationUtxo);
  });

  it('attaches spend redeemer + withdrawal entry; no mint', () => {
    const result = buildNightDesignationTxBlueprint(
      baseParams({
        action: {
          kind: 'update',
          dustPubkey,
          registrationUtxo,
          scriptWithdrawableLovelace: 1_234_567n,
        },
      }),
    );
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.spendRedeemer).not.toBeNull();
    expect(result.value.spendRedeemer?.registrationUtxo).toBe(registrationUtxo);
    expect(result.value.withdrawal).not.toBeNull();
    expect(result.value.withdrawal?.lovelace).toBe(1_234_567n);
    expect(result.value.mint).toBeNull();
  });

  it('passes through zero withdrawable amount', () => {
    const result = buildNightDesignationTxBlueprint(
      baseParams({
        action: {
          kind: 'update',
          dustPubkey,
          registrationUtxo,
          scriptWithdrawableLovelace: 0n,
        },
      }),
    );
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.withdrawal?.lovelace).toBe(0n);
  });
});

describe('buildNightDesignationTxBlueprint — deregister', () => {
  it('mints -1 with the Burn redeemer and produces no script output', () => {
    const result = buildNightDesignationTxBlueprint(
      baseParams({
        action: { kind: 'deregister', registrationUtxo },
      }),
    );
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.scriptOutput).toBeNull();
    expect(result.value.mint?.quantity).toBe(-1n);
    expect(result.value.spendRedeemer?.registrationUtxo).toBe(registrationUtxo);
    expect(result.value.withdrawal).toBeNull();
  });
});

describe('buildNightDesignationTxBlueprint — negative paths', () => {
  it('errors with no-cnight when wallet has zero cNIGHT UTxOs', () => {
    const result = buildNightDesignationTxBlueprint(
      baseParams({ cnightUtxos: [] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('no-cnight');
  });

  // The 32-byte construction in MidnightCoinPubkey() enforces length
  // first — to reach the builder's >33-byte guard we have to bypass
  // the constructor and cast a raw oversize Uint8Array directly. This
  // mirrors what a future hoist path consuming pre-decoded bech32m
  // payloads from external dapps would need to defend against.
  it('errors with dust-address-too-long when bypassing the VO constructor', () => {
    const oversize = new Uint8Array(64).fill(0x01) as ReturnType<
      typeof MidnightCoinPubkey
    >;
    const result = buildNightDesignationTxBlueprint(
      baseParams({
        action: { kind: 'register', dustPubkey: oversize },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('dust-address-too-long');
    if (result.error.code === 'dust-address-too-long') {
      expect(result.error.actualBytes).toBe(64);
      expect(result.error.maxBytes).toBe(33);
    }
  });

  it('blueprint changes script address when network changes', () => {
    const testnetResult = buildNightDesignationTxBlueprint(baseParams());
    const mainnetResult = buildNightDesignationTxBlueprint(
      baseParams({ network: CardanoDustNetwork.mainnet }),
    );
    if (!testnetResult.ok || !mainnetResult.ok) throw new Error('expected ok');
    expect(testnetResult.value.scriptAddress.toString()).not.toBe(
      mainnetResult.value.scriptAddress.toString(),
    );
  });
});
