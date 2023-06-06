import { Wallet } from '@lace/cardano';
import { renderHook, act } from '@testing-library/react-hooks';
import { LockSlice, WalletInfoSlice } from '../../types';
import '@testing-library/jest-dom';
import { lockSlice } from '../lock-slice';
import create, { GetState, SetState } from 'zustand';
import { mockKeyAgentDataTestnet } from '@src/utils/mocks/test-helpers';
import { saveValueInLocalStorage } from '@src/utils/local-storage';

const mockWalletLock = Buffer.from('test');
const mockLockSlice = (
  set: SetState<LockSlice>,
  get: GetState<LockSlice>,
  mocks?: { keyAgentData?: Wallet.KeyManagement.SerializableKeyAgentData }
): LockSlice => {
  const getState: GetState<LockSlice & WalletInfoSlice> = () =>
    ({ ...get(), keyAgentData: mocks?.keyAgentData } as LockSlice & WalletInfoSlice);
  return lockSlice({ set, get: getState });
};

describe('Testing lock slice', () => {
  beforeAll(() => {
    saveValueInLocalStorage({ key: 'lock', value: mockWalletLock });
  });
  afterAll(() => {
    window.localStorage.clear();
  });

  test('should create store hook with lock slice', () => {
    const useLockHook = create<LockSlice>((set, get) =>
      mockLockSlice(set, get, { keyAgentData: mockKeyAgentDataTestnet })
    );
    const { result } = renderHook(() => useLockHook());

    expect(typeof result.current.isWalletLocked).toEqual('function');
    expect(result.current.walletLock).toEqual(mockWalletLock);
    expect(typeof result.current.setWalletLock).toEqual('function');
  });

  test('should set wallet locked info', async () => {
    const useLockHook = create<LockSlice>((set, get) =>
      mockLockSlice(set, get, { keyAgentData: mockKeyAgentDataTestnet })
    );
    const { result, waitForNextUpdate } = renderHook(() => useLockHook());

    const newWalletLock = Buffer.from('new');

    await act(async () => {
      result.current.setWalletLock(newWalletLock);
      await waitForNextUpdate();
      expect(result.current.walletLock).toEqual(newWalletLock);
    });
  });

  test('should return true/false when wallet is locked/not locked', async () => {
    const useLockHook = create<LockSlice>((set, get) => mockLockSlice(set, get));
    const { result, waitForNextUpdate } = renderHook(() => useLockHook());

    await act(async () => {
      expect(result.current.isWalletLocked()).toEqual(true);
      result.current.resetWalletLock();
      await waitForNextUpdate();
      expect(result.current.isWalletLocked()).toEqual(false);
    });
  });
});
