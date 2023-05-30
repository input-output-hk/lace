/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMaxAda } from '../useMaxAda';
import { renderHook } from '@testing-library/react-hooks';
import { mockWalletInfoTestnet } from '@src/utils/mocks/test-helpers';
import { Subject, of } from 'rxjs';
import { Wallet } from '@lace/cardano';

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
  initializeTx: () => ({
    inputSelection: {
      // eslint-disable-next-line no-magic-numbers
      fee: BigInt(155_381)
    }
  })
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
  test('should return 0', async () => {
    const { result } = renderHook(() => useMaxAda());
    expect(result.current.toString()).toBe('0');
  });

  test('should return 7874869', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMaxAda());
    inMemoryWallet.balance.utxo.available$.next({ coins: BigInt('10000000') });
    await waitForNextUpdate();
    expect(result.current.toString()).toBe('7874869');
  });

  test('should return 7874869', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMaxAda());
    inMemoryWallet.balance.utxo.available$.next({
      coins: BigInt('10000000'),
      asses: new Map([
        [
          Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
          BigInt('100000000')
        ]
      ])
    });
    await waitForNextUpdate();
    expect(result.current.toString()).toBe('7874869');
  });
});
