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
const mockShutdownWallet = jest.fn();
const mockRestoreWalletFromKeyAgent = jest.fn();
const mockSwitchKeyAgents = jest.fn();
const mockUseAppSettingsContext = jest.fn().mockReturnValue([{}, jest.fn()]);
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useWalletManager } from '../useWalletManager';
import {
  AppSettingsProvider,
  BackgroundServiceAPIProvider,
  BackgroundServiceAPIProviderProps,
  CardanoWalletManagerProvider,
  DatabaseProvider,
  ICardanoWalletManager
} from '@providers';

import * as stores from '@stores';
import * as localStorage from '@src/utils/local-storage';
import * as getWallet from '@src/utils/get-wallet-from-storage';
import * as AppSettings from '@providers/AppSettings';

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
jest.mock('@stores');
jest.mock('@src/utils/local-storage');
jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      restoreWalletFromKeyAgent: mockRestoreWalletFromKeyAgent,
      switchKeyAgents: mockSwitchKeyAgents,
      connectDevice: mockConnectDevice,
      shutdownWallet: mockShutdownWallet,
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
  ({
    backgroundService,
    cardanoWalletManager
  }: {
    backgroundService?: BackgroundServiceAPIProviderProps['value'];
    cardanoWalletManager?: ICardanoWalletManager;
  }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <CardanoWalletManagerProvider value={cardanoWalletManager}>
        <AppSettingsProvider>
          <DatabaseProvider>
            <BackgroundServiceAPIProvider value={backgroundService}>{children}</BackgroundServiceAPIProvider>
          </DatabaseProvider>
        </AppSettingsProvider>
      </CardanoWalletManagerProvider>
    );

