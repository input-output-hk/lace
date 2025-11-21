/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable no-magic-numbers */
/* eslint-disable camelcase */
import { PromiseResolvedType } from '@src/types';
import { mockKeyAgentDataTestnet, mockKeyAgentsByChain } from '@src/utils/mocks/test-helpers';
import { storage } from 'webextension-polyfill';
import { InvalidMigrationData } from '../../errors';
import { MigrationPersistance } from '../../migrations';
import { v_1_0_0 } from '../../versions';

const mockInitialStorage = async () => {
  const keyAgentData = mockKeyAgentDataTestnet;
  const appSettings = { lastMnemonicVerification: '', chainName: 'Preprod' };
  const keyAgentsByChain = mockKeyAgentsByChain;
  localStorage.setItem('keyAgentData', JSON.stringify(keyAgentData));
  localStorage.setItem('appSettings', JSON.stringify(appSettings));
  await storage.local.set({ BACKGROUND_STORAGE: { keyAgentsByChain } });
  return { keyAgentData, appSettings, keyAgentsByChain };
};

describe('v1.0.0 migration', () => {
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

  describe('upgrade', () => {
    describe('when there is no wallet and no app settings', () => {
      let migrationPersistance: MigrationPersistance;
      beforeAll(async () => {
        migrationPersistance = await v_1_0_0.upgrade();
      });
      describe('prepare', () => {
        test('does not save any temporary data', () => {
          migrationPersistance.prepare();
          expect(localStorageSetSpy).not.toHaveBeenCalled();
          expect(storage.local.set as jest.Mock).not.toHaveBeenCalled();
        });
      });
      describe('assert', () => {
        test('returns true when there is no temporary data', () => {
          expect(migrationPersistance.assert()).toBe(true);
        });
      });
      describe('persist', () => {
        test('does not update any information but still tries to clear temporary keys', () => {
          migrationPersistance.persist();
          expect(localStorageSetSpy).not.toHaveBeenCalled();
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(2);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
        });
      });
      describe('rollback', () => {
        test('does not save any information but still tries to clear temporary keys', () => {
          migrationPersistance.rollback();
          expect(localStorageSetSpy).not.toHaveBeenCalled();
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(2);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
        });
      });
    });
    describe('when there is a locked wallet and app settings', () => {
      let migrationPersistance: MigrationPersistance;
      beforeAll(async () => {
        localStorage.setItem('appSettings', JSON.stringify({ lastMnemonicVerification: '', chainName: 'Preprod' }));
        migrationPersistance = await v_1_0_0.upgrade();
      });
      describe('prepare', () => {
        test('saves temporary appSettings with mainnet as chain', () => {
          migrationPersistance.prepare();
          expect(localStorageSetSpy).toHaveBeenCalledWith(
            'appSettings_tmp',
            JSON.stringify({ lastMnemonicVerification: '', chainName: 'Mainnet' })
          );
        });
      });
      describe('assert', () => {
        test('returns true when chainName in temporary appSettings is Mainnet', () => {
          localStorage.setItem('appSettings_tmp', JSON.stringify({ chainName: 'Mainnet' }));
          expect(migrationPersistance.assert()).toBe(true);
        });
        test('throws an error when chainName in temporary appSettings is not Mainnet', () => {
          localStorage.setItem('appSettings_tmp', JSON.stringify({ chainName: 'Preprod' }));
          expect(migrationPersistance.assert).toThrow(
            new InvalidMigrationData('1.0.0', 'Chain name in app settings is not Mainnet')
          );
        });
      });
      describe('persist', () => {
        test('updates appSettings and clears temporary data', () => {
          localStorage.setItem('appSettings_tmp', JSON.stringify({ chainName: 'Mainnet' }));
          localStorageSetSpy.mockClear();
          migrationPersistance.persist();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(1);
          expect(localStorageSetSpy).toHaveBeenCalledWith('appSettings', JSON.stringify({ chainName: 'Mainnet' }));
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(2);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
        });
      });
      describe('rollback', () => {
        test('restores the original stored data and clears the temporary data', () => {
          localStorage.setItem('appSettings_tmp', JSON.stringify({ chainName: 'Mainnet' }));
          localStorageSetSpy.mockClear();
          migrationPersistance.rollback();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(1);
          expect(localStorageSetSpy).toHaveBeenCalledWith(
            'appSettings',
            JSON.stringify({ lastMnemonicVerification: '', chainName: 'Preprod' })
          );
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(2);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
        });
      });
    });
    describe('when there is a wallet and is not locked', () => {
      let migrationPersistance: MigrationPersistance;
      let initialStorage: PromiseResolvedType<typeof mockInitialStorage>;
      beforeAll(async () => {
        initialStorage = await mockInitialStorage();
        migrationPersistance = await v_1_0_0.upgrade();
      });
      describe('prepare', () => {
        test('saves temporary storage with the updated key agent and app settings', () => {
          migrationPersistance.prepare();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(2);
          expect(localStorageSetSpy).toHaveBeenCalledWith(
            'appSettings_tmp',
            JSON.stringify({ ...initialStorage.appSettings, chainName: 'Mainnet' })
          );
          expect(localStorageSetSpy).toHaveBeenCalledWith(
            'keyAgentData_tmp',
            JSON.stringify(initialStorage.keyAgentsByChain.Mainnet.keyAgentData)
          );
        });
        test('throws an error and clears any temporary storage when there is no key agent for mainnet', async () => {
          await mockInitialStorage();
          await storage.local.set({
            BACKGROUND_STORAGE: {
              keyAgentsByChain: { Preprod: mockKeyAgentsByChain.Preprod, Preview: mockKeyAgentsByChain.Preview }
            }
          });
          const { prepare } = await v_1_0_0.upgrade();
          expect(prepare).toThrow(new Error('Failing 1.0.0 migration as the mainnet data needed is not present'));
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(2);
        });
      });
      describe('assert', () => {
        test('returns true if all temporary data is valid', () => {
          expect(migrationPersistance.assert()).toBe(true);
        });
        test('throws an error when chainName in temporary appSettings is not Mainnet', () => {
          localStorage.setItem('appSettings_tmp', JSON.stringify({ chainName: 'Preprod' }));
          expect(migrationPersistance.assert).toThrow(
            new InvalidMigrationData('1.0.0', 'Chain name in app settings is not Mainnet')
          );
        });
        test('throws an error when keyAgentData_tmp does not match mainnet key agent', () => {
          localStorage.setItem('keyAgentData_tmp', JSON.stringify(initialStorage.keyAgentsByChain.Preprod));
          expect(migrationPersistance.assert).toThrow(
            new InvalidMigrationData('1.0.0', 'Key agent data does not match Mainnet key agent')
          );
        });
      });
      describe('persist', () => {
        beforeEach(() => {
          localStorage.setItem('appSettings_tmp', JSON.stringify({ chainName: 'Mainnet' }));
          localStorage.setItem(
            'keyAgentData_tmp',
            JSON.stringify(initialStorage.keyAgentsByChain.Mainnet.keyAgentData)
          );
          jest.clearAllMocks();
        });
        test('saves all temporary information as permanent before clearing it', () => {
          migrationPersistance.persist();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(2);
          expect(localStorageSetSpy).toHaveBeenCalledWith('appSettings', JSON.stringify({ chainName: 'Mainnet' }));
          expect(localStorageSetSpy).toHaveBeenCalledWith(
            'keyAgentData',
            JSON.stringify(initialStorage.keyAgentsByChain.Mainnet.keyAgentData)
          );
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(2);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
        });
      });
      describe('rollback', () => {
        beforeEach(() => {
          localStorage.setItem('appSettings_tmp', JSON.stringify({ chainName: 'Mainnet' }));
          localStorage.setItem(
            'keyAgentData_tmp',
            JSON.stringify(initialStorage.keyAgentsByChain.Mainnet.keyAgentData)
          );
          jest.clearAllMocks();
        });
        test('restores the original stored data and clears the temporary storage', () => {
          migrationPersistance.rollback();
          expect(localStorageSetSpy).toHaveBeenCalledTimes(2);
          expect(localStorageSetSpy).toHaveBeenCalledWith('appSettings', JSON.stringify(initialStorage.appSettings));
          expect(localStorageSetSpy).toHaveBeenCalledWith('keyAgentData', JSON.stringify(initialStorage.keyAgentData));
          expect(localStorageRemoveSpy).toHaveBeenCalledTimes(2);
          expect(localStorageRemoveSpy).toBeCalledWith('appSettings_tmp');
          expect(localStorageRemoveSpy).toBeCalledWith('keyAgentData_tmp');
        });
      });
    });
  });
});
