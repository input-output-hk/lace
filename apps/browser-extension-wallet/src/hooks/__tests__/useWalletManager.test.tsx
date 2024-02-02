/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable unicorn/no-null */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable no-magic-numbers */
/* eslint-disable max-statements */
/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable import/imports-first */
import SpyInstance = jest.SpyInstance;

const mockEmip3decrypt = jest.fn();
const mockEmip3encrypt = jest.fn();
const mockConnectDevice = jest.fn();
const mockRestoreWalletFromKeyAgent = jest.fn();
const mockSwitchKeyAgents = jest.fn();
const mockLedgerCreateWithDevice = jest.fn();
const mockUseAppSettingsContext = jest.fn().mockReturnValue([{}, jest.fn()]);
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { LOCK_VALUE, useWalletManager } from '../useWalletManager';
import {
  AppSettingsProvider,
  BackgroundServiceAPIProvider,
  BackgroundServiceAPIProviderProps,
  DatabaseProvider
} from '@providers';

import * as stores from '@stores';
import * as localStorage from '@src/utils/local-storage';
import * as AppSettings from '@providers/AppSettings';
import * as walletApiUi from '@src/lib/wallet-api-ui';
import { of } from 'rxjs';
import { AnyWallet, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

jest.mock('@providers/AppSettings', () => ({
  ...jest.requireActual<any>('@providers/AppSettings'),
  useAppSettingsContext: mockUseAppSettingsContext
}));
jest.mock('@src/config', () => {
  const actualConfig = jest.requireActual<any>('@src/config');
  return {
    config: () => ({
      ...actualConfig.config(),
      CHAIN: 'Preprod'
    })
  };
});
jest.mock('@src/lib/wallet-api-ui');
jest.mock('@stores');
jest.mock('@src/utils/local-storage');
jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      Ledger: {
        LedgerKeyAgent: {
          createWithDevice: mockLedgerCreateWithDevice
        }
      },
      restoreWalletFromKeyAgent: mockRestoreWalletFromKeyAgent,
      switchKeyAgents: mockSwitchKeyAgents,
      connectDevice: mockConnectDevice,
      KeyManagement: {
        ...actual.Wallet.KeyManagement,
        emip3decrypt: mockEmip3decrypt,
        emip3encrypt: mockEmip3encrypt
      }
    }
  };
});

jest.mock('@providers/AnalyticsProvider/getUserIdService', () => {
  const actual = jest.requireActual<any>('@providers/AnalyticsProvider/getUserIdService');
  return {
    getUserIdService: () => ({
      ...actual,
      clearId: jest.fn()
    })
  };
});

