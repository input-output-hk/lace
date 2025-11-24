/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMaxAda, UTXO_DEPLETED_ADA_BUFFER } from '../useMaxAda';
import { renderHook } from '@testing-library/react-hooks';
import { mockWalletInfoTestnet } from '@src/utils/mocks/test-helpers';
import { Subject, of, BehaviorSubject } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { Status } from '@components/WalletStatus';

const MIN_COINS_FOR_TOKENS = 1_155_080;
const TX_FEE = 155_381;

const statusSubject = new BehaviorSubject({ text: 'test', status: Status.SYNCED });

const inspect = jest.fn();
const mockCreateTxBuilder = jest.fn().mockReturnValue({
  inspect,
  build: jest.fn().mockReturnThis(),
  addOutput: jest.fn().mockReturnThis(),
  removeOutput: jest.fn().mockReturnThis()
});
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
  createTxBuilder: mockCreateTxBuilder
};

jest.mock('../../stores', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../../stores'),
  useWalletStore: () => ({
    walletInfo: mockWalletInfoTestnet,
    inMemoryWallet
  }),
  useSyncStatus: () => statusSubject
}));

const outputMap = new Map();

jest.mock('../../views/browser-view/features/send-transaction', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../../views/browser-view/features/send-transaction'),
  useTransactionProps: () => ({
    outputMap
  })
}));

describe('Testing useMaxAda hook', () => {
  beforeEach(() => {
    inspect.mockResolvedValue({
      inputSelection: {
        fee: BigInt(TX_FEE)
      }
    });
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
    inspect.mockReset();
    inspect.mockImplementation(async () => {
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
        coins: BigInt(MIN_COINS_FOR_TOKENS) + BigInt(TX_FEE),
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

  test('should return balance minus fee', async () => {
    const { result } = renderHook(() => useMaxAda());

    act(() => {
      inMemoryWallet.balance.utxo.available$.next({ coins: BigInt('10000000') });
    });
    await waitFor(() => {
      expect(result.current).toBe(BigInt('10000000') - BigInt(TX_FEE));
    });
  });

  test('should return balance minus fee and minimun ada for tokens', async () => {
    const { result } = renderHook(() => useMaxAda());

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
      expect(result.current).toBe(BigInt('10000000') - BigInt(TX_FEE) - BigInt(MIN_COINS_FOR_TOKENS));
    });
  });

  test.each([1, 2, 3, 10])('should return balance minus fee and adaErrorBuffer times %i', async (errorCount) => {
    inspect.mockResolvedValueOnce({
      inputSelection: {
        fee: BigInt(TX_FEE)
      }
    });
    Array.from({ length: errorCount }).forEach(() => {
      inspect.mockImplementationOnce(() => {
        throw new Error('Error');
      });
    });

    const { result } = renderHook(() => useMaxAda());

    act(() => {
      inMemoryWallet.balance.utxo.available$.next({
        coins: BigInt('20000000')
      });
    });

    await waitFor(() => {
      expect(result.current).toBe(BigInt('20000000') - BigInt(TX_FEE) - BigInt(UTXO_DEPLETED_ADA_BUFFER * errorCount));
    });
  });

  test('should return balance minus fee and adaErrorBuffer times %i', async () => {
    inspect.mockResolvedValueOnce({
      inputSelection: {
        fee: BigInt(TX_FEE)
      }
    });
    Array.from({ length: 11 }).forEach(() => {
      inspect.mockImplementationOnce(() => {
        throw new Error('Error');
      });
    });

    const { result } = renderHook(() => useMaxAda());

    act(() => {
      inMemoryWallet.balance.utxo.available$.next({
        coins: BigInt('20000000')
      });
    });

    await waitFor(() => {
      expect(result.current).toBe(BigInt(0));
    });
  });
});
