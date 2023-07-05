/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/no-null */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
/* eslint-disable camelcase */
import { Wallet } from '@lace/cardano';
import { PromiseResolvedType } from '@src/types';
import { mockKeyAgentDataTestnet, mockKeyAgentsByChain, mockWalletInfoTestnet } from '@src/utils/mocks/test-helpers';
import { storage } from 'webextension-polyfill';
import { InvalidMigrationData } from '../../errors';
import { MigrationPersistance } from '../../migrations';
import { v0_6_0 } from '../../versions';

const encryptData = async (data: any, password: string) =>
  Wallet.KeyManagement.emip3encrypt(Buffer.from(JSON.stringify(data)), Buffer.from(password));

interface OldWalletInfo {
  keyAgentData?: any;
  name?: string;
  address?: any;
  rewardAccount?: any;
  walletId?: string;
}
interface OldAppSettings {
  chainId?: string;
  mnemonicVerificationFrequency?: string;
  lastMnemonicVerification?: string;
}
interface OldStorage {
  walletPassword?: string;
  walletName?: string;
  keyAgentType?: Wallet.KeyManagement.KeyAgentType;
  appSettings?: OldAppSettings;
  walletInfoData?: OldWalletInfo;
  lock?: false | Uint8Array | null;
}

const mockInitialStorage = async ({
  walletPassword = 'pass',
  walletName = 'test wallet',
  appSettings = { chainId: 'Preprod' },
  keyAgentType = Wallet.KeyManagement.KeyAgentType.InMemory,
  walletInfoData = {
    keyAgentData: { ...mockKeyAgentDataTestnet, __typename: keyAgentType },
    name: walletName,
    address: mockWalletInfoTestnet.addresses[0].address,
    rewardAccount: mockWalletInfoTestnet.addresses[0].rewardAccount,
    walletId: 'abcdef1234567890'
  },
  lock
}: OldStorage = {}): Promise<OldStorage> => {
  const oldLock = !lock && lock !== null ? await encryptData(walletInfoData, walletPassword) : null;
  localStorage.setItem('wallet', JSON.stringify(walletInfoData));
  localStorage.setItem('appSettings', JSON.stringify(appSettings));
  localStorage.setItem('lock', JSON.stringify(oldLock));
  const name = walletInfoData.name ?? walletName;
  await storage.local.set({ BACKGROUND_STORAGE: { walletName: name } });
  const agentType = walletInfoData.keyAgentData.__typename ?? keyAgentType;
  return { walletPassword, walletInfoData, lock: oldLock, walletName: name, appSettings, keyAgentType: agentType };
};

const mockTmpStorage = async (initialStorage: OldStorage) => {
  let newLock = null;
  const newAppSettings = JSON.stringify({
    chainName: initialStorage.appSettings.chainId,
    lastMnemonicVerification: initialStorage.appSettings.lastMnemonicVerification,
    mnemonicVerificationFrequency: initialStorage.appSettings.mnemonicVerificationFrequency
  });
  const newWalletInfo = JSON.stringify({ name: initialStorage.walletName });
  const newKeyAgentData = JSON.stringify(initialStorage.walletInfoData.keyAgentData);
  const newKeyAgentsByChain = { BACKGROUND_STORAGE: { keyAgentsByChain_tmp: mockKeyAgentsByChain } };
  localStorage.setItem('appSettings_tmp', newAppSettings);
  localStorage.setItem('wallet_tmp', newWalletInfo);
  localStorage.setItem('keyAgentData_tmp', newKeyAgentData);
  if (initialStorage.lock) {
    newLock = JSON.stringify(await encryptData(mockKeyAgentsByChain, initialStorage.walletPassword));
    localStorage.setItem('lock_tmp', newLock);
  }
  await storage.local.set(newKeyAgentsByChain);
  return { newAppSettings, newWalletInfo, newKeyAgentData, newLock, newKeyAgentsByChain };
};

type TmpStorage = PromiseResolvedType<typeof mockTmpStorage>;

