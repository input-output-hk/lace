import { describe, expect, it } from 'vitest';

import { CardanoSyncFailureId } from '../../src';

import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';

describe('value-objects/cardano-sync-failure-id', () => {
  describe('CardanoSyncFailureId', () => {
    it('should create a failure ID with correct format', () => {
      const accountId = 'test-account-123' as AccountId;
      const failureId = CardanoSyncFailureId(accountId);

      expect(failureId).toBe('cardano-sync-test-account-123');
    });

    it('should be assignable to FailureId', () => {
      const accountId = 'test-account-123' as AccountId;
      const cardanoSyncFailureId = CardanoSyncFailureId(accountId);

      // Type compatibility test - should compile
      const failureId: FailureId = cardanoSyncFailureId;

      expect(failureId).toBe(cardanoSyncFailureId);
    });

    it('should create unique IDs for different accounts', () => {
      const accountId1 = 'account-1' as AccountId;
      const accountId2 = 'account-2' as AccountId;

      const failureId1 = CardanoSyncFailureId(accountId1);
      const failureId2 = CardanoSyncFailureId(accountId2);

      expect(failureId1).not.toBe(failureId2);
    });
  });

  describe('CardanoSyncFailureId.is', () => {
    it('should return true for valid CardanoSyncFailureId', () => {
      const accountId = 'test-account-123' as AccountId;
      const failureId = CardanoSyncFailureId(accountId);

      expect(CardanoSyncFailureId.is(failureId)).toBe(true);
    });

    it('should return false for other failure IDs', () => {
      const otherFailureId = 'midnight-wallet-error' as FailureId;

      expect(CardanoSyncFailureId.is(otherFailureId)).toBe(false);
    });
  });

  describe('CardanoSyncFailureId.extractAccountId', () => {
    it('should extract the account ID from a CardanoSyncFailureId', () => {
      const accountId = 'wallet-abc-0-764824073' as AccountId;
      const failureId = CardanoSyncFailureId(accountId);

      expect(CardanoSyncFailureId.extractAccountId(failureId)).toBe(accountId);
    });
  });
});