const getWrapper =
  ({ backgroundService }: { backgroundService?: BackgroundServiceAPIProviderProps['value'] }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <AppSettingsProvider>
        <DatabaseProvider>
          <BackgroundServiceAPIProvider value={backgroundService}>{children}</BackgroundServiceAPIProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

describe('Testing useWalletManager hook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, jest.fn()]);
    jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({}));
  });

  describe('lockWallet', () => {
    test("should not lock the wallet if the browser storage is corrupted (walletLock is missing) and we won't be able to unlock later", () => {
      const setCardanoWallet = jest.fn();
      const setWalletLock = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        cardanoWallet: {
          source: {
            wallet: {
              metadata: { lockValue: undefined }
            }
          }
        },
        setWalletLock,
        setCardanoWallet,
        setAddressesDiscoveryCompleted: () => {}
      }));

      const {
        result: {
          current: { lockWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      lockWallet();
      expect(setCardanoWallet).not.toBeCalled();
      expect(setWalletLock).not.toBeCalled();
    });

    test('should lock the wallet', () => {
      const setWalletLock = jest.fn();
      const setCardanoWallet = jest.fn();
      const lockValue = 'abc';
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        cardanoWallet: {
          source: {
            wallet: {
              metadata: { lockValue }
            }
          }
        },
        setWalletLock,
        setCardanoWallet,
        setAddressesDiscoveryCompleted: () => {}
      }));

      const {
        result: {
          current: { lockWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      lockWallet();
      expect(lockWallet).toBeDefined();
      expect(setCardanoWallet).toBeCalledWith();
      expect(setWalletLock).toBeCalledWith(Buffer.from(lockValue, 'hex'));
    });
    test('sets the discovery completeness flag', () => {
      const setAddressesDiscoveryCompleted = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        cardanoWallet: {
          source: {
            wallet: {
              metadata: { lockValue: 'abc' }
            }
          }
        },
        setWalletLock: () => {},
        setCardanoWallet: () => {},
        setAddressesDiscoveryCompleted
      }));

      const {
        result: {
          current: { lockWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      lockWallet();

      expect(setAddressesDiscoveryCompleted).toBeCalledWith(false);
    });
  });

  describe('unlockWallet', () => {
    test('should do nothing and return true when wallet is not locked', async () => {
      const passphrase = 'passphrase';
      const emip3decryptResultMocked = '{}';

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletLock: undefined
      }));

      mockEmip3decrypt.mockImplementation(async () => emip3decryptResultMocked);

      const {
        result: {
          current: { unlockWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      expect(unlockWallet).toBeDefined();
      expect(await unlockWallet(passphrase)).toEqual(true);
      expect(mockEmip3decrypt).not.toBeCalled();
    });

    test('should return true when walletLock is successfully decrypted using the wallet password', async () => {
      (walletApiUi.walletRepository as any).wallets$ = of([{}]);
      const passphrase = 'passphrase';
      const emip3decryptResultMocked = '{}';
      const walletLock = {};

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletLock
      }));

      mockEmip3decrypt.mockImplementation(async () => emip3decryptResultMocked);

      const {
        result: {
          current: { unlockWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      expect(unlockWallet).toBeDefined();
      expect(await unlockWallet(passphrase)).toEqual(true);
      expect(mockEmip3decrypt).toBeCalledWith(walletLock, Buffer.from(passphrase));
    });
  });

  describe('loadWallet', () => {
    test('should set cardano wallet to null when there are no wallets in the repository or local storage', async () => {
      const setCardanoWallet = jest.fn();
      const setCurrentChain = jest.fn();
      jest.spyOn(localStorage, 'getValueFromLocalStorage').mockReturnValue(undefined);
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setCardanoWallet,
        setCurrentChain
      }));
      const {
        result: {
          current: { loadWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      expect(loadWallet).toBeDefined();
      expect(await loadWallet([], null)).toEqual(undefined);
      expect(setCardanoWallet).toBeCalledWith(null);
    });

    test('should set cardano wallet', async () => {
      const walletId = 'walletId';
      const accountIndex = 0;
      const name = 'wally';
      const wallets: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[] = [
        {
          walletId,
          type: WalletType.Ledger,
          metadata: { name },
          accounts: [
            {
              accountIndex,
              extendedAccountPublicKey: 'pubkey' as any,
              metadata: { name: 'Account #0' }
            }
          ]
        }
      ];
      const activeWalletProps = {
        chainId: Wallet.Cardano.ChainIds.Preprod,
        walletId,
        accountIndex
      };
      const setCardanoWallet = jest.fn();
      const setCurrentChain = jest.fn();
      const setCardanoCoin = jest.fn();

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setCardanoWallet,
        setCurrentChain,
        setCardanoCoin
      }));

      const {
        result: {
          current: { loadWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      expect(loadWallet).toBeDefined();
      expect(await loadWallet(wallets, activeWalletProps)).toMatchObject({ name, source: expect.anything() });
      expect(setCardanoWallet).toBeCalledWith(expect.objectContaining({ name, source: expect.anything() }));
      expect(setCardanoCoin).toBeCalled();
    });
  });

  describe('createWallet', () => {
    test('should store wallet in repository', async () => {
      const walletId = 'walletId';
      (walletApiUi.walletRepository as any).addWallet = jest.fn().mockResolvedValue(walletId);
      (walletApiUi.walletRepository as any).addAccount = jest.fn().mockResolvedValue(undefined);
      const name = 'name';
      const mnemonic = [
        'vacant violin soft weird deliver render brief always monitor general maid smart jelly core drastic erode echo there clump dizzy card filter option defense'
      ];
      const password = 'passwoprd';
      const chainId = {
        networkId: 0,
        networkMagic: 0
      };

      const emip3encryptResultMocked = '{}';
      const emip3encryptResultMocked2 = '{}';
      mockEmip3encrypt.mockImplementationOnce(async () => emip3encryptResultMocked);
      mockEmip3encrypt.mockImplementationOnce(async () => emip3encryptResultMocked2);

      const {
        result: {
          current: { createWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      expect(createWallet).toBeDefined();
      expect(await createWallet({ name, mnemonic, password, chainId })).toEqual(
        expect.objectContaining({
          name,
          source: expect.objectContaining({
            wallet: expect.objectContaining({ walletId })
          })
        })
      );
      // It is actually called with Buffer.from(password) rather than with [0, 0, ..., 0],
      // but buffer that this is called with is nullified in order to remove the actual passphrase
      // bytes from memory as soon as possible. jest keeps a reference to the buffer, so it thinks it's called with 0-es
      const nullifiedPassphrase = Buffer.from(new Uint8Array(password.length));
      expect(mockEmip3encrypt.mock.calls[0]).toEqual([LOCK_VALUE, nullifiedPassphrase]);
      expect(mockEmip3encrypt.mock.calls[1]).toEqual([Buffer.from(mnemonic.join(' ')), nullifiedPassphrase]);
    });
  });

  describe('activateWallet', () => {
    (walletApiUi.walletManager as any).activate = jest.fn().mockResolvedValue(undefined);
    const walletInstance = { source: { wallet: { walletId: 'walletId' } } } as Wallet.CardanoWallet;

    test('should update settings and set wallet states', async () => {
      const setCardanoWallet = jest.fn();
      const setCurrentChain = jest.fn();
      const updateAppSettings = jest.fn();
      const chainName = 'Preview';
      const mnemonicVerificationFrequency = 'mnemonicVerificationFrequency';

      jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, updateAppSettings]);
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setCardanoWallet,
        setCurrentChain
      }));

      const {
        result: {
          current: { activateWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      await activateWallet({ walletInstance, mnemonicVerificationFrequency, chainName });

      expect(walletApiUi.walletManager.activate).toBeCalledTimes(1);
      expect(setCardanoWallet).toBeCalledWith(walletInstance);
      expect(setCurrentChain).toBeCalledWith(chainName);
      expect(updateAppSettings).toBeCalledWith(
        expect.objectContaining({
          chainName,
          mnemonicVerificationFrequency,
          lastMnemonicVerification: expect.anything()
        })
      );
    });

    test('should use default mnemonicVerificationFrequency and chainName', async () => {
      const setCurrentChain = jest.fn();
      const updateAppSettings = jest.fn();

      jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, updateAppSettings]);
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setCardanoWallet: jest.fn(),
        setCurrentChain
      }));

      const {
        result: {
          current: { activateWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      await activateWallet({ walletInstance });

      expect(walletApiUi.walletManager.activate).toBeCalledTimes(1);
      expect(updateAppSettings).toBeCalledWith({
        chainName: 'Preprod',
        mnemonicVerificationFrequency: '',
        lastMnemonicVerification: expect.any(String)
      });
      expect(setCurrentChain).toBeCalledWith('Preprod');
    });
  });

  describe('getPassword', () => {
    test('should retrieve pasword from the background storage', async () => {
      const password = 'password';
      const getWalletPassword = jest.fn().mockReturnValue(password);
      const {
        result: {
          current: { getPassword }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            getWalletPassword
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });
      expect(getPassword).toBeDefined();
      expect(await getPassword()).toEqual(password);
    });
  });

  describe('createHardwareWallet', () => {
    test('should use cardano manager to create wallet', async () => {
      const walletId = 'walletId';
      mockLedgerCreateWithDevice.mockResolvedValue({
        extendedAccountPublicKey: 'pubkey'
      });
      (walletApiUi.walletRepository as any).addWallet = jest.fn().mockResolvedValue(walletId);
      (walletApiUi.walletRepository as any).addAccount = jest.fn().mockResolvedValue(undefined);

      const accountIndex = 1;
      const name = 'name';
      const chainId = {
        networkId: 0,
        networkMagic: 0
      };
      const connectedDevice = 'Ledger' as any;
      const deviceConnection = 'deviceConnection' as any;

      const {
        result: {
          current: { createHardwareWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      await createHardwareWallet({
        deviceConnection,
        accountIndex,
        name,
        chainId,
        connectedDevice
      });
      expect(walletApiUi.walletRepository.addWallet).toBeCalledTimes(1);
    });
  });

  describe('connectHardwareWallet', () => {
    test('should call proper connect method', async () => {
      const model = 'Trezor' as any;
      const mockConnectDeviceMockedResult = 'mockConnectDeviceMocked';
      const mockConnectDeviceMocked = jest.fn().mockReturnValue(mockConnectDeviceMockedResult);
      mockConnectDevice.mockImplementation(mockConnectDeviceMocked);

      const {
        result: {
          current: { connectHardwareWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      expect(connectHardwareWallet).toBeDefined();
      expect(await connectHardwareWallet(model)).toEqual(mockConnectDeviceMockedResult);
      expect(mockConnectDeviceMocked).toBeCalledWith(model);
    });
  });

  describe('saveHardwareWallet', () => {
    const wallet = { name: 'stnamering' } as any;

    test('should set state', async () => {
      const chainName = 'Preview';

      const setCardanoWallet = jest.fn();
      const setCurrentChain = jest.fn();
      const updateAppSettings = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setCardanoWallet,
        setCurrentChain
      }));
      jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, updateAppSettings]);

      const {
        result: {
          current: { saveHardwareWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      expect(saveHardwareWallet).toBeDefined();
      await saveHardwareWallet(wallet, chainName);

      expect(setCardanoWallet).toBeCalledWith(wallet);
      expect(setCurrentChain).toBeCalledWith(chainName);
      expect(updateAppSettings).toBeCalledWith(expect.objectContaining({ chainName }));
    });

    test('should use default chain name', async () => {
      const defaultChainName = 'Preprod';

      const setCardanoWallet = jest.fn();
      const setCurrentChain = jest.fn();
      const updateAppSettings = jest.fn();
      jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, updateAppSettings]);
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setCardanoWallet,
        setCurrentChain
      }));

      const {
        result: {
          current: { saveHardwareWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      expect(saveHardwareWallet).toBeDefined();
      await saveHardwareWallet(wallet);

      expect(setCardanoWallet).toBeCalledWith(wallet);
      expect(setCurrentChain).toBeCalledWith(defaultChainName);
      expect(updateAppSettings).toBeCalledWith(expect.objectContaining({ chainName: defaultChainName }));
    });
  });

  describe('deleteWallet', () => {
    const walletId = 'walletId';

    beforeEach(() => {
      (walletApiUi.walletManager as any).activeWalletId$ = of({ walletId });
      (walletApiUi.walletManager as any).deactivate = jest.fn().mockResolvedValue(undefined);
      (walletApiUi.walletManager as any).destroyData = jest.fn().mockResolvedValue(undefined);
      (walletApiUi.walletRepository as any).removeWallet = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        updateAppSettings: jest.fn(),
        settings: {},
        setCurrentChain: jest.fn(),
        setCardanoCoin: jest.fn(),
        setAddressesDiscoveryCompleted: () => {}
      }));
    });

    test('should shutdown wallet, delete data from the LS, indexed DB and background storage, reset lock and current chain ', async () => {
      const clearBackgroundStorage = jest.fn();
      const clearLocalStorage = jest.fn();
      jest.spyOn(localStorage, 'clearLocalStorage').mockImplementation(clearLocalStorage);

      const resetWalletLock = jest.fn();
      const setCardanoWallet = jest.fn();
      const setCurrentChain = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        resetWalletLock,
        setCardanoWallet,
        setCurrentChain
      }));

      const {
        result: {
          current: { deleteWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            clearBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });
      expect(deleteWallet).toBeDefined();
      await deleteWallet();
      expect(walletApiUi.walletManager.deactivate).toBeCalledTimes(1);
      expect(walletApiUi.walletManager.destroyData).toBeCalled();
      expect(walletApiUi.walletRepository.removeWallet).toBeCalledTimes(1);
      expect(clearLocalStorage).toBeCalledWith({
        except: [
          'currency',
          'lock',
          'mode',
          'hideBalance',
          'isForgotPasswordFlow',
          'multidelegationFirstVisit',
          'multidelegationFirstVisitSincePortfolioPersistence'
        ]
      });
      expect(clearBackgroundStorage).toBeCalledWith({
        except: ['fiatPrices', 'userId', 'usePersistentUserId', 'experimentsConfiguration']
      });
      expect(resetWalletLock).toBeCalledWith();
      expect(setCardanoWallet).toBeCalledWith();
      expect(setCurrentChain).toBeCalledWith('Preprod');
    });
  });

  describe('switchNetwork', () => {
    beforeEach(() => {
      (walletApiUi.walletManager as any).switchNetwork = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        updateAppSettings: jest.fn(),
        settings: {},
        setCurrentChain: jest.fn(),
        setCardanoCoin: jest.fn(),
        setAddressesDiscoveryCompleted: () => {}
      }));
    });

    test('puts a log in the console', async () => {
      jest.spyOn(console, 'info');
      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      try {
        await switchNetwork('incorrect' as any);
        // eslint-disable-next-line no-empty
      } catch {}
      expect(console.info).toHaveBeenCalledWith('Switching chain to', 'incorrect', expect.any(Array));
      (console.info as unknown as SpyInstance).mockRestore();
    });

    test('should throw in case the chain is not supported', async () => {
      const chainName = 'not supported chain id' as any;
      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      expect(switchNetwork).toBeDefined();
      await expect(switchNetwork(chainName)).rejects.toThrow(new Error('Chain not supported'));
    });

    test('should switch network, update app settings, save data to LS and set current chain', async () => {
      const chainName = 'Preprod';
      const setCardanoCoin = jest.fn();
      const setCurrentChain = jest.fn();

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        settings: {},
        setCardanoCoin,
        setCurrentChain,
        setCardanoWallet: () => {},
        setAddressesDiscoveryCompleted: () => {}
      }));

      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      expect(switchNetwork).toBeDefined();
      await switchNetwork(chainName);

      expect(setCurrentChain).toBeCalledWith(chainName);
      expect(setCardanoCoin).toBeCalledWith({ networkId: 0, networkMagic: 1 });
      expect(walletApiUi.walletManager.switchNetwork).toBeCalledWith({ networkId: 0, networkMagic: 1 });
    });

    test('sets the discovery completeness flag', async () => {
      const setAddressesDiscoveryCompleted = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        settings: {},
        setCardanoCoin: () => {},
        setCurrentChain: () => {},
        setCardanoWallet: () => {},
        setAddressesDiscoveryCompleted
      }));

      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      await switchNetwork('Preprod');
      expect(setAddressesDiscoveryCompleted).toBeCalledWith(false);
    });
  });
});
