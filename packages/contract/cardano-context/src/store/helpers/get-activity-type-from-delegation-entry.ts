import { ActivityType } from '@lace-contract/activities';

import type {
  DelegationInfo,
  RegistrationInfo,
  WithdrawalInfo,
} from '../../types';

/**
 * Determines the ActivityType for a delegation, registration, or withdrawal entry.
 *
 * @param entry - A delegation, registration, or withdrawal entry
 * @returns The corresponding ActivityType
 */
export const getActivityTypeFromDelegationEntry = (
  entry: DelegationInfo | RegistrationInfo | WithdrawalInfo,
): ActivityType => {
  // Delegation entries have a poolId property
  if ('poolId' in entry) {
    return ActivityType.Delegation;
  }

  // Registration entries have an action property
  if ('action' in entry) {
    if (entry.action === 'registered') {
      return ActivityType.Registration;
    }
    if (entry.action === 'deregistered') {
      return ActivityType.Deregistration;
    }
  }

  // Default to Withdrawal for withdrawal entries
  return ActivityType.Withdrawal;
};
