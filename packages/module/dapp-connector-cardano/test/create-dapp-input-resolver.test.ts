import { Cardano, Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { createDappInputResolver } from '../src/common/utils/create-dapp-input-resolver';

import type { SerializedForeignResolvedInput } from '../src/common/store/slice';

const mockTxId1 = Cardano.TransactionId(
  '260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f',
);
const mockTxId2 = Cardano.TransactionId(
  '0000000000000000000000000000000000000000000000000000000000000002',
);

const mockAddress = Cardano.PaymentAddress(
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
);

const createMockTxOut = (lovelace: bigint): Cardano.TxOut => ({
  address: mockAddress,
  value: { coins: lovelace },
});

const createMockUtxo = (
  txId: Cardano.TransactionId,
  index: number,
  lovelace: bigint,
): Cardano.Utxo => [
  { txId, index, address: mockAddress },
  createMockTxOut(lovelace),
];

const createForeignResolvedInput = (
  txId: string,
  index: number,
  lovelace: bigint,
): SerializedForeignResolvedInput => ({
  txIn: { txId, index },
  txOutCbor: Serialization.TransactionOutput.fromCore(
    createMockTxOut(lovelace),
  ).toCbor() as string,
});

describe('createDappInputResolver', () => {
  describe('local UTXO lookup', () => {
    it('returns TxOut for an input found in local UTXOs', async () => {
      const localUtxos = [createMockUtxo(mockTxId1, 1, 5_000_000n)];
      const resolver = createDappInputResolver(localUtxos, []);

      const result = await resolver.resolveInput({ txId: mockTxId1, index: 1 });

      expect(result).toEqual(createMockTxOut(5_000_000n));
    });

    it('returns null when input is not in local UTXOs and there are no foreign inputs', async () => {
      const localUtxos = [createMockUtxo(mockTxId1, 0, 5_000_000n)];
      const resolver = createDappInputResolver(localUtxos, []);

      const result = await resolver.resolveInput({ txId: mockTxId2, index: 0 });

      expect(result).toBeNull();
    });

    it('returns null when local UTXOs is empty and there are no foreign inputs', async () => {
      const resolver = createDappInputResolver([], []);

      const result = await resolver.resolveInput({ txId: mockTxId1, index: 1 });

      expect(result).toBeNull();
    });

    it('resolves by txId and index when multiple UTXOs share the same txId', async () => {
      const localUtxos = [
        createMockUtxo(mockTxId1, 0, 1_000_000n),
        createMockUtxo(mockTxId1, 1, 2_000_000n),
        createMockUtxo(mockTxId1, 2, 3_000_000n),
      ];
      const resolver = createDappInputResolver(localUtxos, []);

      const result = await resolver.resolveInput({ txId: mockTxId1, index: 1 });

      expect(result).toEqual(createMockTxOut(2_000_000n));
    });
  });

  describe('foreign resolved inputs lookup', () => {
    it('decodes and returns TxOut from foreignResolvedInputs when not in local UTXOs', async () => {
      const foreignInputs: SerializedForeignResolvedInput[] = [
        createForeignResolvedInput(mockTxId1, 1, 10_000_000n),
      ];
      const resolver = createDappInputResolver([], foreignInputs);

      const result = await resolver.resolveInput({ txId: mockTxId1, index: 1 });

      expect(result?.value.coins).toBe(10_000_000n);
    });

    it('returns null when txId matches but index differs in foreignResolvedInputs', async () => {
      const foreignInputs: SerializedForeignResolvedInput[] = [
        createForeignResolvedInput(mockTxId1, 1, 10_000_000n),
      ];
      const resolver = createDappInputResolver([], foreignInputs);

      const result = await resolver.resolveInput({ txId: mockTxId1, index: 0 });

      expect(result).toBeNull();
    });

    it('returns null when index matches but txId differs in foreignResolvedInputs', async () => {
      const foreignInputs: SerializedForeignResolvedInput[] = [
        createForeignResolvedInput(mockTxId1, 1, 10_000_000n),
      ];
      const resolver = createDappInputResolver([], foreignInputs);

      const result = await resolver.resolveInput({ txId: mockTxId2, index: 1 });

      expect(result).toBeNull();
    });
  });

  describe('priority: local UTXOs over foreign resolved inputs', () => {
    it('returns the local UTXO value when both local and foreign resolve the same txIn', async () => {
      const localUtxos = [createMockUtxo(mockTxId1, 1, 5_000_000n)];
      const foreignInputs: SerializedForeignResolvedInput[] = [
        createForeignResolvedInput(mockTxId1, 1, 99_000_000n),
      ];
      const resolver = createDappInputResolver(localUtxos, foreignInputs);

      const result = await resolver.resolveInput({ txId: mockTxId1, index: 1 });

      expect(result?.value.coins).toBe(5_000_000n);
    });
  });
});
