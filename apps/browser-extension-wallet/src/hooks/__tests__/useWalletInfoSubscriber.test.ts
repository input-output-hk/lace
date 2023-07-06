/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-useless-undefined */
import { renderHook } from '@testing-library/react-hooks';
import { BehaviorSubject } from 'rxjs';

import * as stores from '@stores';
import { useWalletInfoSubscriber } from '@hooks/useWalletInfoSubscriber';
import * as getWallet from '@src/utils/get-wallet-from-storage';

jest.mock('@stores');

describe('Testing useWalletInfoSubscriber hook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({}));
  });

  test('should call setWalletInfo with proper name, address and rewardAccount', async () => {
    const setWalletInfo = jest.fn();
    jest.spyOn(getWallet, 'getWalletFromStorage').mockReturnValue({ name: 'name' });

    const inMemoryWallet = {
      addresses$: new BehaviorSubject([{ rewardAccount: 'rewardAccount', address: 'address' }])
    };
    jest.spyOn(stores, 'useWalletStore').mockImplementationOnce(() => ({
      inMemoryWallet,
      setWalletInfo
    }));

    renderHook(() => useWalletInfoSubscriber());

    expect(setWalletInfo).toBeCalledWith({
      name: 'name',
      addresses: [{ address: 'address', rewardAccount: 'rewardAccount' }]
    });
    expect(setWalletInfo).toBeCalledTimes(1);

    inMemoryWallet.addresses$.next([{ rewardAccount: 'rewardAccount1', address: 'address1' }]);
    expect(setWalletInfo).toBeCalledWith({
      name: 'name',
      addresses: [{ address: 'address1', rewardAccount: 'rewardAccount1' }]
    });
    expect(setWalletInfo).toBeCalledTimes(2);
  });

  test('should use default wallet name', async () => {
    const setWalletInfo = jest.fn();
    jest
      .spyOn(getWallet, 'getWalletFromStorage')
      .mockReturnValueOnce({ name: undefined })
      .mockReturnValueOnce(undefined);

    const inMemoryWallet = {
      addresses$: new BehaviorSubject([{ rewardAccount: 'rewardAccount', address: 'address' }])
    };
    jest.spyOn(stores, 'useWalletStore').mockImplementationOnce(() => ({
      inMemoryWallet,
      setWalletInfo
    }));
    renderHook(() => useWalletInfoSubscriber());

    expect(setWalletInfo).toHaveBeenNthCalledWith(1, {
      name: 'Lace',
      addresses: [{ address: 'address', rewardAccount: 'rewardAccount' }]
    });
    inMemoryWallet.addresses$.next([{ rewardAccount: 'rewardAccount1', address: 'address1' }]);

    expect(setWalletInfo).toHaveBeenNthCalledWith(2, {
      name: 'Lace',
      addresses: [{ address: 'address1', rewardAccount: 'rewardAccount1' }]
    });
  });

  test('should not subscribe', async () => {
    const setWalletInfo = jest.fn();
    jest
      .spyOn(getWallet, 'getWalletFromStorage')
      .mockReturnValueOnce({ name: undefined })
      .mockReturnValueOnce(undefined);

    jest.spyOn(stores, 'useWalletStore').mockImplementationOnce(() => ({
      inMemoryWallet: undefined,
      setWalletInfo
    }));
    renderHook(() => useWalletInfoSubscriber());

    expect(setWalletInfo).not.toBeCalled();
  });
});
