import { renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';

import { getCollateralUtxo, useCollateral } from './collateral';

import type { Wallet } from '@lace/cardano';

const mockSubmitCollateralTx = jest.fn().mockResolvedValue(undefined);
const mockWithSignTxConfirmation = jest.fn().mockResolvedValue(undefined);
const mockSetUnspendable = jest.fn().mockResolvedValue(undefined);

describe('useCollateral', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return truthful hasCollateral value when unspendable coins value is equal to COLLATERAL_AMOUNT_LOVELACES', () => {
    const unspendable$ = of({
      coins: BigInt(5000),
    });
    const { result } = renderHook(() =>
      useCollateral({
        inMemoryWallet: {
          utxo: {
            setUnspendable: mockSetUnspendable,
          },
          balance: {
            utxo: { unspendable$ },
          },
        } as unknown as Wallet.ObservableWallet,
        submitCollateralTx: mockSubmitCollateralTx,
        withSignTxConfirmation: mockWithSignTxConfirmation,
      }),
    );

    expect(result.current.hasCollateral).toBeTruthy();
  });

  test('should return truthful hasCollateral value when unspendable coins value is greater than COLLATERAL_AMOUNT_LOVELACES', () => {
    const unspendable$ = of({
      coins: BigInt(5001),
    });
    const { result } = renderHook(() =>
      useCollateral({
        inMemoryWallet: {
          utxo: {
            setUnspendable: mockSetUnspendable,
          },
          balance: {
            utxo: { unspendable$ },
          },
        } as unknown as Wallet.ObservableWallet,
        submitCollateralTx: mockSubmitCollateralTx,
        withSignTxConfirmation: mockWithSignTxConfirmation,
      }),
    );

    expect(result.current.hasCollateral).toBeTruthy();
  });

  test('should return falsy hasCollateral value', () => {
    const unspendable$ = of({
      coins: BigInt(4999),
    });
    const { result } = renderHook(() =>
      useCollateral({
        inMemoryWallet: {
          utxo: {
            setUnspendable: mockSetUnspendable,
          },
          balance: {
            utxo: { unspendable$ },
          },
        } as unknown as Wallet.ObservableWallet,
        submitCollateralTx: mockSubmitCollateralTx,
        withSignTxConfirmation: mockWithSignTxConfirmation,
      }),
    );

    expect(result.current.hasCollateral).toBeFalsy();
  });

  test('should call setUnspendable with empty array when reclaiming collateral', async () => {
    const unspendable$ = of({
      coins: BigInt(4999),
    });
    const { result } = renderHook(() =>
      useCollateral({
        inMemoryWallet: {
          utxo: {
            setUnspendable: mockSetUnspendable,
          },
          balance: {
            utxo: { unspendable$ },
          },
        } as unknown as Wallet.ObservableWallet,
        submitCollateralTx: mockSubmitCollateralTx,
        withSignTxConfirmation: mockWithSignTxConfirmation,
      }),
    );

    expect(mockSetUnspendable).not.toBeCalled();

    await result.current.reclaimCollateral();

    expect(mockSetUnspendable).toBeCalledWith([]);
    expect(mockSetUnspendable).toBeCalledTimes(1);
  });

  test('should call withSignTxConfirmation with proper props when submitting collateral', async () => {
    const password = 'password';
    const unspendable$ = of({
      coins: BigInt(4999),
    });
    const { result } = renderHook(() =>
      useCollateral({
        inMemoryWallet: {
          utxo: {
            setUnspendable: mockSetUnspendable,
          },
          balance: {
            utxo: { unspendable$ },
          },
        } as unknown as Wallet.ObservableWallet,
        submitCollateralTx: mockSubmitCollateralTx,
        withSignTxConfirmation: mockWithSignTxConfirmation,
      }),
    );

    expect(mockWithSignTxConfirmation).not.toBeCalled();

    await result.current.submitCollateral(password);

    expect(mockWithSignTxConfirmation).toBeCalledWith(
      mockSubmitCollateralTx,
      password,
    );
    expect(mockWithSignTxConfirmation).toBeCalledTimes(1);
  });

  describe('getCollateralUtxo', () => {
    test('should return the UTXO that matches the tx ID and has enough ADA', async () => {
      const utxo = [{ txId: 'txId' }, { value: { coins: BigInt(5_000_000) } }];
      const available$ = of([utxo]);

      const foundUtxo = await getCollateralUtxo(
        'txId' as Wallet.Cardano.TransactionId,
        {
          utxo: {
            available$,
          },
        } as unknown as Wallet.ObservableWallet,
      );

      expect(foundUtxo).toEqual(utxo);
    });
  });
});
