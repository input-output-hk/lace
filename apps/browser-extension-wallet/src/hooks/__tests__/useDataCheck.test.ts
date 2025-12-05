/* eslint-disable unicorn/no-null */
/* eslint-disable sonarjs/no-duplicate-string */
import { storage } from 'webextension-polyfill';
import { Wallet } from '@lace/cardano';
import { renderHook, act } from '@testing-library/react-hooks';
import { useDataCheck } from '@hooks/useDataCheck';
import { getValueFromLocalStorage, saveValueInLocalStorage } from '@src/utils/local-storage';
import { buildMockProviders, IMockProviders } from '@src/utils/mocks/context-providers';
import {
  InMemoryWallet,
  WalletManagerActivateProps,
  WalletRepositoryApi,
  WalletType
} from '@cardano-sdk/web-extension';
import { of, throwError } from 'rxjs';

const setStorageHelper = async ({ withAppSettings }: { withAppSettings?: boolean }) => {
  if (withAppSettings) saveValueInLocalStorage({ key: 'appSettings', value: { chainName: 'Preview' } });
};

describe('useDataCheck', () => {
  let MockProviders: IMockProviders;
  let walletRepository: jest.Mocked<WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>>;

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
    await checker(walletRepository);

    expect(fakeChecker).toHaveBeenCalled();
  });

  describe('state dispatcher', () => {
    it('transitions to "checking" state', async () => {
      const fakeChecker = jest.fn().mockImplementation(async (_, dispatch) => {
        dispatch({ type: 'checking' });
      });
      const { result } = renderHook(() => useDataCheck(fakeChecker), { wrapper: MockProviders });
      expect(result.current[0]).toEqual({ checkState: 'not-checked' });

      act(() => {
        result.current[1](walletRepository);
      });
      expect(result.current[0]).toEqual({ checkState: 'checking' });
    });

    it('transitions to "checked" state with a valid result', async () => {
      const fakeChecker = jest.fn().mockImplementation(async (_, dispatch) => {
        dispatch({ type: 'valid' });
      });
      const { result } = renderHook(() => useDataCheck(fakeChecker), { wrapper: MockProviders });
      expect(result.current[0]).toEqual({ checkState: 'not-checked' });

      act(() => {
        result.current[1](walletRepository);
      });
      expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
    });

    it('transitions to "error" state with an invalid result', async () => {
      const fakeChecker = jest.fn().mockImplementation(async (_, dispatch) => {
        dispatch({ type: 'error', error: 'Invalid data check' });
      });
      const { result } = renderHook(() => useDataCheck(fakeChecker), { wrapper: MockProviders });
      expect(result.current[0]).toEqual({ checkState: 'not-checked' });

      act(() => {
        result.current[1](walletRepository);
      });
      expect(result.current[0]).toEqual({
        checkState: 'checked',
        result: { valid: false, error: 'Invalid data check' }
      });
    });
  });

  describe('browser data checks', () => {
    const repositoryWalletId = 'walletId';
    const wmActiveWalletId = {
      walletId: repositoryWalletId,
      accountIndex: 0
    } as WalletManagerActivateProps;
    const repositoryWallets = [
      {
        type: WalletType.InMemory,
        walletId: wmActiveWalletId.walletId,
        accounts: [
          {
            accountIndex: wmActiveWalletId.accountIndex,
            metadata: { name: 'wally acc' },
            extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex(
              'fc5ab25e830b67c47d0a17411bf7fdabf711a597fb6cf04102734b0a2934ceaaa65ff5e7c52498d52c07b8ddfcd436fc2b4d2775e2984a49d0c79f65ceee4779'
            )
          }
        ],
        encryptedSecrets: {}
      } as InMemoryWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
    ];

    beforeEach(() => {
      walletRepository = {} as jest.Mocked<WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>>;
    });

    afterEach(async () => {
      jest.restoreAllMocks();
      window.localStorage.clear();
      await storage.local.clear();
    });

    describe('return a valid state', () => {
      it('when no wallet created (empty storage)', async () => {
        walletRepository.wallets$ = of([]);
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        await act(async () => {
          await result.current[1](walletRepository);
        });

        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
      });

      it('when no wallet created, background storage is cleared', async () => {
        walletRepository.wallets$ = of([]);
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        await act(async () => {
          await result.current[1](walletRepository);
        });

        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
        expect(await storage.local.get('BACKGROUND_STORAGE')).toEqual({});
      });

      it('when wallet is created', async () => {
        walletRepository.wallets$ = of(repositoryWallets);
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({ withAppSettings: true });

        await act(async () => {
          await result.current[1](walletRepository);
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
      });

      it('when no appSettings, chainName is set to the current one', async () => {
        walletRepository.wallets$ = of(repositoryWallets);
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({ withAppSettings: false });

        await act(async () => {
          await result.current[1](walletRepository);
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: true } });
        // environmentName set when mocking providers
        expect(getValueFromLocalStorage('appSettings')).toEqual({ chainName: 'Preview' });
      });
    });

    describe('return an error state', () => {
      it('when an unexpected error occurs while checking the data', async () => {
        const errorMessage = 'Some exception';
        walletRepository.wallets$ = throwError(new Error(errorMessage));
        const { result } = renderHook(() => useDataCheck(), { wrapper: MockProviders });
        setStorageHelper({ withAppSettings: true });

        await act(async () => {
          await result.current[1](walletRepository);
        });
        expect(result.current[0]).toEqual({ checkState: 'checked', result: { valid: false, error: errorMessage } });
      });
    });
  });
});
