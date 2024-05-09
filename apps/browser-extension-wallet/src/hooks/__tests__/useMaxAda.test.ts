/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMaxAda, UTXO_DEPLETED_ADA_BUFFER } from '../useMaxAda';
import { renderHook } from '@testing-library/react-hooks';
import { mockWalletInfoTestnet } from '@src/utils/mocks/test-helpers';
import { Subject, of } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
const mockInitializeTx = jest.fn();
const inspect = jest.fn().mockReturnThis();
const mockCreateTxBuilder = jest.fn().mockReturnValue({
  inspect,
  build: jest.fn().mockReturnThis(),
  addOutput: jest.fn().mockReturnThis()
});
const TX_FEE = 155_381;
const inMemoryWallet = {
  balance: {
    utxo: {
      available$: new Subject()
    },
    rewardAccounts: {
      rewards$: new Subject()
    }
  },
  protocolParameters$: of({ coinsPerUtxoByte: 4310, maxValueSize: 5000 }),
  initializeTx: mockInitializeTx,
  createTxBuilder: mockCreateTxBuilder
};

jest.mock('../../stores', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../../stores'),
  useWalletStore: () => ({
    walletInfo: mockWalletInfoTestnet,
    inMemoryWallet
  })
}));

describe('Testing useMaxAda hook', () => {
  beforeEach(() => {
    mockInitializeTx.mockImplementationOnce(() => ({
      inputSelection: {
        // eslint-disable-next-line no-magic-numbers
        fee: BigInt(TX_FEE)
      }
    }));
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 0 in case balance is empty', async () => {
    const { result } = renderHook(() => useMaxAda());
    expect(result.current.toString()).toBe('0');
  });

  test('should return 0 in case balance.coins is empty', async () => {
    const { result } = renderHook(() => useMaxAda());
    act(() => {
      inMemoryWallet.balance.utxo.available$.next({ coins: undefined });
    });

    await waitFor(() => {
      expect(result.current.toString()).toBe('0');
    });
  });

  test('should return 0 in case there is an error', async () => {
    mockInitializeTx.mockReset();
    mockInitializeTx.mockImplementation(async () => {
      throw new Error('init tx error');
    });
    const { result } = renderHook(() => useMaxAda());

    act(() => {
      inMemoryWallet.balance.utxo.available$.next({ coins: BigInt('10000000') });
    });
    await waitFor(() => {
      expect(result.current.toString()).toBe('0');
    });
  });

  test('should return 0 if balance is minimum for coins', async () => {
    const { result } = renderHook(() => useMaxAda());

    act(() => {
      inMemoryWallet.balance.utxo.available$.next({
        coins: BigInt('1155080') + BigInt(TX_FEE),
        assets: new Map([
          [
            Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
            BigInt('100000000')
          ]
        ])
      });
    });

    await waitFor(() => {
      expect(result.current.toString()).toBe('0');
    });
  });

  test('should return 8874869', async () => {
    const { result } = renderHook(() => useMaxAda());

    act(() => {
      inMemoryWallet.balance.utxo.available$.next({ coins: BigInt('10000000') });
    });
    await waitFor(() => {
      expect(result.current.toString()).toBe('8874869');
    });
  });

  test.each([[1], [3], [7]])('should return 8689539 minus adaErrorBuffer*%i', async (errorCount) => {
    const { result } = renderHook(() => useMaxAda());

    Array.from({ length: errorCount }).forEach(() => {
      inspect.mockImplementationOnce(() => {
        throw new Error('Error');
      });
    });

    act(() => {
      inMemoryWallet.balance.utxo.available$.next({
        coins: BigInt('10000000'),
        assets: new Map([
          [
            Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
            BigInt('100000000')
          ]
        ])
      });
    });

    await waitFor(() => {
      expect(result.current).toBe(BigInt('8689539') - BigInt(UTXO_DEPLETED_ADA_BUFFER * errorCount));
    });
  });
});
