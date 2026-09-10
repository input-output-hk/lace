import type { EarnRewardsFlowState } from '@lace-contract/earn-rewards';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Whether a flow found at sheet MOUNT is left over from a previous run and
 * must be reset before this surface adopts it.
 *
 * - Terminal states (Success/Error) are stale regardless of account: they were
 *   left by a mid-flight dismissal whose submission has since completed.
 * - Pre-submit states (CalculatingFees/Summary) scoped to ANOTHER account are
 *   stale: adopting them would let this surface confirm a transaction for a
 *   wallet the user is not looking at.
 * - In-flight states (AwaitingConfirmation/Processing) are never stale, even
 *   for another account — the submission is live, and a reset would discard
 *   the transaction the user already approved.
 */
export const isStaleFlowAtMount = (
  flowState: EarnRewardsFlowState | undefined,
  accountId: AccountId,
): boolean => {
  switch (flowState?.status) {
    case 'Success':
    case 'Error':
      return true;
    case 'CalculatingFees':
    case 'Summary':
      return flowState.accountId !== accountId;
    case 'Idle':
    case 'AwaitingConfirmation':
    case 'Processing':
    case undefined:
      return false;
  }
};
