import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  CardanoSyncOperationType,
  createSyncOperationId,
  isAddressDiscoveryOperation,
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
  });

  describe('isAddressDiscoveryOperation', () => {
    it('should return true for address discovery operation ID', () => {
      const operationId = 'account-1-tip-hash-123-address-discovery';
      expect(isAddressDiscoveryOperation(operationId)).toBe(true);
    });

    it('should return false for tokens operation ID', () => {
      const operationId = 'account-1-tip-hash-123-tokens';
      expect(isAddressDiscoveryOperation(operationId)).toBe(false);
    });

    it('should return false for other operation ID', () => {
      const operationId = 'account-1-tip-hash-123-metadata';
      expect(isAddressDiscoveryOperation(operationId)).toBe(false);
    });
  });
});
