import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { BigNumber } from '@lace-sdk/util';
import { describe, it, expect } from 'vitest';

import { getActivityTypeFromDelegationEntry } from '../../../src/store/helpers/get-activity-type-from-delegation-entry';

import type {
  DelegationInfo,
  RegistrationInfo,
  WithdrawalInfo,
} from '../../../src/types';

describe('getActivityTypeFromDelegationEntry', () => {
  describe('DelegationInfo', () => {
    it('should return ActivityType.Delegation for entries with poolId', () => {
      const delegationEntry: DelegationInfo = {
        activeEpoch: Cardano.EpochNo(100),
        txHash: Cardano.TransactionId(
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        ),
        amount: BigNumber(1000000n),
        poolId: Cardano.PoolId(
          'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
        ),
      };

      const result = getActivityTypeFromDelegationEntry(delegationEntry);

      expect(result).toBe(ActivityType.Delegation);
    });
  });

  describe('RegistrationInfo', () => {
    it('should return ActivityType.Registration for entries with action="registered"', () => {
      const registrationEntry: RegistrationInfo = {
        txHash: Cardano.TransactionId(
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        ),
        action: 'registered',
      };

      const result = getActivityTypeFromDelegationEntry(registrationEntry);

      expect(result).toBe(ActivityType.Registration);
    });

    it('should return ActivityType.Deregistration for entries with action="deregistered"', () => {
      const deregistrationEntry: RegistrationInfo = {
        txHash: Cardano.TransactionId(
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        ),
        action: 'deregistered',
      };

      const result = getActivityTypeFromDelegationEntry(deregistrationEntry);

      expect(result).toBe(ActivityType.Deregistration);
    });
  });

  describe('WithdrawalInfo', () => {
    it('should return ActivityType.Withdrawal for entries without poolId or action', () => {
      const withdrawalEntry: WithdrawalInfo = {
        txHash: Cardano.TransactionId(
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        ),
        amount: BigNumber(5000000n),
      };

      const result = getActivityTypeFromDelegationEntry(withdrawalEntry);

      expect(result).toBe(ActivityType.Withdrawal);
    });
  });

  describe('type discrimination', () => {
    it('should prioritize poolId over action when both are present (should not happen in practice)', () => {
      // This is a theoretical test - in practice, these types are mutually exclusive
      // But we test the actual behavior of the function
      const entryWithBoth = {
        poolId: Cardano.PoolId(
          'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
        ),
        action: 'registered',
        txHash: Cardano.TransactionId(
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        ),
        amount: BigNumber(1000000n),
      } as DelegationInfo & RegistrationInfo;

      const result = getActivityTypeFromDelegationEntry(entryWithBoth);

      // poolId check comes first, so it should return Delegation
      expect(result).toBe(ActivityType.Delegation);
    });

    it('should handle entries with action but no poolId correctly', () => {
      const registrationEntry: RegistrationInfo = {
        txHash: Cardano.TransactionId(
          'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
        ),
        action: 'registered',
      };

      const result = getActivityTypeFromDelegationEntry(registrationEntry);

      expect(result).toBe(ActivityType.Registration);
    });
  });
});
