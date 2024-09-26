import { renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';

import { useBalance } from './balance';

import type { Wallet } from '@lace/cardano';

describe('useBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return initial state when observables are undefined', () => {
    const { result } = renderHook(() =>
      useBalance({
        inMemoryWallet: {
          balance: { utxo: {}, rewardAccounts: {} },
        } as Wallet.ObservableWallet,
      }),
    );

    expect(result.current).toEqual({
      totalCoins: BigInt(0),
      unspendableCoins: BigInt(0),
      lockedCoins: BigInt(0),
    });
  });

  test('should return total and unspendable coins when assets are undefined', () => {
    const total$ = of({
      coins: BigInt(5000),
      assets: undefined,
    });
    const unspendable$ = of({
      coins: BigInt(1000),
    });
    const rewards$ = of(BigInt(1000));

    const addresses$ = of([{ address: 'some-address' }]);
    const protocolParameters$ = of({
      coinsPerUtxoByte: 100,
    });

    const { result } = renderHook(() =>
      useBalance({
        inMemoryWallet: {
          balance: {
            utxo: { total$, unspendable$ },
            rewardAccounts: { rewards$ },
          },
          addresses$,
          protocolParameters$,
        } as Wallet.ObservableWallet,
      }),
    );

    expect(result.current).toEqual({
      totalCoins: BigInt(5000) + BigInt(1000),
      unspendableCoins: BigInt(1000),
      lockedCoins: BigInt(0),
    });
  });

  test('should calculate locked coins when assets are present', () => {
    const mockAssets = new Map([['asset1', BigInt(100)]]);
    const total$ = of({ coins: BigInt(10_000), assets: mockAssets });
    const rewards$ = of(BigInt(1000));
    const unspendable$ = of({
      coins: BigInt(1000),
    });
    const addresses$ = of([{ address: 'some-address' }]);
    const protocolParameters$ = of({
      coinsPerUtxoByte: 100,
    });
    const minAdaRequired = jest.fn().mockReturnValue(BigInt(1500));

    const { result } = renderHook(() =>
      useBalance({
        minAdaRequired,
        inMemoryWallet: {
          balance: {
            utxo: { total$, unspendable$ },
            rewardAccounts: { rewards$ },
          },
          addresses$,
          protocolParameters$,
        } as Wallet.ObservableWallet,
      }),
    );

    expect(minAdaRequired).toHaveBeenCalledWith(
      {
        address: 'some-address',
        value: {
          coins: BigInt(0),
          assets: mockAssets,
        },
      },
      BigInt(100),
    );

    expect(result.current).toEqual({
      totalCoins: BigInt(10_000) + BigInt(1000),
      unspendableCoins: BigInt(1000),
      lockedCoins: BigInt(1500),
    });
  });
});
