import { describe, expect, it } from 'vitest';

import { calculateNetBalance, getTransactionType } from '../src/common/utils';

import type { TokenTransferValue } from '../src/common/hooks';
import type { Cardano } from '@cardano-sdk/core';

describe('calculateNetBalance', () => {
  const createTokenTransferValue = (
    coins: bigint,
    assets: Map<Cardano.AssetId, bigint> = new Map(),
  ): TokenTransferValue => ({
    coins,
    assets,
  });

  describe('send scenarios (negative net balance)', () => {
    it('returns negative balance when spending from own address to foreign address', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpown...abc123' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(5_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpforeign...xyz789' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(4_000_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown...abc123'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(-5_000_000));
    });

    it('returns negative balance when spending more than receiving to own address', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpown...abc123' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(10_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpforeign...xyz789' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(6_000_000)),
        ],
        [
          'addr_test1qpown...abc123' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(3_500_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown...abc123'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(-6_500_000));
    });

    it('calculates correctly with multiple own addresses being spent', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpown1...abc' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(3_000_000)),
          ],
          [
            'addr_test1qpown2...def' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(2_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpforeign...xyz' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(4_500_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown1...abc', 'addr_test1qpown2...def'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(-5_000_000));
    });
  });

  describe('receive scenarios (positive net balance)', () => {
    it('returns positive balance when receiving from foreign address', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpforeign...xyz789' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(5_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpown...abc123' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(5_000_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown...abc123'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(5_000_000));
    });

    it('returns positive balance when receiving more than spending', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpown...abc123' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(1_000_000)),
          ],
          [
            'addr_test1qpforeign...xyz789' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(10_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpown...abc123' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(8_000_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown...abc123'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(7_000_000));
    });

    it('calculates correctly with multiple receiving addresses', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpforeign...xyz' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(10_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpown1...abc' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(4_000_000)),
        ],
        [
          'addr_test1qpown2...def' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(3_000_000)),
        ],
        [
          'addr_test1qpforeign...other' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(2_500_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown1...abc', 'addr_test1qpown2...def'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(7_000_000));
    });
  });

  describe('self-transaction scenarios (zero net balance)', () => {
    it('returns zero when sending and receiving equal amounts to/from own addresses', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpown...abc123' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(5_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpown...abc123' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(5_000_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown...abc123'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(0));
    });

    it('returns zero when net change between own addresses is zero', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpown1...abc' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(10_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpown2...def' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(9_800_000)),
        ],
        [
          'addr_test1qpown1...abc' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(200_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown1...abc', 'addr_test1qpown2...def'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(0));
    });
  });

  describe('edge cases', () => {
    it('returns zero when both address maps are empty', () => {
      const fromAddresses = new Map<
        Cardano.PaymentAddress,
        TokenTransferValue
      >();
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>();
      const ownAddresses = ['addr_test1qpown...abc123'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(0));
    });

    it('returns zero when ownAddresses array is empty', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qp...address1' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(5_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qp...address2' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(5_000_000)),
        ],
      ]);
      const ownAddresses: string[] = [];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(0));
    });

    it('ignores foreign addresses in fromAddresses', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpforeign...xyz789' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(100_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpown...abc123' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(5_000_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown...abc123'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(5_000_000));
    });

    it('ignores foreign addresses in toAddresses', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpown...abc123' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(5_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpforeign...xyz789' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(100_000_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown...abc123'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(-5_000_000));
    });

    it('handles mixed own and foreign addresses correctly', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpown...abc' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(7_000_000)),
          ],
          [
            'addr_test1qpforeign1...xyz' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(3_000_000)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpown...abc' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(1_000_000)),
        ],
        [
          'addr_test1qpforeign2...uvw' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(8_500_000)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown...abc'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(-6_000_000));
    });

    it('handles zero coin values', () => {
      const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>(
        [
          [
            'addr_test1qpown...abc' as Cardano.PaymentAddress,
            createTokenTransferValue(BigInt(0)),
          ],
        ],
      );
      const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          'addr_test1qpown...abc' as Cardano.PaymentAddress,
          createTokenTransferValue(BigInt(0)),
        ],
      ]);
      const ownAddresses = ['addr_test1qpown...abc'];

      const result = calculateNetBalance(
        fromAddresses,
        toAddresses,
        ownAddresses,
      );

      expect(result).toBe(BigInt(0));
    });
  });
});

describe('getTransactionType', () => {
  describe('returns Send for negative balance', () => {
    it('returns Send for small negative balance', () => {
      expect(getTransactionType(BigInt(-1))).toBe('Send');
    });

    it('returns Send for large negative balance', () => {
      expect(getTransactionType(BigInt(-1_000_000_000_000))).toBe('Send');
    });

    it('returns Send for typical send amount', () => {
      expect(getTransactionType(BigInt(-5_000_000))).toBe('Send');
    });
  });

  describe('returns Receive for positive balance', () => {
    it('returns Receive for small positive balance', () => {
      expect(getTransactionType(BigInt(1))).toBe('Receive');
    });

    it('returns Receive for large positive balance', () => {
      expect(getTransactionType(BigInt(1_000_000_000_000))).toBe('Receive');
    });

    it('returns Receive for typical receive amount', () => {
      expect(getTransactionType(BigInt(5_000_000))).toBe('Receive');
    });
  });

  describe('returns Self Transaction for zero balance', () => {
    it('returns Self Transaction for zero', () => {
      expect(getTransactionType(BigInt(0))).toBe('Self Transaction');
    });
  });
});
