import { renderHook, act } from '@testing-library/react-hooks';
import { LockSlice, WalletInfoSlice } from '../../types';
import '@testing-library/jest-dom';
import { lockSlice } from '../lock-slice';
import create, { GetState, SetState } from 'zustand';
import { saveValueInLocalStorage } from '@src/utils/local-storage';

const mockWalletLock = Buffer.from('test') as Uint8Array;
const mockLockSlice = (set: SetState<LockSlice>, get: GetState<LockSlice>): LockSlice => {
  const getState: GetState<LockSlice & WalletInfoSlice> = () => ({ ...get() } as LockSlice & WalletInfoSlice);
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
    const useLockHook = create<LockSlice>((set, get) => mockLockSlice(set, get));
    const { result } = renderHook(() => useLockHook());

    expect(typeof result.current.isWalletLocked).toEqual('function');
    expect(result.current.walletLock).toEqual(mockWalletLock);
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
