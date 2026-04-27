import { Cardano } from '@cardano-sdk/core';
import { Ok, Err } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  createCombinedInputResolver,
  requiresForeignSignaturesFromCbor,
  txInEquals,
} from '../src/common/store/utils/input-resolver';

import type {
  CardanoProvider,
  CardanoProviderContext,
} from '@lace-contract/cardano-context';

const mockTxId1 = Cardano.TransactionId(
  '0000000000000000000000000000000000000000000000000000000000000001',
);
const mockTxId2 = Cardano.TransactionId(
  '0000000000000000000000000000000000000000000000000000000000000002',
);

const mockAddress = Cardano.PaymentAddress(
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
);

const createMockTxIn = (
  txId: Cardano.TransactionId,
  index: number,
): Cardano.TxIn => ({
  txId,
  index,
});

const createMockHydratedTxIn = (
  txId: Cardano.TransactionId,
  index: number,
): Cardano.HydratedTxIn => ({
  txId,
  index,
  address: mockAddress,
});

const createMockTxOut = (lovelace: bigint): Cardano.TxOut => ({
  address: mockAddress,
  value: { coins: lovelace },
});

const createMockUtxo = (
  txId: Cardano.TransactionId,
  index: number,
  lovelace: bigint,
): Cardano.Utxo => [
  createMockHydratedTxIn(txId, index),
  createMockTxOut(lovelace),
];

const mockContext: CardanoProviderContext = {
  chainId: {
    networkId: Cardano.NetworkId.Testnet,
    networkMagic: 1,
  },
};

const createMockCardanoProvider = (
  resolveInputMock: CardanoProvider['resolveInput'],
): CardanoProvider =>
  ({
    resolveInput: resolveInputMock,
  } as unknown as CardanoProvider);

