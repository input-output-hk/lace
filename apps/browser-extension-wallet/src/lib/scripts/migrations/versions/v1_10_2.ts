/* eslint-disable camelcase, @typescript-eslint/no-empty-function, no-console */
import { getItemFromLocalStorage, removeItemFromLocalStorage } from '../util';
import { Migration } from '../migrations';

const MIGRATION_VERSION = '1.10.2';

export const v_1_10_2: Migration = {
  version: MIGRATION_VERSION,
  upgrade: async () => ({
    prepare: () => {
      try {
        /**
         * Between the v1.9.0 and v1.10.0 releases, the 'stakingBrowserPreferences'
         * localStorage was updated, and contained a change in spelling, removing this
         * object allows it to be saved again and any issues related to spelling
         * are mitigated
         *  */
        removeItemFromLocalStorage('stakingBrowserPreferences');
      } catch (error) {
        console.log(`error executing migration ${MIGRATION_VERSION}: ${error}`);
        throw error;
      }
    },
    assert: () => {
      const stakingBrowserPreferences = getItemFromLocalStorage('stakingBrowserPreferences');
      return !!stakingBrowserPreferences;
    },
    persist: () => {},
    rollback: () => {}
  })
};
