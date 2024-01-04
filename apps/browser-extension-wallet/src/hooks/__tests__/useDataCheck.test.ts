/* eslint-disable unicorn/no-null */
/* eslint-disable sonarjs/no-duplicate-string */
import { storage } from 'webextension-polyfill';
import { Wallet } from '@lace/cardano';
import { renderHook, act } from '@testing-library/react-hooks';
import { useDataCheck } from '@hooks/useDataCheck';
import { WalletStorage } from '@src/types';
import { getValueFromLocalStorage, saveValueInLocalStorage } from '@src/utils/local-storage';
import { buildMockProviders, IMockProviders } from '@src/utils/mocks/context-providers';
import * as DataValidators from '@utils/data-validators';
import { mockKeyAgentDataTestnet, mockKeyAgentsByChain } from '@src/utils/mocks/test-helpers';

const setStorageHelper = async ({
  withLock,
  withKeyAgentData,
  isHardwareWallet,
  withWalletStorage,
  withAppSettings,
  withKeyAgentsByChain
}: {
  withLock?: boolean;
  withKeyAgentData?: boolean;
  isHardwareWallet?: boolean;
  withWalletStorage?: boolean;
  withAppSettings?: boolean;
  withKeyAgentsByChain?: boolean;
}) => {
  if (withLock) saveValueInLocalStorage({ key: 'lock', value: !isHardwareWallet ? Buffer.from('test') : null });
  if (withKeyAgentData) {
    saveValueInLocalStorage({
      key: 'keyAgentData',
      value: !isHardwareWallet
        ? mockKeyAgentDataTestnet
        : {
            ...mockKeyAgentDataTestnet,
            __typename: Wallet.KeyManagement.KeyAgentType.Ledger,
            communicationType: Wallet.KeyManagement.CommunicationType.Web
          }
    });
  }
  if (withWalletStorage) saveValueInLocalStorage({ key: 'wallet', value: { name: 'test wallet' } });
  if (withAppSettings) saveValueInLocalStorage({ key: 'appSettings', value: { chainName: 'Preview' } });
  if (withKeyAgentsByChain) {
    await storage.local.set({ BACKGROUND_STORAGE: { keyAgentsByChain: mockKeyAgentsByChain } });
  }
};

