import { storage } from 'webextension-polyfill';

import { MIGRATE_V1_PERSIST_KEY } from './persist-keys';

/**
 * Pure read of migration state from extension storage. Has no side effects.
 *
 * not-required: no V1 data present, app boots normally.
 * fresh: V1 data present, no prior migration state, run from scratch.
 * resume-pending: V1 data present and migrateV1 persist state shows the user
 *   is mid-flow (pending or activating). The in-memory app password is gone
 *   after a service worker restart, so the caller must call
 *   restartV1Migration before preparing preloaded state.
 * completed: migration finished previously, app boots normally.
 */
export type V1MigrationState =
  | 'completed'
  | 'fresh'
  | 'not-required'
  | 'resume-pending';

export const getV1MigrationState = async (): Promise<V1MigrationState> => {
  const data = (await storage.local.get([
    'walletRepository',
    MIGRATE_V1_PERSIST_KEY,
  ])) as {
    walletRepository?: unknown;
    [MIGRATE_V1_PERSIST_KEY]?: string;
  };

  if (data.walletRepository === undefined) return 'not-required';

  const persistedRaw = data[MIGRATE_V1_PERSIST_KEY];
  if (!persistedRaw) return 'fresh';

  try {
    const persisted = JSON.parse(persistedRaw) as {
      passwordMigration?: string;
    };
    if (typeof persisted.passwordMigration === 'string') {
      const passwordMigration = JSON.parse(persisted.passwordMigration) as {
        status?: string;
      };
      if (
        passwordMigration.status === 'pending' ||
        passwordMigration.status === 'activating'
      ) {
        return 'resume-pending';
      }
    }
  } catch {
    return 'completed';
  }

  return 'completed';
};
