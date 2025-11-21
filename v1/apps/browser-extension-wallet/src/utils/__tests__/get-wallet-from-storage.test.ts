/* eslint-disable unicorn/no-useless-undefined */
import { getWalletFromStorage } from '../get-wallet-from-storage';
import * as localStorage from '../local-storage';

describe('Testing getWalletFromStorage function', () => {
  test('should return value from local storage', () => {
    const lsSpy = jest.spyOn(localStorage, 'getValueFromLocalStorage');
    const wallet = 'wallet';
    lsSpy.mockReturnValueOnce(wallet);

    expect(getWalletFromStorage()).toBe(wallet);
    expect(lsSpy).toBeCalledWith('wallet');
    expect(lsSpy).toBeCalledTimes(1);

    lsSpy.mockRestore();
  });

  test('should return undefined', () => {
    const lsSpy = jest.spyOn(localStorage, 'getValueFromLocalStorage');
    lsSpy.mockReturnValueOnce(undefined);

    expect(getWalletFromStorage()).toBe(undefined);
    expect(lsSpy).toBeCalledWith('wallet');
    expect(lsSpy).toBeCalledTimes(1);

    lsSpy.mockRestore();
  });
});
