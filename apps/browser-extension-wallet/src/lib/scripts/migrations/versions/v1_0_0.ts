/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
import isEqual from 'lodash/isEqual';
import { InvalidMigrationData } from '../errors';
import { Migration } from '../migrations';
import { getItemFromLocalStorage, removeItemFromLocalStorage, setItemInLocalStorage } from '../util';
import { getBackgroundStorage } from '@lib/scripts/background/storage';

const MIGRATION_VERSION = '1.0.0';
const throwInvalidDataError = (reason?: string) => {
  throw new InvalidMigrationData(MIGRATION_VERSION, reason);
};

export const v_1_0_0: Migration = {
  version: MIGRATION_VERSION,
  // No password required for this migration
  upgrade: async () => {
    // Get all information needed for the migration from storage
    const oldAppSettings = getItemFromLocalStorage<any>('appSettings');
    const oldKeyAgentData = getItemFromLocalStorage<any>('keyAgentData');
    const backgroundStorage = (await getBackgroundStorage()) as unknown as {
      keyAgentsByChain?: { Mainnet?: { keyAgentData: any } };
    };
    const mainnetKeyAgentData = backgroundStorage?.keyAgentsByChain?.Mainnet?.keyAgentData;

    return {
      prepare: () => {
        // Save temporary storage. Revert if something fails
        try {
          console.info('Saving temporary migration for', MIGRATION_VERSION);

          if (oldKeyAgentData && !mainnetKeyAgentData) {
            // If there is an active key agent data, it means that we have an unlocked wallet, regardless of lock
            //   (having a lock or not indicates whether that wallet is a hw wallet or not)
            // But if for some reason we couldn't retrieve or there is no mainnet key agent in keyAgentsByChain
            // it may mean that some data was already missing or corrupted
            // it'd better to just leave things as they are, fail the migration, retry and eventually trigger a data reset if it keeps failing
            throw new Error(`Failing ${MIGRATION_VERSION} migration as the mainnet data needed is not present`);
          }
          if (oldAppSettings) {
            setItemInLocalStorage('appSettings_tmp', { ...oldAppSettings, chainName: 'Mainnet' });
          }
          // If we have a key agent and the mainnet key agent, we can make the migration to the new key agent
          if (oldKeyAgentData && mainnetKeyAgentData) {
            setItemInLocalStorage('keyAgentData_tmp', mainnetKeyAgentData);
          }
          // Having no key agent data stored means we have a locked wallet or no wallet at all, depending if lock exists or not
          // In these cases we don't need to do anything,
          //   if it's locked changing the appSettings should be enough for the wallet to be restored in mainnet on unlock
        } catch (error) {
          console.info(`Error saving temporary migrations for ${MIGRATION_VERSION}, deleting...`, error);
          removeItemFromLocalStorage('keyAgentData_tmp');
          removeItemFromLocalStorage('appSettings_tmp');
          throw error;
        }
      },
      assert: () => {
        const tmpAppSettings = getItemFromLocalStorage<any>('appSettings_tmp');
        const tmpKeyAgentData = getItemFromLocalStorage<any>('keyAgentData_tmp');

        if (tmpAppSettings && tmpAppSettings.chainName !== 'Mainnet') {
          throwInvalidDataError('Chain name in app settings is not Mainnet');
        }
        if (tmpKeyAgentData && !isEqual(tmpKeyAgentData, backgroundStorage?.keyAgentsByChain?.Mainnet?.keyAgentData)) {
          throwInvalidDataError('Key agent data does not match Mainnet key agent');
        }
        return true;
      },
      persist: () => {
        console.info(`Persisting migrated data for ${MIGRATION_VERSION} upgrade`);
        // Get temporary storage
        const tmpAppSettings = getItemFromLocalStorage('appSettings_tmp');
        const tmpKeyAgentData = getItemFromLocalStorage('keyAgentData_tmp');
        // Replace actual storage
        if (tmpAppSettings) setItemInLocalStorage('appSettings', tmpAppSettings);
        if (tmpKeyAgentData) setItemInLocalStorage('keyAgentData', tmpKeyAgentData);
        // Delete temporary storage
        removeItemFromLocalStorage('appSettings_tmp');
        removeItemFromLocalStorage('keyAgentData_tmp');
      },
      rollback: () => {
        console.info(`Rollback migrated data for ${MIGRATION_VERSION} upgrade`);
        // Restore actual storage to their original values
        if (oldAppSettings) setItemInLocalStorage('appSettings', oldAppSettings);
        if (oldKeyAgentData) setItemInLocalStorage('keyAgentData', oldKeyAgentData);
        // Delete any temporary storage that may have been created
        removeItemFromLocalStorage('appSettings_tmp');
        removeItemFromLocalStorage('keyAgentData_tmp');
      }
    };
  }
};