describe('v0.6.0 migration', () => {
  let localStorageSetSpy: jest.SpyInstance;
  let localStorageRemoveSpy: jest.SpyInstance;

  beforeAll(() => {
    localStorageSetSpy = jest.spyOn(Storage.prototype, 'setItem');
    localStorageRemoveSpy = jest.spyOn(Storage.prototype, 'removeItem');
  });

  beforeEach(async () => {
    localStorage.clear();
    await storage.local.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('requirePassword', () => {
    test('is true if lock is in storage ', () => {
      localStorage.setItem('lock', JSON.stringify(Buffer.from('asd')));
      expect(v0_6_0.requiresPassword()).toBe(true);
    });
    test('is false if there is no lock in storage ', () => {
      expect(v0_6_0.requiresPassword()).toBe(false);
    });
  });
  describe('upgrade', () => {
    describe('when no wallet exists', () => {
      let migrationPersistance: MigrationPersistance;
      beforeAll(async () => {
        migrationPersistance = await v0_6_0.upgrade();
      });
      describe('prepare', () => {
        test('does not save any information', async () => {
          await migrationPersistance.prepare();
          expect(localStorageSetSpy).not.toHaveBeenCalled();
          expect(storage.local.set as jest.Mock).not.toHaveBeenCalled();
        });
      });
      describe('assert', () => {
        test('throws an error when there is temporary wallet data', async () => {
          localStorage.setItem('keyAgentData_tmp', JSON.stringify(mockKeyAgentDataTestnet));
          await expect(migrationPersistance.assert()).rejects.toThrow(
            new InvalidMigrationData('0.6.0', 'Wallet data should not exist')
          );
        });
        test('resolves to true if there is no temporary data', async () => {
          await expect(migrationPersistance.assert()).resolves.toBe(true);
        });
      });
      describe('persist', () => {
        test('does not save any information but still try to clear tmp keys', async () => {
          await migrationPersistance.persist();
          expect(localStorageSetSpy).not.toHaveBeenCalled();
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(4);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('wallet_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('lock_tmp');
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(2);
        });
      });
      describe('rollback', () => {
        test('does not save any information but still try to clear tmp and new keys', async () => {
          await migrationPersistance.rollback();
          expect(localStorageSetSpy).not.toHaveBeenCalled();
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(5);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('wallet_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('lock_tmp');
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(2);
        });
      });
    });
    describe('when an InMemory wallet exists and is not locked', () => {
      let migrationPersistance: MigrationPersistance;
      let initialStorage: OldStorage;
      beforeAll(async () => {
        initialStorage = await mockInitialStorage();
        migrationPersistance = await v0_6_0.upgrade(initialStorage.walletPassword);
      });
      describe('prepare', () => {
        test('saves temporary storage with the updated information', async () => {
          await migrationPersistance.prepare();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(4);
          assertCalledWithArg(localStorageSetSpy, 'wallet_tmp', 0);
          assertCalledWithArg(localStorageSetSpy, 'appSettings_tmp', 0);
          assertCalledWithArg(localStorageSetSpy, 'keyAgentData_tmp', 0);
          assertCalledWithArg(localStorageSetSpy, 'lock_tmp', 0);
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(1);
        });
      });
      describe('assert', () => {
        beforeEach(async () => {
          await mockTmpStorage(initialStorage);
          jest.clearAllMocks();
        });
        test('resolves to true if all temporary data is valid', async () => {
          await expect(migrationPersistance.assert()).resolves.toBe(true);
        });
        test('throws an error when there is no chainName in appSettings_tmp', async () => {
          localStorage.setItem('appSettings_tmp', JSON.stringify({ chainId: 'Preprod' }));
          await expect(migrationPersistance.assert()).rejects.toThrow(
            new InvalidMigrationData('0.6.0', 'Missing chain name in app settings')
          );
        });
        test('throws an error when keyAgentData_tmp is missing', async () => {
          localStorage.removeItem('keyAgentData_tmp');
          await expect(migrationPersistance.assert()).rejects.toThrow(
            new InvalidMigrationData('0.6.0', 'Wallet data missing')
          );
        });
        test('throws an error when wallet_tmp is missing', async () => {
          localStorage.removeItem('wallet_tmp');
          await expect(migrationPersistance.assert()).rejects.toThrow(
            new InvalidMigrationData('0.6.0', 'Wallet data missing')
          );
        });
        test('throws an error when keyAgentsByChain_tmp is missing', async () => {
          await storage.local.set({ BACKGROUND_STORAGE: {} });
          await expect(migrationPersistance.assert()).rejects.toThrow(
            new InvalidMigrationData('0.6.0', 'Wallet data missing')
          );
        });
        test('throws an error when there is no name in wallet_tmp', async () => {
          localStorage.setItem('wallet_tmp', JSON.stringify({}));
          await expect(migrationPersistance.assert()).rejects.toThrow(
            new InvalidMigrationData('0.6.0', 'Missing name in wallet info')
          );
        });
        test('throws an error when keyAgentData_tmp is missing a field', async () => {
          const keyAgentData_tmp = { ...mockKeyAgentDataTestnet };
          delete keyAgentData_tmp.__typename;
          localStorage.setItem('keyAgentData_tmp', JSON.stringify(keyAgentData_tmp));
          await expect(migrationPersistance.assert()).rejects.toThrow(
            new InvalidMigrationData('0.6.0', 'Missing field in key agent data')
          );
        });
        test('throws an error when keyAgentDataByChain_tmp is missing a chain', async () => {
          await storage.local.set({
            BACKGROUND_STORAGE: { keyAgentsByChain_tmp: { Preprod: mockKeyAgentDataTestnet } }
          });
          await expect(migrationPersistance.assert()).rejects.toThrow(
            new InvalidMigrationData('0.6.0', 'Missing key agent for one or more chains')
          );
        });
        test('throws an error when decrypted lock_tmp is not the same as keyAgentsByChain_tmp', async () => {
          const wrongLock = await encryptData(mockWalletInfoTestnet, initialStorage.walletPassword);
          localStorage.setItem('lock_tmp', JSON.stringify(wrongLock));
          await expect(migrationPersistance.assert()).rejects.toThrow(
            new InvalidMigrationData('0.6.0', 'Decrypted lock is not valid')
          );
        });
      });
      describe('persist', () => {
        let tmpStorage: TmpStorage;
        beforeEach(async () => {
          tmpStorage = await mockTmpStorage(initialStorage);
          jest.clearAllMocks();
        });
        test('saves all temporary information as permanent before clearing it', async () => {
          await migrationPersistance.persist();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(4);
          expect(localStorageSetSpy).toHaveBeenCalledWith('appSettings', tmpStorage.newAppSettings);
          expect(localStorageSetSpy).toHaveBeenCalledWith('wallet', tmpStorage.newWalletInfo);
          expect(localStorageSetSpy).toHaveBeenCalledWith('keyAgentData', tmpStorage.newKeyAgentData);
          expect(localStorageSetSpy).toHaveBeenCalledWith('lock', tmpStorage.newLock);
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(4);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('wallet_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('lock_tmp');
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(3);
        });
      });
      describe('rollback', () => {
        beforeEach(async () => {
          await mockTmpStorage(initialStorage);
          jest.clearAllMocks();
        });
        test('restores the original stored data and clears the temporary storage', async () => {
          await migrationPersistance.rollback();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(3);
          expect(localStorageSetSpy).toHaveBeenCalledWith('appSettings', JSON.stringify(initialStorage.appSettings));
          expect(localStorageSetSpy).toHaveBeenCalledWith('wallet', JSON.stringify(initialStorage.walletInfoData));
          expect(localStorageSetSpy).toHaveBeenCalledWith('lock', JSON.stringify(initialStorage.lock));
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(5);
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData');
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('wallet_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('lock_tmp');
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(3);
        });
      });
    });
    describe('when an InMemory wallet exists but it is locked', () => {
      let migrationPersistance: MigrationPersistance;
      let initialStorage: OldStorage;
      beforeAll(async () => {
        initialStorage = await mockInitialStorage({
          walletInfoData: {
            keyAgentData: mockKeyAgentDataTestnet,
            address: mockWalletInfoTestnet.addresses[0].address,
            rewardAccount: mockWalletInfoTestnet.addresses[0].rewardAccount,
            walletId: 'abcdef1234567890'
          }
        });
        storage.local.remove('wallet');
        migrationPersistance = await v0_6_0.upgrade(initialStorage.walletPassword);
      });
      describe('prepare', () => {
        test('saves wallet_tmp and keyAgentData_tmp with decrypted lock and name in background storage', async () => {
          await migrationPersistance.prepare();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(4);
          expect(localStorageSetSpy).toHaveBeenCalledWith(
            'wallet_tmp',
            JSON.stringify({ name: initialStorage.walletName })
          );
          expect(localStorageSetSpy).toHaveBeenCalledWith(
            'keyAgentData_tmp',
            JSON.stringify(initialStorage.walletInfoData.keyAgentData)
          );
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(1);
        });
      });
      describe('assert', () => {
        beforeEach(async () => {
          await mockTmpStorage(initialStorage);
          jest.clearAllMocks();
        });
        test('resolves to true if all temporary data is valid', async () => {
          await expect(migrationPersistance.assert()).resolves.toBe(true);
        });
      });
      describe('persist', () => {
        beforeEach(async () => {
          await mockTmpStorage(initialStorage);
          jest.clearAllMocks();
        });
        test('saves all temporary information as permanent before clearing it', async () => {
          await migrationPersistance.persist();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(4);
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(4);
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(3);
        });
      });
      describe('rollback', () => {
        beforeEach(async () => {
          await mockTmpStorage(initialStorage);
          jest.clearAllMocks();
        });
        test('restores the original stored data and clears the temporary storage', async () => {
          await migrationPersistance.rollback();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(3);
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(5);
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(3);
        });
      });
    });
    describe('when a hardware wallet exists', () => {
      let migrationPersistance: MigrationPersistance;
      let initialStorage: OldStorage;
      beforeAll(async () => {
        initialStorage = await mockInitialStorage({
          lock: null,
          keyAgentType: Wallet.KeyManagement.KeyAgentType.Ledger
        });
        migrationPersistance = await v0_6_0.upgrade(initialStorage.walletPassword);
      });
      describe('prepare', () => {
        test('saves temporary storage with the updated information', async () => {
          await migrationPersistance.prepare();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(3);
          assertCalledWithArg(localStorageSetSpy, 'wallet_tmp', 0);
          assertCalledWithArg(localStorageSetSpy, 'appSettings_tmp', 0);
          assertCalledWithArg(localStorageSetSpy, 'keyAgentData_tmp', 0);
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(1);
        });
      });
      describe('assert', () => {
        beforeEach(async () => {
          await mockTmpStorage(initialStorage);
          jest.clearAllMocks();
        });
        test('resolves to true if all temporary data is valid', async () => {
          await expect(migrationPersistance.assert()).resolves.toBe(true);
        });
      });
      describe('persist', () => {
        let tmpStorage: TmpStorage;
        beforeEach(async () => {
          tmpStorage = await mockTmpStorage(initialStorage);
          jest.clearAllMocks();
        });
        test('saves all temporary information as permanent before clearing it', async () => {
          await migrationPersistance.persist();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(3);
          expect(localStorageSetSpy).toHaveBeenCalledWith('appSettings', tmpStorage.newAppSettings);
          expect(localStorageSetSpy).toHaveBeenCalledWith('wallet', tmpStorage.newWalletInfo);
          expect(localStorageSetSpy).toHaveBeenCalledWith('keyAgentData', tmpStorage.newKeyAgentData);
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(4);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('wallet_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('lock_tmp');
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(3);
        });
      });
      describe('rollback', () => {
        beforeEach(async () => {
          await mockTmpStorage(initialStorage);
          jest.clearAllMocks();
        });
        test('restores the original stored data and clears the temporary storage', async () => {
          await migrationPersistance.rollback();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(2);
          expect(localStorageSetSpy).toHaveBeenCalledWith('appSettings', JSON.stringify(initialStorage.appSettings));
          expect(localStorageSetSpy).toHaveBeenCalledWith('wallet', JSON.stringify(initialStorage.walletInfoData));
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(5);
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData');
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('wallet_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('lock_tmp');
          expect(storage.local.set as jest.Mock).toHaveBeenCalledTimes(3);
        });
      });
    });
  });
});
