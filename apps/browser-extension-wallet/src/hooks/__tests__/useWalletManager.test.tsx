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
const mockGetHwExtendedAccountPublicKey = jest.fn();
const mockRestoreWalletFromKeyAgent = jest.fn();
const mockSwitchKeyAgents = jest.fn();
const mockLedgerCheckDeviceConnection = jest.fn();
const mockLedgerGetXpub = jest.fn();
const mockTrezorGetXpub = jest.fn();
const mockInitializeTrezorTransport = jest.fn();
const mockLedgerCreateWithDevice = jest.fn();
const mockUseAppSettingsContext = jest.fn().mockReturnValue([{}, jest.fn()]);
const mockUseSecrets = {
  password: {} as Partial<Password>,
  setPassword: jest.fn(),
  clearSecrets: jest.fn()
};
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { LOCK_VALUE, UseWalletManager, useWalletManager } from '../useWalletManager';
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
import { AnyBip32Wallet, AnyWallet, WalletManagerActivateProps, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { PasswordObj as Password } from '@lace/core';

(walletApiUi as any).logger = console;

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
jest.mock('@lace/core', () => {
  const actual = jest.requireActual<any>('@lace/core');
  return {
    __esModule: true,
    ...actual,
    useSecrets: () => mockUseSecrets
  };
});
jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      Ledger: {
        LedgerKeyAgent: {
          createWithDevice: mockLedgerCreateWithDevice,
          checkDeviceConnection: mockLedgerCheckDeviceConnection,
          getXpub: mockLedgerGetXpub
        }
      },
      Trezor: {
        TrezorKeyAgent: {
          getXpub: mockTrezorGetXpub,
          initializeTrezorTransport: mockInitializeTrezorTransport
        }
      },
      restoreWalletFromKeyAgent: mockRestoreWalletFromKeyAgent,
      switchKeyAgents: mockSwitchKeyAgents,
      connectDevice: mockConnectDevice,
      getHwExtendedAccountPublicKey: mockGetHwExtendedAccountPublicKey,
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
  ({ children }: { children: React.ReactNode }) => (
    <AppSettingsProvider>
      <DatabaseProvider>
        <BackgroundServiceAPIProvider value={backgroundService}>{children}</BackgroundServiceAPIProvider>
      </DatabaseProvider>
    </AppSettingsProvider>
  );

const render = () =>
  renderHook(() => useWalletManager(), {
    wrapper: getWrapper({})
  }).result.current;

describe('Testing useWalletManager hook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, jest.fn()]);
    jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({}));
  });

  afterEach(() => {
    mockUseSecrets.clearSecrets.mockClear();
    mockUseSecrets.setPassword.mockClear();
    mockUseSecrets.password = {};
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
    const passphrase = 'passphrase';

    beforeEach(() => {
      mockUseSecrets.password = { value: passphrase };
    });

    test('should do nothing and return true when wallet is not locked', async () => {
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
      expect(await unlockWallet()).toEqual(true);
      expect(mockEmip3decrypt).not.toBeCalled();
    });

    test('should return true when walletLock is successfully decrypted using the wallet password', async () => {
      (walletApiUi.walletRepository as any).wallets$ = of([{}]);
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
      expect(await unlockWallet()).toEqual(true);
      expect(mockEmip3decrypt).toBeCalledWith(walletLock, Buffer.from(passphrase).fill(0));
      expect(mockUseSecrets.clearSecrets).toBeCalled();
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
      (walletApiUi.walletManager as any).activate = jest.fn().mockResolvedValue(undefined);
      const name = 'name';
      const mnemonic = [
        'vacant violin soft weird deliver render brief always monitor general maid smart jelly core drastic erode echo there clump dizzy card filter option defense'
      ];
      mockUseSecrets.password = { value: 'passwoprd' } as Password;
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
      expect(await createWallet({ name, mnemonic, chainId })).toEqual(
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
      const nullifiedPassphrase = Buffer.from(new Uint8Array(mockUseSecrets.password.value.length));
      expect(mockEmip3encrypt.mock.calls[0]).toEqual([LOCK_VALUE, nullifiedPassphrase]);
      expect(mockEmip3encrypt.mock.calls[1]).toEqual([Buffer.from(mnemonic.join(' ')), nullifiedPassphrase]);
      expect(walletApiUi.walletRepository.addWallet).toBeCalledTimes(1);
      expect(walletApiUi.walletManager.activate).toBeCalledTimes(1);
      expect(mockUseSecrets.clearSecrets).toBeCalledTimes(1);
    });
  });

  describe('createHardwareWallet', () => {
    test('should use cardano manager to create wallet', async () => {
      const walletId = 'walletId';
      mockGetHwExtendedAccountPublicKey.mockResolvedValue('pubkey');
      (walletApiUi.walletRepository as any).addWallet = jest.fn().mockResolvedValue(walletId);
      (walletApiUi.walletRepository as any).addAccount = jest.fn().mockResolvedValue(undefined);
      (walletApiUi.walletManager as any).activate = jest.fn().mockResolvedValue(undefined);

      const accountIndex = 1;
      const name = 'name';
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        currentChain: {
          networkId: 0,
          networkMagic: 0
        }
      }));
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
        connectedDevice
      });
      expect(walletApiUi.walletRepository.addWallet).toBeCalledTimes(1);
      expect(walletApiUi.walletManager.activate).toBeCalledTimes(1);
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
    let clearBackgroundStorage: jest.Mock;
    let clearLocalStorage: jest.Mock;
    let resetWalletLock: jest.Mock;
    let setCardanoWallet: jest.Mock;
    let deleteWallet: UseWalletManager['deleteWallet'];

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
      clearBackgroundStorage = jest.fn();
      clearLocalStorage = jest.fn();
      jest.spyOn(localStorage, 'clearLocalStorage').mockImplementation(clearLocalStorage);

      resetWalletLock = jest.fn();
      setCardanoWallet = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        resetWalletLock,
        setCardanoWallet
      }));
      ({
        result: {
          current: { deleteWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            clearBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      }));
    });

    test('should shutdown wallet, delete data from the LS, indexed DB and background storage, reset lock and current chain ', async () => {
      (walletApiUi.walletRepository as any).wallets$ = of([]);

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
          'isMultiDelegationDAppCompatibilityModalVisible'
        ]
      });
      expect(clearBackgroundStorage).toBeCalledWith({
        except: ['fiatPrices', 'userId', 'usePersistentUserId', 'featureFlags', 'customSubmitTxUrl', 'namiMigration']
      });
      expect(resetWalletLock).toBeCalledWith();
      expect(setCardanoWallet).toBeCalledWith();
    });

    test('should activate another wallet if exists after deletion', async () => {
      const remainingWallet = {
        type: WalletType.InMemory,
        walletId: 'remaining-wallet-id',
        accounts: [{ accountIndex: 1 }]
      };
      (walletApiUi.walletRepository as any).wallets$ = of([remainingWallet]);

      await deleteWallet();

      expect(walletApiUi.walletManager.activate).toBeCalledWith(
        expect.objectContaining({
          walletId: remainingWallet.walletId,
          accountIndex: remainingWallet.accounts[0].accountIndex
        })
      );
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

  describe('addAccount', () => {
    describe('for existing bip32 wallet', () => {
      const extendedAccountPublicKey =
        '12b608b67a743891656d6463f72aa6e5f0e62ba6dc47e32edfebafab1acf0fa9f3033c2daefa3cb2ac16916b08c7e7424d4e1aafae2206d23c4d002299c07128';
      const walletTypes = [
        {
          type: WalletType.InMemory,
          walletProps: {
            encryptedSecrets: {
              rootPrivateKeyBytes:
                '8403cf9d8267a7169381dd476f4fda48e1926fec8942ec51892e428e152fbed4835711cccb7efcae379627f477abb46c883f6b0c221f3aea40f9d931d2e8fdc69f85f16eb91ca380fc2e1edc2543e4dd71c1866208ea6c6960bca99f974e25776067e9a242b0e4066b96bd4d89ca99db5bd77bb65573b9cbeef85222ceed6d5a4dc516213ace986f03b183365505119b9a0abdc4375bfdf2363d7433'
            }
          },
          passphrase: Buffer.from('passphrase1'),
          prepare: () => {
            mockEmip3decrypt.mockImplementationOnce(
              jest.requireActual('@lace/cardano').Wallet.KeyManagement.emip3decrypt
            );
          }
        },
        {
          type: WalletType.Trezor,
          prepare: () => mockGetHwExtendedAccountPublicKey.mockResolvedValueOnce(extendedAccountPublicKey)
        },
        {
          type: WalletType.Ledger,
          prepare: () => mockGetHwExtendedAccountPublicKey.mockResolvedValueOnce(extendedAccountPublicKey)
        }
      ];

      beforeEach(() => {
        walletApiUi.walletRepository.addAccount = jest.fn().mockResolvedValueOnce(void 0);
      });

      it.each(walletTypes)(
        'derives extended account public key for $type wallet and adds new account into the repository',
        async ({ type, walletProps, prepare, passphrase }) => {
          prepare();
          const walletId = 'bip32-wallet-id';
          const addAccountProps = {
            wallet: { walletId, type, ...walletProps } as AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>,
            accountIndex: 0,
            metadata: { name: 'new account' },
            passphrase
          };

          const { addAccount } = render();
          await addAccount(addAccountProps);
          expect(walletApiUi.walletRepository.addAccount).toBeCalledWith({
            walletId,
            accountIndex: addAccountProps.accountIndex,
            metadata: addAccountProps.metadata,
            extendedAccountPublicKey
          });
        }
      );
    });
  });

  describe('activateWallet', () => {
    const walletId = 'walletId';
    const accountIndex = 1;
    const originalMetadata = { name: 'wallet' };

    beforeEach(() => {
      walletApiUi.walletRepository.wallets$ = of([
        {
          walletId,
          metadata: originalMetadata
        } as AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
      ]);
      walletApiUi.walletManager.deactivate = jest.fn().mockResolvedValueOnce(void 0);
      walletApiUi.walletRepository.updateWalletMetadata = jest.fn().mockResolvedValueOnce(void 0);
      walletApiUi.walletManager.activate = jest.fn().mockResolvedValueOnce(void 0);
      walletApiUi.walletManager.deactivate = jest.fn().mockResolvedValueOnce(void 0);
    });

    it('does not re-activate an already active wallet', async () => {
      walletApiUi.walletManager.activeWalletId$ = of({ walletId, accountIndex } as WalletManagerActivateProps<
        any,
        any
      >);

      const { activateWallet } = render();
      await activateWallet({ walletId, accountIndex });

      expect(walletApiUi.walletRepository.updateWalletMetadata).not.toBeCalled();
      expect(walletApiUi.walletManager.activate).not.toBeCalled();
      expect(walletApiUi.walletManager.deactivate).not.toBeCalled();
    });

    it('stores lastActiveAccountIndex in wallet metadata and activates wallet via WalletManager', async () => {
      walletApiUi.walletManager.activeWalletId$ = of({ walletId: 'otherId' } as WalletManagerActivateProps<any, any>);

      const { activateWallet } = render();
      await activateWallet({ walletId, accountIndex });

      expect(walletApiUi.walletRepository.updateWalletMetadata).toBeCalledWith({
        walletId,
        metadata: {
          ...originalMetadata,
          lastActiveAccountIndex: accountIndex
        }
      });

      expect(walletApiUi.walletManager.activate).toBeCalledWith({
        walletId,
        accountIndex,
        chainId: expect.objectContaining({
          networkMagic: expect.anything(),
          networkId: expect.anything()
        })
      });
    });
  });
});
