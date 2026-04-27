/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../src/hooks';
import { useDeregistration } from '../../src/pages/deregister-pool/useDeregistration';

import type { CardanoAccountId } from '@lace-contract/cardano-context';

vi.mock('../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(),
  useStakePools: vi.fn(() => []),
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    sheets: {
      close: vi.fn(),
      navigate: vi.fn(),
    },
  },
}));

describe('useDeregistration', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
  const mockUseDispatchLaceAction = vi.mocked(
    hooksModule.useDispatchLaceAction,
  );

  const mockAccountIdA = 'account-A' as CardanoAccountId;
  const mockAccountIdB = 'account-B' as CardanoAccountId;

  const mockRequestFeeCalculation = vi.fn();
  const mockRequestDeregistration = vi.fn();
  const mockResetDeregistrationFlow = vi.fn();

  const createMockAccount = (accountId: string) => ({
    accountId,
    metadata: { name: 'Test Account' },
  });

  const createMockWallet = (accountId: string) => ({
    accounts: [createMockAccount(accountId)],
  });

  const setupDefaultMocks = (
    currentAccountId: CardanoAccountId,
    deregistrationFlowState: unknown,
  ) => {
    (
      mockUseDispatchLaceAction.mockImplementation as unknown as (
        implementation: (action: string) => ReturnType<typeof vi.fn>,
      ) => void
    )((action: string) => {
      if (action === 'deregistrationFlow.feeCalculationRequested') {
        return mockRequestFeeCalculation;
      }
      if (action === 'deregistrationFlow.deregistrationRequested') {
        return mockRequestDeregistration;
      }
      if (action === 'deregistrationFlow.reset') {
        return mockResetDeregistrationFlow;
      }
      return vi.fn();
    });

    mockUseLaceSelector.mockImplementation(
      (selector: string, params?: unknown) => {
        if (selector === 'deregistrationFlow.selectDeregistrationFlowState') {
          return deregistrationFlowState;
        }
        if (selector === 'cardanoContext.selectRewardAccountDetails') {
          return {
            [currentAccountId]: {
              rewardAccountInfo: {
                controlledAmount: { toString: () => '200000000' },
              },
            },
          };
        }
        if (selector === 'addresses.selectByAccountId') {
          return [{ data: { rewardAccount: 'stake_test1abc' } }];
        }
        if (selector === 'wallets.selectAll') {
          return [createMockWallet(currentAccountId)];
        }
        return params ?? {};
      },
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cross-account state leakage prevention', () => {
    it('should reset state when accountId does not match current sheet accountId', () => {
      // Account B's state is in the store (e.g., from previous deregistration)
      const stateForAccountB = {
        status: 'Summary',
        accountId: mockAccountIdB,
        fees: [{ amount: '200000' }],
        depositReturn: '2000000',
      };

      setupDefaultMocks(mockAccountIdA, stateForAccountB);

      // Render hook with Account A (different from state's Account B)
      renderHook(() => useDeregistration(mockAccountIdA));

      // Should trigger reset because state belongs to Account B
      expect(mockResetDeregistrationFlow).toHaveBeenCalled();
      // Should NOT request fee calculation for Account A yet (reset happens first)
      expect(mockRequestFeeCalculation).not.toHaveBeenCalled();
    });

    it('should NOT reset state when accountId matches current sheet accountId', () => {
      // Account A's state is in the store
      const stateForAccountA = {
        status: 'Summary',
        accountId: mockAccountIdA,
        fees: [{ amount: '200000' }],
        depositReturn: '2000000',
      };

      setupDefaultMocks(mockAccountIdA, stateForAccountA);

      // Render hook with Account A (same as state's Account A)
      renderHook(() => useDeregistration(mockAccountIdA));

      // Should NOT reset because state belongs to the same account
      expect(mockResetDeregistrationFlow).not.toHaveBeenCalled();
    });

    it('should request fee calculation when state is Idle', () => {
      const idleState = { status: 'Idle' };

      setupDefaultMocks(mockAccountIdA, idleState);

      renderHook(() => useDeregistration(mockAccountIdA));

      // Should request fee calculation for Account A
      expect(mockRequestFeeCalculation).toHaveBeenCalledWith({
        accountId: mockAccountIdA,
      });
    });

    it('should show "Calculating..." for fees when state is for different account', () => {
      // Account B's Summary state is in the store
      const stateForAccountB = {
        status: 'Summary',
        accountId: mockAccountIdB,
        fees: [{ amount: '200000' }],
        depositReturn: '2000000',
      };

      setupDefaultMocks(mockAccountIdA, stateForAccountB);

      const { result } = renderHook(() => useDeregistration(mockAccountIdA));

      // Props should show "Calculating..." because fees belong to different account
      expect(result.current?.depositReturn).toBe('Calculating...');
      expect(result.current?.transactionFee).toBe('Calculating...');
      expect(result.current?.total).toBe('Calculating...');
    });

    it('should show actual fees when state is for the same account', () => {
      // Account A's Summary state is in the store
      const stateForAccountA = {
        status: 'Summary',
        accountId: mockAccountIdA,
        fees: [{ amount: '200000' }],
        depositReturn: '2000000',
      };

      setupDefaultMocks(mockAccountIdA, stateForAccountA);

      const { result } = renderHook(() => useDeregistration(mockAccountIdA));

      // Props should show actual fees
      expect(result.current?.depositReturn).toBe('+2.000000');
      expect(result.current?.transactionFee).toBe('-0.200000');
    });

    it('should reset when Success state belongs to different account', () => {
      // Account B reached Success state
      const successStateForAccountB = {
        status: 'Success',
        accountId: mockAccountIdB,
        fees: [{ amount: '200000' }],
        depositReturn: '2000000',
        txId: 'tx123',
      };

      setupDefaultMocks(mockAccountIdA, successStateForAccountB);

      // Render hook with Account A
      renderHook(() => useDeregistration(mockAccountIdA));

      // Should reset because Success state belongs to Account B
      expect(mockResetDeregistrationFlow).toHaveBeenCalled();
    });
  });
});
