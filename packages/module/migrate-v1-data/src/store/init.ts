import { initializeSideEffects } from './side-effects';
import { migrateV1Reducers } from './slice';
import { restartV1Migration } from './v1-data/extension-storage';
import { getV1MigrationState } from './v1-data/is-migration-required';
import { preparePreloadedState } from './v1-data/prepare-preloaded-state';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => {
  const migrationState = await getV1MigrationState();

  if (migrationState === 'not-required' || migrationState === 'completed') {
    return {
      reducers: migrateV1Reducers,
      sideEffects: await initializeSideEffects(props, dependencies),
      persistConfig: {
        migrateV1: {
          version: 2,
          whitelist: ['passwordMigration'],
        },
      },
    };
  }

  if (migrationState === 'resume-pending') {
    await restartV1Migration();
  }

  const { state: preloadedState } = await preparePreloadedState();

  return {
    reducers: migrateV1Reducers,
    preloadedState,
    sideEffects: await initializeSideEffects(props, dependencies),
    persistConfig: {
      migrateV1: {
        version: 2,
        whitelist: ['passwordMigration'],
      },
    },
  };
};

export default redux;
