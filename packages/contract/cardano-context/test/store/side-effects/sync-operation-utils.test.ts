import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  CardanoSyncOperationType,
  createSyncOperationId,
  isAddressDiscoveryOperation,
  isThoroughAddressDiscoveryOperation,
  isTransactionPollingOperation,
  parseTipHashFromOperationId,
} from '../../../src/store/side-effects/sync-operation-utils';

describe('sync-operation-utils', () => {
  describe('createSyncOperationId', () => {
    it('should create address discovery operation ID', () => {
      const operationId = createSyncOperationId(
        AccountId('account-1'),
        'tip-hash-123',
        CardanoSyncOperationType.ADDRESS_DISCOVERY,
      );
      expect(operationId).toBe('account-1-tip-hash-123-address-discovery');
    });

    it('should fall back to "no-tip" when tip hash is undefined', () => {
      const operationId = createSyncOperationId(
        AccountId('account-1'),
        undefined,
        CardanoSyncOperationType.ADDRESS_DISCOVERY,
      );
      expect(operationId).toBe('account-1-no-tip-address-discovery');
    });

    it('should create transaction polling operation ID', () => {
      const operationId = createSyncOperationId(
        AccountId('account-1'),
        'tip-hash-123',
        CardanoSyncOperationType.TRANSACTION_POLLING,
      );
      expect(operationId).toBe('account-1-tip-hash-123-transaction-polling');
    });

    it('should create thorough address discovery operation ID', () => {
      const operationId = createSyncOperationId(
        AccountId('account-1'),
        'tip-hash-123',
        CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH,
      );
      expect(operationId).toBe(
        'account-1-tip-hash-123-address-discovery-thorough',
      );
    });
  });

  describe('isAddressDiscoveryOperation', () => {
    it('should return true for standard address discovery operation ID', () => {
      const operationId = 'account-1-tip-hash-123-address-discovery';
      expect(isAddressDiscoveryOperation(operationId)).toBe(true);
    });

    it('should return true for thorough address discovery operation ID', () => {
      const operationId = 'account-1-tip-hash-123-address-discovery-thorough';
      expect(isAddressDiscoveryOperation(operationId)).toBe(true);
    });

    it('should return false for tokens operation ID', () => {
      const operationId = 'account-1-tip-hash-123-tokens';
      expect(isAddressDiscoveryOperation(operationId)).toBe(false);
    });

    it('should return false for transaction polling operation ID', () => {
      const operationId = 'account-1-tip-hash-123-transaction-polling';
      expect(isAddressDiscoveryOperation(operationId)).toBe(false);
    });

    it('should return false for other operation ID', () => {
      const operationId = 'account-1-tip-hash-123-metadata';
      expect(isAddressDiscoveryOperation(operationId)).toBe(false);
    });
  });

  describe('isThoroughAddressDiscoveryOperation', () => {
    it('should return true for thorough address discovery operation ID', () => {
      const operationId = 'account-1-tip-hash-123-address-discovery-thorough';
      expect(isThoroughAddressDiscoveryOperation(operationId)).toBe(true);
    });

    it('should return false for standard address discovery operation ID', () => {
      const operationId = 'account-1-tip-hash-123-address-discovery';
      expect(isThoroughAddressDiscoveryOperation(operationId)).toBe(false);
    });

    it('should return false for transaction polling operation ID', () => {
      const operationId = 'account-1-tip-hash-123-transaction-polling';
      expect(isThoroughAddressDiscoveryOperation(operationId)).toBe(false);
    });
  });

  describe('parseTipHashFromOperationId', () => {
    it('returns the tip hash for an operation id built with a tip hash', () => {
      const accountId = AccountId('account-1');
      const tipHash = 'tip-hash-123';
      const operationId = createSyncOperationId(
        accountId,
        tipHash,
        CardanoSyncOperationType.ADDRESS_DISCOVERY,
      );
      expect(
        parseTipHashFromOperationId({
          operationId,
          accountId,
          operationType: CardanoSyncOperationType.ADDRESS_DISCOVERY,
        }),
      ).toBe(tipHash);
    });

    it('returns undefined for an operation id built without a tip hash', () => {
      const accountId = AccountId('account-1');
      const operationId = createSyncOperationId(
        accountId,
        undefined,
        CardanoSyncOperationType.ADDRESS_DISCOVERY,
      );
      expect(
        parseTipHashFromOperationId({
          operationId,
          accountId,
          operationType: CardanoSyncOperationType.ADDRESS_DISCOVERY,
        }),
      ).toBeUndefined();
    });

    it('returns the tip hash for a thorough address discovery operation id', () => {
      const accountId = AccountId('account-1');
      const tipHash = 'tip-hash-123';
      const operationId = createSyncOperationId(
        accountId,
        tipHash,
        CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH,
      );
      expect(
        parseTipHashFromOperationId({
          operationId,
          accountId,
          operationType: CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH,
        }),
      ).toBe(tipHash);
    });
  });

  describe('isTransactionPollingOperation', () => {
    it('should return true for transaction polling operation ID', () => {
      const operationId = 'account-1-tip-hash-123-transaction-polling';
      expect(isTransactionPollingOperation(operationId)).toBe(true);
    });

    it('should return false for address discovery operation ID', () => {
      const operationId = 'account-1-tip-hash-123-address-discovery';
      expect(isTransactionPollingOperation(operationId)).toBe(false);
    });

    it('should return false for other operation ID', () => {
      const operationId = 'account-1-tip-hash-123-metadata';
      expect(isTransactionPollingOperation(operationId)).toBe(false);
    });
  });
});