describe('useDataCheck', () => {
  let MockProviders: IMockProviders;

  beforeAll(async () => {
    ({ MockProviders } = await buildMockProviders({ walletStore: { environmentName: 'Preview' } }));
  });

  it('returns initial state as not-checked and data check function', () => {
    const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
    const [dataCheckState, checker] = result.current;

    expect(dataCheckState).toEqual({ checkState: 'not-checked' });
    expect(typeof checker).toEqual('function');
  });

  it('overrides the data check function', async () => {
    const fakeChecker = jest.fn();
    const { result } = renderHook(() => useDataCheck(fakeChecker), { wrapper: MockProviders });
    const [, checker] = result.current;
    await checker();

    expect(fakeChecker).toHaveBeenCalled();
  });

  describe('state dispatcher', () => {
    it('transitions to "checking" state', async () => {
      const fakeChecker = jest.fn().mockImplementation(async (dispatch) => {
        dispatch({ type: 'checking' });
      });
      const { result } = renderHook(() => useDataCheck(fakeChecker), { wrapper: MockProviders });
      expect(result.current[0]).toEqual({ checkState: 'not-checked' });

      act(() => {
        result.current[1]();
      });
      expect(result.current[0]).toEqual({ checkState: 'checking' });
    });

    it('transitions to "checked" state with a valid result', async () => {
      const fakeChecker = jest.fn().mockImplementation(async (dispatch) => {
        dispatch({ type: 'valid' });
      });
      const { result } = renderHook(() => useDataCheck(fakeChecker), { wrapper: MockProviders });
      expect(result.current[0]).toEqual({ checkState: 'not-checked' });

      act(() => {
        result.current[1]();
      });
      expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
    });

    it('transitions to "error" state with an invalid result', async () => {
      const fakeChecker = jest.fn().mockImplementation(async (dispatch) => {
        dispatch({ type: 'error', error: 'Invalid data check' });
      });
      const { result } = renderHook(() => useDataCheck(fakeChecker), { wrapper: MockProviders });
      expect(result.current[0]).toEqual({ checkState: 'not-checked' });

      act(() => {
        result.current[1]();
      });
      expect(result.current[0]).toEqual({
        checkState: 'checked',
        result: { valid: false, error: 'Invalid data check' }
      });
    });
  });

  // TODO: all tests are timing out
  describe.skip('browser data checks', () => {
    afterEach(async () => {
      jest.restoreAllMocks();
      window.localStorage.clear();
      await storage.local.clear();
    });

    describe('return a valid state', () => {
      it.only('when no wallet created (empty storage)', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        await act(async () => {
          await result.current[1]();
        });

        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
      });

      it('when no wallet created, background storage is cleared', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({ withKeyAgentsByChain: true });
        await act(async () => {
          await result.current[1]();
        });

        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
        expect(await storage.local.get('BACKGROUND_STORAGE')).toEqual({});
      });

      it('for an unlocked wallet', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: true,
          withKeyAgentData: true,
          withKeyAgentsByChain: true,
          withWalletStorage: true,
          withAppSettings: true
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
      });

      it('for an unlocked wallet, if keyAgentsByChain is missing, delete keyAgentData', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: true,
          withKeyAgentData: true,
          withKeyAgentsByChain: false,
          withWalletStorage: true,
          withAppSettings: true
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
        expect(getValueFromLocalStorage('keyAgentData')).toBeUndefined();
      });

      it('for a locked wallet', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: true,
          withKeyAgentData: false,
          withKeyAgentsByChain: false,
          withWalletStorage: true,
          withAppSettings: true
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
      });

      it('for a hardware wallet', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: false,
          withKeyAgentData: true,
          isHardwareWallet: true,
          withKeyAgentsByChain: true,
          withWalletStorage: true,
          withAppSettings: true
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
      });

      it('when no wallet info available, name is set to Lace', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: true,
          withKeyAgentData: true,
          withKeyAgentsByChain: true,
          withAppSettings: true,
          withWalletStorage: false
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
        expect(getValueFromLocalStorage('wallet')).toEqual({ name: 'Lace' });
      });

      it('when invalid wallet info, name is set to Lace', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: true,
          withKeyAgentData: true,
          withKeyAgentsByChain: true,
          withAppSettings: true,
          withWalletStorage: false
        });
        saveValueInLocalStorage({ key: 'wallet', value: { invalidProperty: 'test' } as unknown as WalletStorage });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
        expect(getValueFromLocalStorage('wallet')).toEqual({ name: 'Lace' });
      });

      it('when no appSettings, chainName is set to the current one', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: true,
          withKeyAgentData: true,
          withKeyAgentsByChain: true,
          withAppSettings: false,
          withWalletStorage: true
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
        // environmentName set when mocking providers
        expect(getValueFromLocalStorage('appSettings')).toEqual({ chainName: 'Preview' });
      });
    });

    describe('return an error state', () => {
      it('for an unlocked in-memory wallet without lock', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: false,
          withKeyAgentData: true,
          withKeyAgentsByChain: true,
          withWalletStorage: true,
          withAppSettings: true
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({
          checkState: 'checked',
          result: { valid: false, error: 'Missing lock for InMemory wallet' }
        });
      });

      it('when keyAgentDate is not valid', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: true,
          withKeyAgentData: false,
          withKeyAgentsByChain: true,
          withWalletStorage: true,
          withAppSettings: true
        });
        saveValueInLocalStorage({
          key: 'keyAgentData',
          value: { notValid: 'test' } as unknown as Wallet.KeyManagement.SerializableKeyAgentData
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({
          checkState: 'checked',
          result: { valid: false, error: 'Invalid key agent data' }
        });
      });

      it('when keyAgentsByChain is missing a chain', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: true,
          withKeyAgentData: true,
          withKeyAgentsByChain: false,
          withWalletStorage: true,
          withAppSettings: true
        });
        await storage.local.set({
          BACKGROUND_STORAGE: {
            keyAgentsByChain: { Preview: mockKeyAgentsByChain.Preview, Preprod: mockKeyAgentsByChain.Mainnet }
          }
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({
          checkState: 'checked',
          result: { valid: false, error: 'Invalid key agents by chain' }
        });
      });

      it('when it is a hardware wallet and keyAgentsByChain is missing', async () => {
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: false,
          withKeyAgentData: true,
          isHardwareWallet: true,
          withKeyAgentsByChain: false,
          withWalletStorage: true,
          withAppSettings: true
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({
          checkState: 'checked',
          result: { valid: false, error: 'Missing key agents by chain' }
        });
      });

      it('when an unexpected error occurs while checking the data', async () => {
        jest.spyOn(DataValidators, 'isKeyAgentDataValid').mockImplementation(() => {
          throw new Error('Some exception');
        });
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({
          withLock: true,
          withKeyAgentData: false,
          withKeyAgentsByChain: true,
          withWalletStorage: true,
          withAppSettings: true
        });
        saveValueInLocalStorage({
          key: 'keyAgentData',
          value: { notValid: 'test' } as unknown as Wallet.KeyManagement.SerializableKeyAgentData
        });

        await act(async () => {
          await result.current[1]();
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: false, error: 'Some exception' } });
      });
    });
  });
});
