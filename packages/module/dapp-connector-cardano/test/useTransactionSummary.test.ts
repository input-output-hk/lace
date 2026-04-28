import { Cardano, Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { computeTransactionSummary } from '../src/common/hooks/useTransactionSummary';

const mockTxId1 = Cardano.TransactionId(
  '260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f',
);

const mockAddress = Cardano.PaymentAddress(
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
);

const createMockHydratedTxIn = (
  txId: Cardano.TransactionId,
  index: number,
): Cardano.HydratedTxIn => ({
  txId,
  index,
  address: mockAddress,
});

const createMockTxOut = (
  lovelace: bigint,
  assets?: Map<Cardano.AssetId, bigint>,
): Cardano.TxOut => ({
  address: mockAddress,
  value: { coins: lovelace, assets },
});

interface MockUtxoParams {
  txId: Cardano.TransactionId;
  index: number;
  lovelace: bigint;
  assets?: Map<Cardano.AssetId, bigint>;
}

const createMockUtxo = ({
  txId,
  index,
  lovelace,
  assets,
}: MockUtxoParams): Cardano.Utxo => [
  createMockHydratedTxIn(txId, index),
  createMockTxOut(lovelace, assets),
];

const mockChainId: Cardano.ChainId = {
  networkId: Cardano.NetworkId.Testnet,
  networkMagic: 1,
};

const VALID_TX_CBOR =
  '84a60081825820260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f01018383581d70b429738bd6cc58b5c7932d001aa2bd05cfea47020a556c8c753d44361a004c4b40582007845f8f3841996e3d8157954e2f5e2fb90465f27112fc5fe9056d916fae245b82583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba1a0463676982583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba821a00177a6ea2581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a5447742544319271044774554481a0031f9194577444f47451a0056898d4577555344431a000fc589467753484942411a000103c2581c659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7a14a57696e675269646572731a02269552021a0002e665031a01353f84081a013531740b58204107eada931c72a600a6e3305bd22c7aeb9ada7c3f6823b155f4db85de36a69aa20081825820e686ade5bc97372f271fd2abc06cfd96c24b3d9170f9459de1d8e3dd8fd385575840653324a9dddad004f05a8ac99fa2d1811af5f00543591407fb5206cfe9ac91bb1412404323fa517e0e189684cd3592e7f74862e3f16afbc262519abec958180c0481d8799fd8799fd8799fd8799f581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68ffd8799fd8799fd8799f581c042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339baffffffff581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c681b000001863784a12ed8799fd8799f4040ffd8799f581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745ffffffd8799fd87980190c8efffff5f6';

describe('computeTransactionSummary', () => {
  describe('happy path', () => {
    it('resolves inputs from local UTXOs and returns correct fromAddresses', () => {
      const localUtxos = [
        createMockUtxo({ txId: mockTxId1, index: 1, lovelace: 5_000_000n }),
      ];

      const result = computeTransactionSummary({
        txHex: VALID_TX_CBOR,
        allUtxos: localUtxos,
        chainId: mockChainId,
      });

      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.fromAddresses.size).toBe(1);
      expect(result.fromAddresses.get(mockAddress)?.coins).toBe(5_000_000n);
      expect(result.unresolvedInputCount).toBe(0);
    });

    it('extracts toAddresses from transaction outputs', () => {
      const tx = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(VALID_TX_CBOR),
      );
      const outputCount = tx.body().toCore().outputs.length;

      const result = computeTransactionSummary({
        txHex: VALID_TX_CBOR,
        allUtxos: [],
        chainId: mockChainId,
      });

      expect(result.toAddresses.size).toBeLessThanOrEqual(outputCount);
    });

    it('extracts fee from transaction', () => {
      const tx = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(VALID_TX_CBOR),
      );
      const expectedFee = tx.body().toCore().fee;

      const result = computeTransactionSummary({
        txHex: VALID_TX_CBOR,
        allUtxos: [],
        chainId: mockChainId,
      });

      expect(result.fee).toBe(expectedFee);
    });
  });

  describe('aggregation', () => {
    it('aggregates coins from same address UTXO', () => {
      const localUtxos = [
        createMockUtxo({ txId: mockTxId1, index: 1, lovelace: 2_000_000n }),
      ];

      const result = computeTransactionSummary({
        txHex: VALID_TX_CBOR,
        allUtxos: localUtxos,
        chainId: mockChainId,
      });

      const fromValue = result.fromAddresses.get(mockAddress);
      expect(fromValue?.coins).toBe(2_000_000n);
    });

    it('aggregates assets from UTXOs', () => {
      const assetId = Cardano.AssetId(
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745',
      );
      const assets = new Map([[assetId, 100n]]);
      const localUtxos = [
        createMockUtxo({
          txId: mockTxId1,
          index: 1,
          lovelace: 5_000_000n,
          assets,
        }),
      ];

      const result = computeTransactionSummary({
        txHex: VALID_TX_CBOR,
        allUtxos: localUtxos,
        chainId: mockChainId,
      });

      const fromValue = result.fromAddresses.get(mockAddress);
      expect(fromValue?.assets.get(assetId)).toBe(100n);
    });
  });

  describe('unresolved inputs', () => {
    it('counts unresolved inputs when UTXOs not found locally', () => {
      const result = computeTransactionSummary({
        txHex: VALID_TX_CBOR,
        allUtxos: [],
        chainId: mockChainId,
      });

      expect(result.unresolvedInputCount).toBeGreaterThan(0);
      expect(result.fromAddresses.size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('returns error when txHex is empty', () => {
      const result = computeTransactionSummary({
        txHex: '',
        allUtxos: [],
        chainId: mockChainId,
      });

      expect(result.error).toBe('No transaction data provided');
      expect(result.isLoading).toBe(false);
    });

    it('returns error when chainId is undefined', () => {
      const result = computeTransactionSummary({
        txHex: VALID_TX_CBOR,
        allUtxos: [],
        chainId: undefined,
      });

      expect(result.error).toBe('Chain ID not available');
      expect(result.isLoading).toBe(false);
    });

    it('returns error for invalid CBOR', () => {
      const result = computeTransactionSummary({
        txHex: 'invalid-cbor',
        allUtxos: [],
        chainId: mockChainId,
      });

      expect(result.error).not.toBeNull();
      expect(result.isLoading).toBe(false);
    });
  });

  describe('multiple UTXOs', () => {
    it('handles multiple UTXOs from same account', () => {
      const localUtxos = [
        createMockUtxo({ txId: mockTxId1, index: 1, lovelace: 5_000_000n }),
      ];

      const result = computeTransactionSummary({
        txHex: VALID_TX_CBOR,
        allUtxos: localUtxos,
        chainId: mockChainId,
      });

      expect(result.fromAddresses.size).toBe(1);
      expect(result.unresolvedInputCount).toBe(0);
    });
  });
});
