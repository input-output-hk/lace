import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { isStaleFlowAtMount } from '../../src/pages/stale-flow';

import type { EarnRewardsFlowState } from '@lace-contract/earn-rewards';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const mounted = AccountId('wallet-a-0-mainnet');
const other = AccountId('wallet-b-0-mainnet');

const state = (partial: Partial<EarnRewardsFlowState>) =>
  partial as EarnRewardsFlowState;

const wallet = {} as AnyWallet;

describe('isStaleFlowAtMount', () => {
  it('treats no flow and an Idle flow as fresh', () => {
    expect(isStaleFlowAtMount(undefined, mounted)).toBe(false);
    expect(isStaleFlowAtMount(state({ status: 'Idle' }), mounted)).toBe(false);
  });

  it.each(['Success', 'Error'] as const)(
    'treats a terminal %s as stale even for the mounted account',
    status => {
      expect(
        isStaleFlowAtMount(state({ status, accountId: mounted }), mounted),
      ).toBe(true);
      expect(
        isStaleFlowAtMount(state({ status, accountId: other }), mounted),
      ).toBe(true);
    },
  );

  it.each(['CalculatingFees', 'Summary'] as const)(
    'keeps a pre-submit %s scoped to the mounted account',
    status => {
      expect(
        isStaleFlowAtMount(state({ status, accountId: mounted }), mounted),
      ).toBe(false);
    },
  );

  // The LW-15323 case: a flow another account's surface left behind must not
  // be adopted — confirming it would sign that other account's transaction.
  it.each(['CalculatingFees', 'Summary'] as const)(
    'treats a pre-submit %s scoped to another account as stale',
    status => {
      expect(
        isStaleFlowAtMount(state({ status, accountId: other }), mounted),
      ).toBe(true);
    },
  );

  // Resetting a live submission would discard the approved transaction, so an
  // in-flight flow survives even when it belongs to another account.
  it.each(['AwaitingConfirmation', 'Processing'] as const)(
    'never treats an in-flight %s as stale',
    status => {
      expect(
        isStaleFlowAtMount(
          state({ status, accountId: mounted, wallet }),
          mounted,
        ),
      ).toBe(false);
      expect(
        isStaleFlowAtMount(
          state({ status, accountId: other, wallet }),
          mounted,
        ),
      ).toBe(false);
    },
  );
});