describe('input-resolver', () => {
  describe('txInEquals', () => {
    it('returns true for matching txId and index', () => {
      const txIn1 = createMockTxIn(mockTxId1, 0);
      const txIn2 = createMockTxIn(mockTxId1, 0);

      expect(txInEquals(txIn1, txIn2)).toBe(true);
    });

    it('returns false for different txId', () => {
      const txIn1 = createMockTxIn(mockTxId1, 0);
      const txIn2 = createMockTxIn(mockTxId2, 0);

      expect(txInEquals(txIn1, txIn2)).toBe(false);
    });

    it('returns false for different index', () => {
      const txIn1 = createMockTxIn(mockTxId1, 0);
      const txIn2 = createMockTxIn(mockTxId1, 1);

      expect(txInEquals(txIn1, txIn2)).toBe(false);
    });

    it('returns false for different txId and index', () => {
      const txIn1 = createMockTxIn(mockTxId1, 0);
      const txIn2 = createMockTxIn(mockTxId2, 1);

      expect(txInEquals(txIn1, txIn2)).toBe(false);
    });
  });

  describe('createCombinedInputResolver', () => {
    describe('local hit', () => {
      it('returns TxOut from local UTXOs when input is found locally', async () => {
        const localUtxos = [
          createMockUtxo(mockTxId1, 0, 1_000_000n),
          createMockUtxo(mockTxId1, 1, 2_000_000n),
        ];
        const resolveInputMock = vi.fn();
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 0),
        );

        expect(result).toEqual(createMockTxOut(1_000_000n));
        expect(resolveInputMock).not.toHaveBeenCalled();
      });

      it('returns correct TxOut when multiple UTXOs exist for same txId', async () => {
        const localUtxos = [
          createMockUtxo(mockTxId1, 0, 1_000_000n),
          createMockUtxo(mockTxId1, 1, 2_000_000n),
          createMockUtxo(mockTxId1, 2, 3_000_000n),
        ];
        const resolveInputMock = vi.fn();
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 1),
        );

        expect(result).toEqual(createMockTxOut(2_000_000n));
        expect(resolveInputMock).not.toHaveBeenCalled();
      });
    });

    describe('local miss + remote hit', () => {
      it('falls back to CardanoProvider when input not found locally', async () => {
        const localUtxos = [createMockUtxo(mockTxId1, 0, 1_000_000n)];
        const remoteTxOut = createMockTxOut(5_000_000n);
        const resolveInputMock = vi.fn().mockReturnValue(of(Ok(remoteTxOut)));
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId2, 0),
        );

        expect(result).toEqual(remoteTxOut);
        expect(resolveInputMock).toHaveBeenCalledWith(
          createMockTxIn(mockTxId2, 0),
          mockContext,
        );
      });

      it('uses remote when local UTXOs array is empty', async () => {
        const localUtxos: Cardano.Utxo[] = [];
        const remoteTxOut = createMockTxOut(5_000_000n);
        const resolveInputMock = vi.fn().mockReturnValue(of(Ok(remoteTxOut)));
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 0),
        );

        expect(result).toEqual(remoteTxOut);
        expect(resolveInputMock).toHaveBeenCalled();
      });
    });

    describe('local miss + remote miss', () => {
      it('returns null when input not found locally and remote returns null', async () => {
        const localUtxos = [createMockUtxo(mockTxId1, 0, 1_000_000n)];
        const resolveInputMock = vi.fn().mockReturnValue(of(Ok(null)));
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId2, 0),
        );

        expect(result).toBeNull();
      });
    });

    describe('remote error handling', () => {
      it('returns null when remote provider returns an error', async () => {
        const localUtxos: Cardano.Utxo[] = [];
        const mockError = new Error('Network error');
        const resolveInputMock = vi.fn().mockReturnValue(of(Err(mockError)));
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 0),
        );

        expect(result).toBeNull();
      });

      it('returns null when observable completes without emitting', async () => {
        const localUtxos: Cardano.Utxo[] = [];
        const { EMPTY } = await import('rxjs');
        const resolveInputMock = vi.fn().mockReturnValue(EMPTY);
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 0),
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('requiresForeignSignaturesFromCbor (foreign inputs)', () => {
    // Transaction with a single input: 260aed6e...61f index 1
    const VALID_TX_CBOR =
      '84a60081825820260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f01018383581d70b429738bd6cc58b5c7932d001aa2bd05cfea47020a556c8c753d44361a004c4b40582007845f8f3841996e3d8157954e2f5e2fb90465f27112fc5fe9056d916fae245b82583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba1a0463676982583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba821a00177a6ea2581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a5447742544319271044774554481a0031f9194577444f47451a0056898d4577555344431a000fc589467753484942411a000103c2581c659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7a14a57696e675269646572731a02269552021a0002e665031a01353f84081a013531740b58204107eada931c72a600a6e3305bd22c7aeb9ada7c3f6823b155f4db85de36a69aa20081825820e686ade5bc97372f271fd2abc06cfd96c24b3d9170f9459de1d8e3dd8fd385575840653324a9dddad004f05a8ac99fa2d1811af5f00543591407fb5206cfe9ac91bb1412404323fa517e0e189684cd3592e7f74862e3f16afbc262519abec958180c0481d8799fd8799fd8799fd8799f581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68ffd8799fd8799fd8799f581c042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339baffffffff581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c681b000001863784a12ed8799fd8799f4040ffd8799f581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745ffffffd8799fd87980190c8efffff5f6';

    const TX_INPUT_TXID = Cardano.TransactionId(
      '260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f',
    );
    const TX_INPUT_INDEX = 1;

    // Empty knownAddresses to test only foreign inputs detection
    const emptyKnownAddresses: [] = [];

    it('returns false when all transaction inputs are in local UTXOs', () => {
      const localUtxos = [
        createMockUtxo(TX_INPUT_TXID, TX_INPUT_INDEX, 5_000_000n),
      ];

      const hasForeignSignatures = requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
      );

      expect(hasForeignSignatures).toBe(false);
    });

    it('returns true when transaction has inputs not in local UTXOs', () => {
      const localUtxos = [
        createMockUtxo(mockTxId1, 0, 1_000_000n),
        createMockUtxo(mockTxId2, 0, 2_000_000n),
      ];

      const hasForeignSignatures = requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
      );

      expect(hasForeignSignatures).toBe(true);
    });

    it('returns true when local UTXOs is empty', () => {
      const localUtxos: Cardano.Utxo[] = [];

      const hasForeignSignatures = requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
      );

      expect(hasForeignSignatures).toBe(true);
    });

    it('returns true when some inputs are local and some are foreign', () => {
      const localUtxos = [createMockUtxo(TX_INPUT_TXID, 0, 1_000_000n)];

      const hasForeignSignatures = requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
      );

      expect(hasForeignSignatures).toBe(true);
    });

    it('returns false when UTXO has same txId and index (different value is ok)', () => {
      const localUtxos = [
        createMockUtxo(TX_INPUT_TXID, TX_INPUT_INDEX, 999_999n),
      ];

      const hasForeignSignatures = requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
      );

      expect(hasForeignSignatures).toBe(false);
    });
  });
});
