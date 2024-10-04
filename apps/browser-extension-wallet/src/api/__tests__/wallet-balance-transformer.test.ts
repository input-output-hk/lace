/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { walletBalanceTransformer } from '../transformers';

describe('Testing walletBalanceTransformer function', () => {
  test('given a wallet balance in lovelace should return the balance in ada and undefined for fiat', () => {
    const result = walletBalanceTransformer('10000000');
    expect(result.coinBalance).toBe('10');
    expect(result.fiatBalance).toBeUndefined();
  });

  test('given a wallet balance in lovelace and a fiat price should return the balance in ada and in fiat', () => {
    const result = walletBalanceTransformer('10000000', 2);
    expect(result.coinBalance).toBe('10');
    expect(result.fiatBalance).toBe('20.00');
  });
});
