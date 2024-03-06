/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useDelegationDetails } from '../useDelegationDetails';
import { BehaviorSubject } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { act } from 'react-dom/test-utils';

const delegatee = {
  currentEpoch: 'currentEpoch' as unknown as Wallet.Cardano.StakePool,
  nextEpoch: 'nextEpoch' as unknown as Wallet.Cardano.StakePool,
  nextNextEpoch: 'nextNextEpoch' as unknown as Wallet.Cardano.StakePool
};

const rewardAccounts$ = new BehaviorSubject([{ delegatee }]);

const inMemoryWallet = {
  delegation: {
    rewardAccounts$
  }
};

jest.mock('../../stores', () => ({
  ...jest.requireActual<any>('../../stores'),
  useWalletStore: () => ({
    inMemoryWallet
  })
}));

describe('Testing useBuildDelegation hook', () => {
  process.env.AVAILABLE_CHAINS = process.env.AVAILABLE_CHAINS || 'Mainnet,Preprod,Preview,Sanchonet';
  process.env.DEFAULT_CHAIN = process.env.DEFAULT_CHAIN || 'Preprod';

  test('should return use delegation details function', () => {
    const { result } = renderHook(() => useDelegationDetails());
    expect(result.current).toBeDefined();
  });

  describe('Testing use delegation details function', () => {
    test('should return proper delegation details', () => {
      const hook = renderHook(() => useDelegationDetails());
      expect(hook.result.current).toEqual(delegatee.nextNextEpoch);

      act(() => {
        rewardAccounts$.next(undefined);
      });
      hook.rerender();
      expect(hook.result.current).toEqual(undefined);

      act(() => {
        rewardAccounts$.next([undefined, undefined]);
      });
      hook.rerender();
      expect(hook.result.current).toEqual(null);

      act(() => {
        rewardAccounts$.next([{} as any, {} as any]);
      });
      hook.rerender();
      expect(hook.result.current).toEqual(null);

      act(() => {
        rewardAccounts$.next([
          {
            delegatee: {
              nextEpoch: 'nextEpoch' as unknown as Wallet.Cardano.StakePool,
              currentEpoch: 'currentEpoch' as unknown as Wallet.Cardano.StakePool
            } as any
          }
        ]);
      });
      hook.rerender();
      expect(hook.result.current).toEqual(delegatee.nextEpoch);

      act(() => {
        rewardAccounts$.next([
          {
            delegatee: {
              currentEpoch: 'currentEpoch' as unknown as Wallet.Cardano.StakePool
            } as any
          }
        ]);
      });
      hook.rerender();
      expect(hook.result.current).toEqual(delegatee.currentEpoch);
    });
  });
});
