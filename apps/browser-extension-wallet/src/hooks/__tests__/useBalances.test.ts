/* eslint-disable max-statements */
/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useBalances } from '../useBalances';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import * as apiTransformers from '../../api/transformers';

const total$ = new BehaviorSubject({ coins: 111 });
const available$ = new BehaviorSubject({ coins: 222 });
const deposit$ = new BehaviorSubject(333);
const rewards$ = new BehaviorSubject(444);

const inMemoryWallet = {
  balance: {
    utxo: {
      total$,
      available$
    },
    rewardAccounts: {
      deposit$,
      rewards$
    }
  }
};

jest.mock('../../stores', () => ({
  ...jest.requireActual<any>('../../stores'),
  useWalletStore: () => ({
    inMemoryWallet
  })
}));

describe('Testing useBalances hook', () => {
  test('should return proper balances', () => {
    const mockedTotal = 'mockedTotal';
    const mockedAvailable = 'mockedAvailable';
    const mockedRewards = 'mockedRewards';
    const mockedDeposit = 'mockedDeposit';
    const walletBalanceTransformerSpy = jest
      .spyOn(apiTransformers, 'walletBalanceTransformer')
      .mockReturnValueOnce(mockedTotal as any)
      .mockReturnValueOnce(mockedAvailable as any)
      .mockReturnValueOnce(mockedRewards as any)
      .mockReturnValueOnce(mockedDeposit as any);

    const fiatPrice = 'fiatPrice';
    const hook = renderHook(() => useBalances(fiatPrice as any));

    expect(hook.result.current.balance.total).toEqual(mockedTotal);
    expect(walletBalanceTransformerSpy).toHaveBeenNthCalledWith(1, BigInt(111 + 444).toString(), fiatPrice);
    expect(hook.result.current.balance.available).toEqual(mockedAvailable);
    expect(walletBalanceTransformerSpy).toHaveBeenNthCalledWith(2, BigInt(222 + 444).toString(), fiatPrice);
    expect(hook.result.current.rewards).toEqual(mockedRewards);
    expect(walletBalanceTransformerSpy).toHaveBeenNthCalledWith(3, '444', fiatPrice);
    expect(hook.result.current.deposit).toEqual(mockedDeposit);
    expect(walletBalanceTransformerSpy).toHaveBeenNthCalledWith(4, '333', fiatPrice);

    const newMockedTotal = 'newMockedTotal';
    const newMockedAvailable = 'newMockedAvailable';
    walletBalanceTransformerSpy.mockReset();
    walletBalanceTransformerSpy
      .mockReturnValueOnce(newMockedTotal as any)
      .mockReturnValueOnce(newMockedAvailable as any);

    act(() => {
      total$.next({ coins: undefined });
      available$.next({ coins: undefined });
      rewards$.next(undefined);
    });
    hook.rerender();
    expect(hook.result.current.balance.total).toEqual(newMockedTotal);
    expect(walletBalanceTransformerSpy).toHaveBeenNthCalledWith(1, BigInt(0).toString(), fiatPrice);
    expect(hook.result.current.balance.available).toEqual(newMockedAvailable);
    expect(walletBalanceTransformerSpy).toHaveBeenNthCalledWith(2, BigInt(0).toString(), fiatPrice);

    walletBalanceTransformerSpy.mockReset();
    act(() => {
      total$.next(undefined);
      available$.next(undefined);
      deposit$.next(undefined);
      rewards$.next(undefined);
    });
    hook.rerender();
    expect(hook.result.current.balance).toEqual(undefined);
    expect(hook.result.current.rewards).toEqual(undefined);
    expect(hook.result.current.deposit).toEqual(undefined);
    expect(walletBalanceTransformerSpy).not.toBeCalled();
  });
});