describe('Testing useWalletManager hook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, jest.fn()]);
    jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({}));
  });

  describe('lockWallet', () => {
    test("should not clear background storage, local storage, key agent data and cardano wallet if the browser storage is corrupted (walletLock is missing) and we won't be able to unlock later", async () => {
      const clearBackgroundStorage = jest.fn();
      const setKeyAgentData = jest.fn();
      const setCardanoWallet = jest.fn();
      const deleteFromLocalStorage = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletLock: undefined,
        setKeyAgentData,
        setCardanoWallet,
        setAddressesDiscoveryCompleted: () => {}
      }));
      jest.spyOn(localStorage, 'deleteFromLocalStorage').mockImplementation(deleteFromLocalStorage);

      const {
        result: {
          current: { lockWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: { clearBackgroundStorage } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });

      await lockWallet();
      expect(lockWallet).toBeDefined();
      expect(clearBackgroundStorage).not.toBeCalled();
      expect(deleteFromLocalStorage).not.toBeCalled();
      expect(setCardanoWallet).not.toBeCalled();
      expect(setKeyAgentData).not.toBeCalled();
    });

    test('should clear background storage, local storage, key agent data and cardano wallet', async () => {
      const clearBackgroundStorage = jest.fn();
      const setKeyAgentData = jest.fn();
      const setCardanoWallet = jest.fn();
      const deleteFromLocalStorage = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletLock: {},
        setKeyAgentData,
        setCardanoWallet,
        setAddressesDiscoveryCompleted: () => {}
      }));
      jest.spyOn(localStorage, 'deleteFromLocalStorage').mockImplementation(deleteFromLocalStorage);

      const {
        result: {
          current: { lockWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: { clearBackgroundStorage } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });

      await lockWallet();
      expect(lockWallet).toBeDefined();
      expect(clearBackgroundStorage).toBeCalledWith(['keyAgentsByChain']);
      expect(deleteFromLocalStorage).toBeCalledWith('keyAgentData');
      expect(setCardanoWallet).toBeCalledWith();
      expect(setKeyAgentData).toBeCalledWith();
    });
    test('sets the discovery completeness flag', async () => {
      const setAddressesDiscoveryCompleted = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletLock: {},
        setKeyAgentData: () => {},
        setCardanoWallet: () => {},
        setAddressesDiscoveryCompleted
      }));

      const {
        result: {
          current: { lockWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            clearBackgroundStorage: () => {}
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });

      await lockWallet();

      expect(setAddressesDiscoveryCompleted).toBeCalledWith(false);
    });
  });

  describe('unlockWallet', () => {
    test('should not recover wallet info from encrypted lock using the wallet password', async () => {
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
      expect(await unlockWallet(passphrase)).toEqual(undefined);
      expect(mockEmip3decrypt).not.toBeCalled();
    });

    test('should recover wallet info from encrypted lock using the wallet password', async () => {
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
      expect(await unlockWallet(passphrase)).toEqual(JSON.parse(emip3decryptResultMocked));
      expect(mockEmip3decrypt).toBeCalledWith(walletLock, Buffer.from(passphrase));
    });
  });

  describe('loadWallet', () => {
    test('should not set cardano wallet in case the keyAgentData is missing', async () => {
      const setCardanoWallet = jest.fn();

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        keyAgentData: undefined,
        setCardanoWallet
      }));

      jest.spyOn(getWallet, 'getWalletFromStorage').mockReturnValue({ name: undefined });

      const {
        result: {
          current: { loadWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      expect(loadWallet).toBeDefined();
      expect(await loadWallet()).toEqual(undefined);
      expect(setCardanoWallet).not.toBeCalled();
    });

    test('should not set cardano wallet in case wallet name is missing in the LS', async () => {
      const setCardanoWallet = jest.fn();

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        keyAgentData: {},
        setCardanoWallet
      }));

      jest
        .spyOn(getWallet, 'getWalletFromStorage')
        .mockReturnValueOnce({ name: undefined })
        .mockReturnValueOnce(undefined);

      const {
        result: {
          current: { loadWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });

      expect(loadWallet).toBeDefined();
      expect(await loadWallet()).toEqual(undefined);
      expect(await loadWallet()).toEqual(undefined);
      expect(setCardanoWallet).not.toBeCalled();
    });

    test('should set cardano wallet', async () => {
      const setCardanoWallet = jest.fn();
      const restoreWalletResult = 'restoreWalletResult';
      const restoreWallet = jest.fn().mockReturnValue(restoreWalletResult);
      const cardanoWalletManager = {
        restoreWallet
      } as unknown as ICardanoWalletManager;
      const walletManagerUi = 'walletManagerUi';
      const walletName = 'name';
      const keyAgentData = {};
      const environmentName = 'environmentName';
      const callback = 'callback';

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        keyAgentData,
        setCardanoWallet,
        walletManagerUi,
        environmentName
      }));

      jest.spyOn(getWallet, 'getWalletFromStorage').mockReturnValue({ name: walletName });

      const {
        result: {
          current: { loadWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({ cardanoWalletManager })
      });

      expect(loadWallet).toBeDefined();
      expect(await loadWallet(callback as any)).toEqual(undefined);
      expect(restoreWallet).toBeCalledWith(
        walletManagerUi,
        walletName,
        keyAgentData,
        expect.any(Function),
        environmentName,
        undefined,
        callback
      );
      expect(setCardanoWallet).toBeCalledWith(restoreWalletResult);
    });
  });

  describe('createWallet', () => {
    test('should store the mnemonics and key agent in the background storage, wallet lock, wallet name and the key agent in the LS, return wallet, encrypted key agents and wallent name', async () => {
      const name = 'name';
      const mnemonic = ['asd'];
      const password = 'passwoprd';
      const chainId = {
        networkId: 0,
        networkMagic: 0
      };
      const wallet = {
        wallet: 'wallet',
        keyAgent: { serializableData: 'serializableData' },
        name: 'stnamering'
      };
      const walletManagerUi = 'walletManagerUi';
      const keyAgentsByChain = { keyAgentData: {} };
      const createCardanoWalletResult = {
        keyAgentsByChain,
        ...wallet
      };
      const createCardanoWallet = jest.fn().mockReturnValue(createCardanoWalletResult);
      const cardanoWalletManager = {
        createCardanoWallet
      } as unknown as ICardanoWalletManager;

      const emip3encryptResultMocked = '{}';
      const emip3encryptResultMocked2 = '{}';
      mockEmip3encrypt.mockImplementationOnce(async () => emip3encryptResultMocked);
      mockEmip3encrypt.mockImplementationOnce(async () => emip3encryptResultMocked2);

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletManagerUi
      }));
      const saveValueInLocalStorage = jest.fn();
      jest.spyOn(localStorage, 'saveValueInLocalStorage').mockImplementation(saveValueInLocalStorage);

      const setWalletPassword = jest.fn();
      const setBackgroundStorage = jest.fn();
      const {
        result: {
          current: { createWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          cardanoWalletManager,
          backgroundService: {
            setWalletPassword,
            setBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });

      expect(createWallet).toBeDefined();
      expect(await createWallet({ name, mnemonic, password, chainId })).toEqual({
        wallet,
        encryptedKeyAgents: emip3encryptResultMocked,
        name
      });
      expect(createCardanoWallet).toBeCalledWith(walletManagerUi, name, mnemonic, expect.any(Function), chainId);
      expect(mockEmip3encrypt.mock.calls[0]).toEqual([
        Buffer.from(JSON.stringify(keyAgentsByChain)),
        Buffer.from(password)
      ]);
      expect(mockEmip3encrypt.mock.calls[1]).toEqual([Buffer.from(mnemonic.join(' ')), Buffer.from(password)]);
      expect(setBackgroundStorage.mock.calls[0]).toEqual([{ mnemonic: JSON.stringify(emip3encryptResultMocked2) }]);
      expect(setBackgroundStorage.mock.calls[1]).toEqual([{ keyAgentsByChain }]);

      expect(saveValueInLocalStorage.mock.calls[0]).toEqual([{ key: 'lock', value: emip3encryptResultMocked }]);
      expect(saveValueInLocalStorage.mock.calls[1]).toEqual([{ key: 'wallet', value: { name } }]);
      expect(saveValueInLocalStorage.mock.calls[2]).toEqual([
        { key: 'keyAgentData', value: wallet.keyAgent.serializableData }
      ]);
    });
  });

  describe('setWallet', () => {
    test('should update settings and set wallet states', async () => {
      const updateLocalStorage = jest.fn();
      const setWalletLock = jest.fn();
      const setCardanoWallet = jest.fn();
      const setKeyAgentData = jest.fn();
      const setCurrentChain = jest.fn();
      const wallet = {
        wallet: 'wallet',
        keyAgent: { serializableData: 'serializableData' },
        name: 'stnamering'
      };
      const walletInstance = {
        encryptedKeyAgents: {},
        wallet,
        name: 'name'
      } as any;
      const chainName = 'Preview';
      const mnemonicVerificationFrequency = 'mnemonicVerificationFrequency';

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setWalletLock,
        setCardanoWallet,
        setKeyAgentData,
        setCurrentChain
      }));
      jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, updateLocalStorage]);

      const {
        result: {
          current: { setWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      await setWallet({ walletInstance, mnemonicVerificationFrequency, chainName });
      expect(setWallet).toBeDefined();

      expect(updateLocalStorage).toBeCalledWith({
        chainName,
        mnemonicVerificationFrequency,
        lastMnemonicVerification: expect.any(String)
      });

      expect(setWalletLock).toBeCalledWith(walletInstance.encryptedKeyAgents);
      expect(setCardanoWallet).toBeCalledWith(walletInstance.wallet);
      expect(setKeyAgentData).toBeCalledWith(walletInstance.wallet.keyAgent.serializableData);
      expect(setCurrentChain).toBeCalledWith(chainName);
    });

    test('should use default mnemonicVerificationFrequency and chainName', async () => {
      const updateLocalStorage = jest.fn();
      const setCurrentChain = jest.fn();
      const wallet = {
        wallet: 'wallet',
        keyAgent: { serializableData: 'serializableData' },
        name: 'stnamering'
      };
      const walletInstance = {
        encryptedKeyAgents: {},
        wallet,
        name: 'name'
      } as any;

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setWalletLock: jest.fn(),
        setCardanoWallet: jest.fn(),
        setKeyAgentData: jest.fn(),
        setCurrentChain
      }));
      jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, updateLocalStorage]);

      const {
        result: {
          current: { setWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      await setWallet({ walletInstance });
      expect(setWallet).toBeDefined();

      expect(updateLocalStorage).toBeCalledWith({
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
      const accountIndex = 1;
      const deviceConnection = 'deviceConnection' as any;
      const name = 'name';
      const chainId = {
        networkId: 0,
        networkMagic: 0
      };
      const connectedDevice = 'Ledger' as any;
      const walletManagerUi = 'walletManagerUi';
      const createCardanoWalletResult = 'createCardanoWalletResult';
      const createHardwareWalletMock = jest.fn().mockReturnValue(createCardanoWalletResult);
      const cardanoWalletManager = {
        createHardwareWallet: createHardwareWalletMock
      } as unknown as ICardanoWalletManager;

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletManagerUi
      }));

      const {
        result: {
          current: { createHardwareWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          cardanoWalletManager
        })
      });
      expect(createHardwareWallet).toBeDefined();
      expect(
        await createHardwareWallet({
          accountIndex,
          deviceConnection,
          name,
          chainId,
          connectedDevice
        })
      ).toEqual(createCardanoWalletResult);
      expect(createHardwareWalletMock).toBeCalledWith(walletManagerUi, {
        accountIndex,
        deviceConnection,
        name,
        activeChainId: chainId,
        connectedDevice
      });
      await createHardwareWallet({
        deviceConnection,
        name,
        chainId,
        connectedDevice
      });
      expect(createHardwareWalletMock).toBeCalledWith(walletManagerUi, {
        accountIndex: 0,
        deviceConnection,
        name,
        activeChainId: chainId,
        connectedDevice
      });
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
    test('should use cardano manager to create wallet', async () => {
      const keyAgentsByChain = 'keyAgentsByChain';
      const cardanoWallet = {
        wallet: 'wallet',
        keyAgent: { serializableData: 'serializableData' },
        name: 'stnamering'
      } as any;
      const wallet = {
        keyAgentsByChain,
        ...cardanoWallet
      } as any;
      const chainName = 'Preview';

      const saveValueInLocalStorage = jest.fn();
      jest.spyOn(localStorage, 'saveValueInLocalStorage').mockImplementation(saveValueInLocalStorage);

      const updateLocalStorage = jest.fn();
      jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, updateLocalStorage]);

      const setWalletLock = jest.fn();
      const setCardanoWallet = jest.fn();
      const setKeyAgentData = jest.fn();
      const setCurrentChain = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setWalletLock,
        setCardanoWallet,
        setKeyAgentData,
        setCurrentChain
      }));

      const setBackgroundStorage = jest.fn();
      const {
        result: {
          current: { saveHardwareWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            setBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });
      expect(saveHardwareWallet).toBeDefined();
      await saveHardwareWallet(wallet, chainName);

      expect(setBackgroundStorage).toBeCalledWith({ keyAgentsByChain });
      expect(saveValueInLocalStorage.mock.calls[0]).toEqual([{ key: 'wallet', value: { name: cardanoWallet.name } }]);
      expect(saveValueInLocalStorage.mock.calls[1]).toEqual([
        { key: 'keyAgentData', value: cardanoWallet.keyAgent.serializableData }
      ]);

      expect(updateLocalStorage).toBeCalledWith({
        chainName,
        mnemonicVerificationFrequency: ''
      });
      expect(setWalletLock).toBeCalledWith(null);
      expect(setCardanoWallet).toBeCalledWith(cardanoWallet);
      expect(setKeyAgentData).toBeCalledWith(cardanoWallet.keyAgent.serializableData);
      expect(setCurrentChain).toBeCalledWith(chainName);
    });

    test('should use default chain name', async () => {
      const keyAgentsByChain = 'keyAgentsByChain';
      const cardanoWallet = {
        wallet: 'wallet',
        keyAgent: { serializableData: 'serializableData' },
        name: 'stnamering'
      } as any;
      const wallet = {
        keyAgentsByChain,
        ...cardanoWallet
      } as any;

      const updateLocalStorage = jest.fn();
      jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, updateLocalStorage]);

      const setWalletLock = jest.fn();
      const setCardanoWallet = jest.fn();
      const setKeyAgentData = jest.fn();
      const setCurrentChain = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        setWalletLock,
        setCardanoWallet,
        setKeyAgentData,
        setCurrentChain
      }));

      const setBackgroundStorage = jest.fn();
      const {
        result: {
          current: { saveHardwareWallet }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            setBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });
      expect(saveHardwareWallet).toBeDefined();
      await saveHardwareWallet(wallet);

      expect(updateLocalStorage).toBeCalledWith({
        chainName: 'Preprod',
        mnemonicVerificationFrequency: ''
      });
      expect(setCurrentChain).toBeCalledWith('Preprod');
    });
  });

  describe('deleteWallet', () => {
    test('should shutdown wallet, delete data from the LS, indexed DB and background storage, reset lock, key agent data and current chain ', async () => {
      const walletManagerUi = 'walletManagerUi';
      const clearBackgroundStorage = jest.fn();

      const shutdownWalletMocked = jest.fn();
      mockShutdownWallet.mockImplementation(shutdownWalletMocked);

      const deleteFromLocalStorage = jest.fn();
      jest.spyOn(localStorage, 'deleteFromLocalStorage').mockImplementation(deleteFromLocalStorage);

      const resetWalletLock = jest.fn();
      const setCardanoWallet = jest.fn();
      const setKeyAgentData = jest.fn();
      const setCurrentChain = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletManagerUi,
        resetWalletLock,
        setCardanoWallet,
        setKeyAgentData,
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
      expect(shutdownWalletMocked).toBeCalledWith(walletManagerUi);
      expect(deleteFromLocalStorage.mock.calls[0]).toEqual(['appSettings']);
      expect(deleteFromLocalStorage.mock.calls[1]).toEqual(['showDappBetaModal']);
      expect(deleteFromLocalStorage.mock.calls[2]).toEqual(['lastStaking']);
      expect(deleteFromLocalStorage.mock.calls[3]).toEqual(['userInfo']);
      expect(deleteFromLocalStorage.mock.calls[4]).toEqual(['keyAgentData']);
      expect(clearBackgroundStorage).toBeCalledWith(['message', 'mnemonic', 'keyAgentsByChain']);
      expect(resetWalletLock).toBeCalledWith();
      expect(setCardanoWallet).toBeCalledWith();
      expect(setKeyAgentData).toBeCalledWith();
      expect(setCurrentChain).toBeCalledWith('Preprod');
    });
  });

  describe('executeWithPassword', () => {
    test('executeWithPassword', async () => {
      const password = 'password';
      const setWalletPasswordFn1 = jest.fn();
      const setWalletPasswordFn2 = jest.fn();
      const promiseFn = jest.fn().mockImplementation(async () => {});
      const setWalletPassword = jest
        .fn()
        .mockImplementationOnce(setWalletPasswordFn1)
        .mockImplementation(setWalletPasswordFn2);
      const {
        result: {
          current: { executeWithPassword }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            setWalletPassword
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });
      expect(executeWithPassword).toBeDefined();
      await executeWithPassword(password, promiseFn);
      expect(setWalletPassword).toBeCalledWith(Buffer.from(password));

      const setWalletPasswordFn1Order = setWalletPasswordFn1.mock.invocationCallOrder[0];
      const setWalletPasswordFn2Order = setWalletPasswordFn2.mock.invocationCallOrder[0];
      const promiseFnOrder = promiseFn.mock.invocationCallOrder[0];
      expect(setWalletPasswordFn1Order).toBeLessThan(promiseFnOrder);
      expect(promiseFnOrder).toBeLessThan(setWalletPasswordFn2Order);
    });
  });

  describe('switchNetwork', () => {
    beforeEach(() => {
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletManagerUi: 'walletManagerUi',
        setAddressesDiscoveryCompleted: () => {}
      }));
    });

    test('exits if walletManagerUi does not exist', async () => {
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({}));
      jest.spyOn(console, 'info');
      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      await switchNetwork('Mainnet');
      expect(console.info).not.toHaveBeenCalled();
      (console.info as unknown as SpyInstance).mockRestore();
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
    test('shoud throw in case the chain is not supported', async () => {
      const chainId = 'not supported chain id' as any;
      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      expect(switchNetwork).toBeDefined();
      await expect(switchNetwork(chainId)).rejects.toThrow(new Error('Chain not supported'));
    });
    test('shoud throw in case the chain is not available', async () => {
      const chainId = 'Preview' as any;
      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({})
      });
      expect(switchNetwork).toBeDefined();
      await expect(switchNetwork(chainId)).rejects.toThrow(new Error('Chain not supported'));
    });
    test('shoud throw in case the wallet data for chosen chain not found', async () => {
      const chainId = 'Preprod' as any;
      const keyAgentsByChain = {};

      jest
        .spyOn(getWallet, 'getWalletFromStorage')
        .mockReturnValueOnce({ name: 'name' })
        .mockReturnValueOnce(undefined);

      const getBackgroundStorage = jest.fn().mockReturnValue({ keyAgentsByChain });
      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            getBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });
      expect(switchNetwork).toBeDefined();
      await expect(switchNetwork(chainId)).rejects.toThrow(new Error('Wallet data for chosen chain not found'));
    });
    test('shoud throw in case the wallet data for chosen chain not found (missing wallet name)', async () => {
      const chainId = 'Preprod' as any;
      const keyAgentsByChain = { Preprod: true };

      jest.spyOn(getWallet, 'getWalletFromStorage').mockReturnValue({ name: undefined });

      const getBackgroundStorage = jest.fn().mockReturnValue({ keyAgentsByChain });
      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            getBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });
      expect(switchNetwork).toBeDefined();
      await expect(switchNetwork(chainId)).rejects.toThrow(new Error('Wallet data for chosen chain not found'));
    });
    test('shoud throw in case the wallet data for chosen chain is empty', async () => {
      const chainId = 'Preprod' as any;
      const keyAgentsByChain = { Preprod: { keyAgentData: null } as any };

      jest.spyOn(getWallet, 'getWalletFromStorage').mockReturnValue({ name: 'name' });

      const getBackgroundStorage = jest.fn().mockReturnValue({ keyAgentsByChain });
      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            getBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });
      expect(switchNetwork).toBeDefined();
      await expect(switchNetwork(chainId)).rejects.toThrow(new Error('Wallet data for chosen chain is empty'));
    });
    test('shoud swithc key agents, update app settings, save data to LS and set current chain', async () => {
      const chainName = 'Preprod' as any;
      const keyAgentsByChain = { Preprod: { keyAgentData: 'keyAgentData' } as any };
      const walletName = 'name';
      const walletManagerUi = 'walletManagerUi';
      const setKeyAgentData = jest.fn();
      const setCardanoCoin = jest.fn();
      const setCurrentChain = jest.fn();

      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletManagerUi,
        setCardanoCoin,
        setKeyAgentData,
        setCurrentChain,
        setCardanoWallet: () => {},
        setAddressesDiscoveryCompleted: () => {}
      }));

      jest.spyOn(getWallet, 'getWalletFromStorage').mockReturnValue({ name: walletName });

      const getBackgroundStorage = jest.fn().mockReturnValue({ keyAgentsByChain });

      const restoreWalletFromKeyAgentMockedResult = { asyncKeyAgent: 'asyncKeyAgent' };
      const restoreWalletFromKeyAgentMocked = jest.fn().mockReturnValue(restoreWalletFromKeyAgentMockedResult);
      mockRestoreWalletFromKeyAgent.mockImplementation(restoreWalletFromKeyAgentMocked);

      const switchKeyAgentsMocked = jest.fn();
      mockSwitchKeyAgents.mockImplementation(switchKeyAgentsMocked);

      const updateLocalStorage = jest.fn();
      jest.spyOn(AppSettings, 'useAppSettingsContext').mockReturnValue([{}, updateLocalStorage]);

      const saveValueInLocalStorage = jest.fn();
      jest.spyOn(localStorage, 'saveValueInLocalStorage').mockImplementation(saveValueInLocalStorage);

      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            getBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });
      expect(switchNetwork).toBeDefined();
      await switchNetwork(chainName);
      expect(restoreWalletFromKeyAgentMocked).toBeCalledWith(
        walletManagerUi,
        walletName,
        keyAgentsByChain.Preprod.keyAgentData,
        expect.any(Function),
        chainName,
        false
      );
      expect(switchKeyAgentsMocked).toBeCalledWith(
        walletManagerUi,
        walletName,
        restoreWalletFromKeyAgentMockedResult.asyncKeyAgent,
        chainName
      );
      expect(updateLocalStorage).toBeCalledWith({ chainName });
      expect(saveValueInLocalStorage.mock.calls[0]).toEqual([{ key: 'wallet', value: { name: walletName } }]);
      expect(saveValueInLocalStorage.mock.calls[1]).toEqual([
        { key: 'keyAgentData', value: keyAgentsByChain.Preprod.keyAgentData }
      ]);

      expect(setCurrentChain).toBeCalledWith(chainName);
      expect(setCardanoCoin).toBeCalledWith({ networkId: 0, networkMagic: 1 });
      expect(setKeyAgentData).toBeCalledWith(keyAgentsByChain.Preprod.keyAgentData);
    });
    test('sets the cardano wallet data', async () => {
      const setCardanoWallet = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletManagerUi: 'walletManagerUi',
        setCardanoCoin: () => {},
        setKeyAgentData: () => {},
        setCurrentChain: () => {},
        setAddressesDiscoveryCompleted: () => {},
        setCardanoWallet
      }));
      const getBackgroundStorage = jest.fn().mockReturnValue({
        keyAgentsByChain: { Preprod: { keyAgentData: 'keyAgentData' } as any }
      });
      jest.spyOn(getWallet, 'getWalletFromStorage').mockReturnValue({ name: 'walletName' });
      mockRestoreWalletFromKeyAgent.mockImplementation(() => ({
        asyncKeyAgent: 'asyncKeyAgent',
        keyAgent: 'keyAgent',
        wallet: 'wallet'
      }));

      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            getBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });

      await switchNetwork('Preprod');

      expect(setCardanoWallet).toBeCalledWith({
        asyncKeyAgent: 'asyncKeyAgent',
        keyAgent: 'keyAgent',
        name: 'walletName',
        wallet: 'wallet'
      });
    });
    test('sets the discovery completeness flag', async () => {
      const setAddressesDiscoveryCompleted = jest.fn();
      jest.spyOn(stores, 'useWalletStore').mockImplementation(() => ({
        walletManagerUi: 'walletManagerUi',
        setCardanoCoin: () => {},
        setKeyAgentData: () => {},
        setCurrentChain: () => {},
        setCardanoWallet: () => {},
        setAddressesDiscoveryCompleted
      }));
      const getBackgroundStorage = jest.fn().mockReturnValue({
        keyAgentsByChain: { Preprod: { keyAgentData: 'keyAgentData' } as any }
      });
      jest.spyOn(getWallet, 'getWalletFromStorage').mockReturnValue({ name: 'walletName' });
      mockRestoreWalletFromKeyAgent.mockImplementation(async () => ({
        asyncKeyAgent: 'asyncKeyAgent',
        keyAgent: 'keyAgent',
        wallet: 'wallet'
      }));

      const {
        result: {
          current: { switchNetwork }
        }
      } = renderHook(() => useWalletManager(), {
        wrapper: getWrapper({
          backgroundService: {
            getBackgroundStorage
          } as unknown as BackgroundServiceAPIProviderProps['value']
        })
      });

      await switchNetwork('Preprod');

      expect(setAddressesDiscoveryCompleted).toBeCalledWith(false);
    });
  });
});
