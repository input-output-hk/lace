import { Cardano, Serialization } from '@cardano-sdk/core';
import { PREVIEW_REALFI_CONFIG } from '@lace-contract/realfi-staking';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildWithdrawUnsignedTx } from '../src/realfi-withdraw-tx';

import type { RealFiWithdrawableUnstake } from '@lace-contract/realfi-staking';

const OWNER_ADDRESS =
  'addr_test1qrtdjvvgalpl5pxqftpf5n6mz23ksvg3gwle040z7jarvxquvv2ng0zzk9yx3q627wnledw8gsy9vuljaw0j9vyjs2yqjjnenn';

const MIN_FEE_A = 44;
const MIN_FEE_B = 155_381;
const TIMELOCK_LOVELACE = 2_000_000n;
const TIMELOCK_USDR = 5_000_000n;
const TX_HASH = 'a'.repeat(64);

const UNSTAKES: RealFiWithdrawableUnstake[] = [
  {
    timelockUtxo: { txHash: TX_HASH, index: 0 },
    unlockSlot: 70_000_000,
    usdrAmount: '5000000',
  } as never,
];

const jsonResponse = (payload: unknown): Response =>
  ({ ok: true, json: async () => payload } as Response);

const mockBlockfrost = (timelockLovelace: bigint = TIMELOCK_LOVELACE) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    // blockfrostGet always calls fetch with a plain URL string.
    const url = input as string;
    if (url.includes('/txs/')) {
      return jsonResponse({
        outputs: [
          {
            output_index: 0,
            amount: [
              { unit: 'lovelace', quantity: timelockLovelace.toString() },
              {
                unit: PREVIEW_REALFI_CONFIG.usdrTokenId,
                quantity: TIMELOCK_USDR.toString(),
              },
            ],
          },
        ],
      });
    }
    if (url.includes('/blocks/latest')) {
      return jsonResponse({ slot: 70_100_000 });
    }
    if (url.includes('/epochs/latest/parameters')) {
      return jsonResponse({
        min_fee_a: MIN_FEE_A,
        min_fee_b: MIN_FEE_B,
        coins_per_utxo_size: '4310',
      });
    }
    throw new Error(`Unexpected Blockfrost call: ${url}`);
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildWithdrawUnsignedTx fee', () => {
  it('pays the ledger min fee for the signed size, not a flat constant', async () => {
    mockBlockfrost();
    const { cbor, feeLovelace } = await buildWithdrawUnsignedTx({
      config: PREVIEW_REALFI_CONFIG,
      blockfrost: { baseUrl: 'https://proxy.example/extension/preview' },
      changeAddressBech32: OWNER_ADDRESS,
      unstakes: UNSTAKES,
    });
    const body = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(cbor),
    ).toCore().body;

    // min_fee_b + min_fee_a × signed size — the signed tx adds one vkey
    // witness (~102 bytes) over the returned unsigned CBOR.
    const unsignedBytes = cbor.length / 2;
    expect(body.fee).toBeGreaterThan(
      BigInt(MIN_FEE_B + MIN_FEE_A * unsignedBytes),
    );
    expect(body.fee).toBeLessThan(
      BigInt(MIN_FEE_B + MIN_FEE_A * (unsignedBytes + 150)),
    );
    // Well under the old flat 0.5 ADA, and reported for the fee quote.
    expect(body.fee).toBeLessThan(500_000n);
    expect(feeLovelace).toBe(body.fee.toString());

    // The claim output returns everything minus exactly the fee.
    expect(body.outputs[0]?.value.coins).toBe(TIMELOCK_LOVELACE - body.fee);
    expect(
      body.outputs[0]?.value.assets?.get(
        Cardano.AssetId(PREVIEW_REALFI_CONFIG.usdrTokenId),
      ),
    ).toBe(TIMELOCK_USDR);
    expect(body.validityInterval?.invalidBefore).toBe(70_000_000);
  });
});

describe('buildWithdrawUnsignedTx ledger-validity guards', () => {
  it('fails the build when the return output would fall below the Babbage min-ADA', async () => {
    // 0.4 ADA at the timelock: enough for the fee (~0.17) but the remaining
    // coins cannot satisfy min-ADA for a token-carrying output.
    mockBlockfrost(400_000n);
    await expect(
      buildWithdrawUnsignedTx({
        config: PREVIEW_REALFI_CONFIG,
        blockfrost: { baseUrl: 'https://proxy.example/extension/preview' },
        changeAddressBech32: OWNER_ADDRESS,
        unstakes: UNSTAKES,
      }),
    ).rejects.toThrow('OutputTooSmallUTxO');
  });

  it('fails the build when the fee exceeds the timelocks’ own ADA', async () => {
    mockBlockfrost(100_000n);
    await expect(
      buildWithdrawUnsignedTx({
        config: PREVIEW_REALFI_CONFIG,
        blockfrost: { baseUrl: 'https://proxy.example/extension/preview' },
        changeAddressBech32: OWNER_ADDRESS,
        unstakes: UNSTAKES,
      }),
    ).rejects.toThrow('cannot fund itself');
  });
});
